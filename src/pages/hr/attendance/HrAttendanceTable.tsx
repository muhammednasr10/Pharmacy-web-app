import type { AttendanceStatus, ShiftId } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import AttendanceStatusBadge from "../../../components/hr/AttendanceStatusBadge";
import {
  formatAttendanceMethodLabel,
  getAttendanceCheckInMethod,
  getAttendanceCheckOutMethod,
} from "../../../utils/attendanceMethod";
import {
  attendanceSpansNextDay,
  formatActualHours,
  formatAttendanceDateCell,
  formatTime,
  formatTimeWithOvernight,
  isAttendanceWorkDay,
  isShiftOnlyPresetRecord,
  statusClearsTimes,
} from "../../../utils/hrFormatters";
import {
  evaluateAttendanceTiming,
  getShiftDisplayName,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
  resolveAllowedLateMinutes,
  resolveScheduleForShiftId,
  resolveWorkSchedule,
  SHIFT_IDS,
} from "../../../utils/workSchedule";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceTable({ state }: Props) {
  const {
    isArabic,
    loading,
    busyAction,
    showEmployeeColumn,
    showBranchColumn,
    showAttendanceActions,
    attendanceTableColSpan,
    attendanceTableRows,
    attendanceLogEdit,
    setAttendanceLogEdit,
    employeeRequests,
    payrollConfig,
    todayIso,
    canEditAttendanceLog,
    updateActualShiftOnly,
    setEarlyLeaveOutcome,
    saveAttendanceLogEdit,
    canManageHrFor,
    handleCheckIn,
    handleCheckOut,
    handleSetStatus,
    beginAttendanceLogEdit,
    resolveBranchLabel,
  } = state;

  return (
    <>
      <div className="tableWrap hrAttendanceLogTableWrap">
        <table className="hrAttendanceTable">
          <thead>
            <tr>
              <th className="col-date">{isArabic ? "التاريخ" : "Date"}</th>
              {showEmployeeColumn && (
                <th className="col-name">{isArabic ? "الموظف" : "Employee"}</th>
              )}
              {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
              <th className="col-shift">{isArabic ? "الشيفت المخطط" : "Planned shift"}</th>
              <th className="col-shift col-shift-actual">
                {isArabic ? "الشيفت الفعلي" : "Actual shift"}
              </th>
              <th className="col-status">{isArabic ? "الحالة" : "Status"}</th>
              <th className="col-time">{isArabic ? "حضور" : "Check in"}</th>
              <th className="col-time">{isArabic ? "انصراف" : "Check out"}</th>
              <th className="col-hours">{isArabic ? "ساعات فعلية" : "Actual hours"}</th>
              {showAttendanceActions && (
                <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={attendanceTableColSpan} className="empty">
                  {isArabic ? "جاري التحميل..." : "Loading..."}
                </td>
              </tr>
            ) : attendanceTableRows.length === 0 ? (
              <tr>
                <td colSpan={attendanceTableColSpan} className="empty">
                  {isArabic ? "لا يوجد سجلات" : "No records"}
                </td>
              </tr>
            ) : (
              attendanceTableRows.map(({ emp, workDate, record }) => {
                const isEditing =
                  attendanceLogEdit?.userId === emp.attendanceKey &&
                  attendanceLogEdit?.workDate === workDate;
                const draft = isEditing ? attendanceLogEdit : null;
                const clearsTimes = draft ? statusClearsTimes(draft.status) : false;
                const previewCheckIn =
                  draft && !clearsTimes && draft.checkInTime
                    ? pharmacyService.buildAttendanceCheckInIso(workDate, draft.checkInTime)
                    : record?.checkIn;
                const previewCheckOut =
                  draft && !clearsTimes && draft.checkOutTime
                    ? pharmacyService.buildAttendanceCheckOutIso(
                        workDate,
                        draft.checkInTime,
                        draft.checkOutTime,
                      )
                    : record?.checkOut;
                const overnightPreview =
                  draft &&
                  !clearsTimes &&
                  draft.checkInTime &&
                  draft.checkOutTime &&
                  pharmacyService.isOvernightTimePair(draft.checkInTime, draft.checkOutTime);
                const isToday = workDate === todayIso;
                const dateCell = formatAttendanceDateCell(workDate, isArabic);
                const plannedSchedule = resolveWorkSchedule(
                  emp,
                  payrollConfig.workShifts,
                  payrollConfig.defaultShiftId,
                );
                const actualShiftId =
                  isEditing && draft
                    ? draft.actualShiftId
                    : record?.shiftId || plannedSchedule.shiftId;
                const actualSchedule = resolveScheduleForShiftId(
                  actualShiftId,
                  payrollConfig.workShifts,
                  payrollConfig.defaultShiftId,
                );
                const graceMinutes = resolveAllowedLateMinutes(
                  actualSchedule.shiftId,
                  payrollConfig.workShifts,
                );
                const hasApprovedPermission = pharmacyService.hasApprovedPermissionForDate(
                  employeeRequests,
                  emp.attendanceKey,
                  emp.employeeId,
                  workDate,
                );
                const approvedEarlyLeave = isEarlyLeaveApproved(
                  record?.earlyLeaveOutcome,
                  hasApprovedPermission,
                );
                const rawEarlyLeave = evaluateAttendanceTiming(
                  workDate,
                  previewCheckIn ?? record?.checkIn,
                  previewCheckOut ?? record?.checkOut,
                  actualSchedule,
                  graceMinutes,
                  { approvedEarlyLeave: false },
                ).isEarlyLeave;
                const attendanceTiming = evaluateAttendanceTiming(
                  workDate,
                  previewCheckIn ?? record?.checkIn,
                  previewCheckOut ?? record?.checkOut,
                  actualSchedule,
                  graceMinutes,
                  { approvedEarlyLeave },
                );
                const earlyLeaveBusyKey = `early-${emp.attendanceKey}-${workDate}`;

                return (
                  <tr
                    key={`${emp.attendanceKey}-${workDate}`}
                    className={isToday ? "hrAttendanceRowToday" : undefined}
                  >
                    <td className="col-date">
                      <span className="hrAttendanceDayCompact">
                        <strong>{dateCell.day}</strong> {dateCell.weekday}
                      </span>
                    </td>
                    {showEmployeeColumn && <td className="col-name">{emp.name}</td>}
                    {showBranchColumn && (
                      <td>
                        {resolveBranchLabel
                          ? resolveBranchLabel(emp.pharmacyId)
                          : emp.pharmacyId}
                      </td>
                    )}
                    <td className="col-shift">
                      <span className="hrShiftBadge hrShiftBadgePlanned">
                        {getShiftDisplayName(
                          plannedSchedule.shiftId,
                          payrollConfig.workShifts,
                          isArabic,
                        )}
                      </span>
                      <small className="hrShiftWindow">
                        {plannedSchedule.dayStart}–{plannedSchedule.dayEnd}
                      </small>
                    </td>
                    <td className="col-shift col-shift-actual">
                      {isEditing && draft ? (
                        <select
                          className="tableInput hrAttendanceLogInput hrActualShiftSelect"
                          value={draft.actualShiftId}
                          onChange={(e) =>
                            setAttendanceLogEdit({
                              ...draft,
                              actualShiftId: e.target.value as ShiftId,
                            })
                          }
                        >
                          {SHIFT_IDS.map((shiftId) => (
                            <option key={shiftId} value={shiftId}>
                              {getShiftDisplayName(shiftId, payrollConfig.workShifts, isArabic)}
                            </option>
                          ))}
                        </select>
                      ) : canEditAttendanceLog ? (
                        <select
                          className="tableInput hrActualShiftSelect"
                          value={actualShiftId}
                          disabled={!!busyAction}
                          onChange={(e) =>
                            void updateActualShiftOnly(
                              emp,
                              workDate,
                              record,
                              e.target.value as ShiftId,
                              plannedSchedule.shiftId,
                            )
                          }
                        >
                          {SHIFT_IDS.map((shiftId) => (
                            <option key={shiftId} value={shiftId}>
                              {getShiftDisplayName(shiftId, payrollConfig.workShifts, isArabic)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <span className="hrShiftBadge hrShiftBadgeActual">
                            {getShiftDisplayName(
                              actualSchedule.shiftId,
                              payrollConfig.workShifts,
                              isArabic,
                            )}
                          </span>
                          <small className="hrShiftWindow">
                            {actualSchedule.dayStart}–{actualSchedule.dayEnd}
                          </small>
                        </>
                      )}
                    </td>
                    <td className="col-status">
                      {isEditing && draft ? (
                        <select
                          className="tableInput hrAttendanceLogInput"
                          value={draft.status}
                          onChange={(e) =>
                            setAttendanceLogEdit({
                              ...draft,
                              status: e.target.value as AttendanceStatus | "",
                              checkInTime: statusClearsTimes(
                                e.target.value as AttendanceStatus | "",
                              )
                                ? ""
                                : draft.checkInTime,
                              checkOutTime: statusClearsTimes(
                                e.target.value as AttendanceStatus | "",
                              )
                                ? ""
                                : draft.checkOutTime,
                            })
                          }
                        >
                          <option value="">{isArabic ? "لم يسجل" : "Not recorded"}</option>
                          <option value="present">{isArabic ? "حاضر" : "Present"}</option>
                          <option value="late">
                            {isArabic ? "حضور (تأخير)" : "Present (late)"}
                          </option>
                          <option value="absent">{isArabic ? "غائب" : "Absent"}</option>
                          <option value="leave">{isArabic ? "إجازة" : "Leave"}</option>
                          <option value="sick">{isArabic ? "مرضي" : "Sick leave"}</option>
                        </select>
                      ) : (
                        <AttendanceStatusBadge
                          status={
                            isShiftOnlyPresetRecord(record) ? undefined : record?.status
                          }
                          isArabic={isArabic}
                          timing={
                            isAttendanceWorkDay(record) ? attendanceTiming : undefined
                          }
                          earlyLeave={
                            isAttendanceWorkDay(record) && rawEarlyLeave
                              ? {
                                  rawEarlyLeave: true,
                                  effectiveOutcome: resolveEarlyLeaveOutcome(
                                    record?.earlyLeaveOutcome,
                                  ),
                                  canToggle: canEditAttendanceLog,
                                  resolving: busyAction === earlyLeaveBusyKey,
                                  onToggle: (outcome) => {
                                    if (record) {
                                      void setEarlyLeaveOutcome(
                                        emp,
                                        workDate,
                                        record,
                                        outcome,
                                      );
                                    }
                                  },
                                }
                              : undefined
                          }
                        />
                      )}
                    </td>
                    <td className="col-time">
                      {isEditing && draft ? (
                        <input
                          type="time"
                          className="tableInput hrAttendanceLogInput"
                          value={draft.checkInTime}
                          disabled={clearsTimes}
                          onChange={(e) =>
                            setAttendanceLogEdit({ ...draft, checkInTime: e.target.value })
                          }
                        />
                      ) : (
                        <div className="attendanceMethodCell">
                          <span>{formatTime(record?.checkIn, isArabic)}</span>
                          {record?.checkIn && (
                            <span
                              className={`attendanceMethodBadge ${
                                getAttendanceCheckInMethod(record) === "secure" ? "secure" : "manual"
                              }`}
                            >
                              {formatAttendanceMethodLabel(
                                getAttendanceCheckInMethod(record),
                                isArabic,
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="col-time">
                      {isEditing && draft ? (
                        <div className="hrAttendanceLogTimeCell">
                          <input
                            type="time"
                            className="tableInput hrAttendanceLogInput"
                            value={draft.checkOutTime}
                            disabled={clearsTimes}
                            onChange={(e) =>
                              setAttendanceLogEdit({ ...draft, checkOutTime: e.target.value })
                            }
                          />
                          {overnightPreview && (
                            <small className="hrOvernightHint">
                              {isArabic ? "اليوم التالي" : "Next day"}
                            </small>
                          )}
                        </div>
                      ) : (
                        <div className="attendanceMethodCell">
                          <span>
                            {formatTimeWithOvernight(
                              record?.checkOut,
                              isArabic,
                              attendanceSpansNextDay(record?.checkIn, record?.checkOut),
                            )}
                          </span>
                          {record?.checkOut && (
                            <span
                              className={`attendanceMethodBadge ${
                                getAttendanceCheckOutMethod(record) === "secure"
                                  ? "secure"
                                  : "manual"
                              }`}
                            >
                              {formatAttendanceMethodLabel(
                                getAttendanceCheckOutMethod(record),
                                isArabic,
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="col-hours">
                      {isEditing
                        ? formatActualHours(previewCheckIn, previewCheckOut, isArabic)
                        : formatActualHours(record?.checkIn, record?.checkOut, isArabic)}
                    </td>
                    {showAttendanceActions && (
                      <td className="col-actions">
                        <div className="hrAttendanceActions">
                          {isEditing && draft && canEditAttendanceLog ? (
                            <div className="hrAttendanceActionRow">
                              <button
                                type="button"
                                className="completeBtn smallBtn"
                                disabled={!!busyAction}
                                onClick={() => void saveAttendanceLogEdit()}
                              >
                                {isArabic ? "حفظ" : "Save"}
                              </button>
                              <button
                                type="button"
                                className="editBtn smallBtn"
                                disabled={!!busyAction}
                                onClick={() => setAttendanceLogEdit(null)}
                              >
                                {isArabic ? "إلغاء" : "Cancel"}
                              </button>
                            </div>
                          ) : (
                            <>
                              {canManageHrFor(emp.pharmacyId) && isToday && (
                                <div className="hrAttendanceQuickActions">
                                  <button
                                    type="button"
                                    className="smallBtn"
                                    disabled={!!busyAction || !!attendanceLogEdit}
                                    onClick={() =>
                                      void handleCheckIn(emp.attendanceKey, emp.name, workDate)
                                    }
                                  >
                                    {isArabic ? "حضور" : "In"}
                                  </button>
                                  <button
                                    type="button"
                                    className="smallBtn"
                                    disabled={!!busyAction || !!attendanceLogEdit}
                                    onClick={() =>
                                      void handleCheckOut(emp.attendanceKey, emp.name, workDate)
                                    }
                                  >
                                    {isArabic ? "انصراف" : "Out"}
                                  </button>
                                  <button
                                    type="button"
                                    className="smallBtn dangerBtn"
                                    disabled={!!busyAction || !!attendanceLogEdit}
                                    onClick={() =>
                                      void handleSetStatus(
                                        emp.attendanceKey,
                                        emp.name,
                                        "absent",
                                        workDate,
                                      )
                                    }
                                  >
                                    {isArabic ? "غائب" : "Absent"}
                                  </button>
                                  <button
                                    type="button"
                                    className="smallBtn"
                                    disabled={!!busyAction || !!attendanceLogEdit}
                                    onClick={() =>
                                      void handleSetStatus(
                                        emp.attendanceKey,
                                        emp.name,
                                        "leave",
                                        workDate,
                                      )
                                    }
                                  >
                                    {isArabic ? "إجازة" : "Leave"}
                                  </button>
                                  <button
                                    type="button"
                                    className="smallBtn"
                                    disabled={!!busyAction || !!attendanceLogEdit}
                                    onClick={() =>
                                      void handleSetStatus(
                                        emp.attendanceKey,
                                        emp.name,
                                        "sick",
                                        workDate,
                                      )
                                    }
                                  >
                                    {isArabic ? "مرضي" : "Sick"}
                                  </button>
                                </div>
                              )}
                              {canEditAttendanceLog && (
                                <button
                                  type="button"
                                  className="smallBtn hrAttendanceEditBtn"
                                  disabled={!!busyAction || !!attendanceLogEdit}
                                  onClick={() => beginAttendanceLogEdit(workDate, emp, record)}
                                >
                                  {isArabic ? "تعديل" : "Edit"}
                                </button>
                              )}
                              {!isToday && !canEditAttendanceLog && (
                                <span className="hrAttendanceActionsEmpty">—</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {canEditAttendanceLog && (
        <p className="returnsSectionHint">
          {isArabic
            ? "يمكن للمدير تعديل أي يوم. إذا كان الانصراف قبل الحضور (مثل 11 م → 7 ص)، يُحسب تلقائياً كوردية ليلية."
            : "Admins can edit any day. If check-out is earlier than check-in (e.g. 11 PM → 7 AM), it is treated as an overnight shift."}
        </p>
      )}
    </>
  );
}
