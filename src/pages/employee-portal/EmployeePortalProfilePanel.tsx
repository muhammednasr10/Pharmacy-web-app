import * as pharmacyService from "../../services/pharmacyService";
import SecureAttendanceScanner from "../../components/attendance/SecureAttendanceScanner";
import {
  formatAttendanceMethodLabel,
  getAttendanceCheckInMethod,
  getAttendanceCheckOutMethod,
} from "../../utils/attendanceMethod";
import { formatMonthTitle } from "../../utils/employeePortalCalendar";
import {
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
} from "../../utils/workSchedule";
import { formatTime, requestTypeLabel, statusLabel } from "./helpers";
import type { EmployeePortalPageState } from "./useEmployeePortalState";

type Props = { state: EmployeePortalPageState };

export default function EmployeePortalProfilePanel({ state }: Props) {
  const {
    isArabic,
    staff,
    branchGeofenceReady,
    busy,
    todayRecord,
    todayIso,
    todayTiming,
    todayEarlyLeaveBadge,
    monthPlanDays,
    monthBounds,
    schedule,
    graceMinutes,
    approvedPermissions,
    requests,
    monthRecords,
    showAttendanceLog,
    loadAll,
    handleCheckIn,
    handleCheckOut,
  } = state;

  if (!staff || !schedule) return null;

  const workDaysCount = monthPlanDays.filter((day) => day.isWorkDay).length;
  const attendedCount = monthPlanDays.filter((day) => day.attendance?.checkIn).length;

  return (
    <>
      <div className="employeeProfileSummaryGrid">
        <div className="employeeProfileSummaryCard">
          <span>{isArabic ? "أيام العمل" : "Work days"}</span>
          <strong>{workDaysCount}</strong>
        </div>
        <div className="employeeProfileSummaryCard">
          <span>{isArabic ? "أيام حضور" : "Days attended"}</span>
          <strong>{attendedCount}</strong>
        </div>
        <div className="employeeProfileSummaryCard">
          <span>{isArabic ? "طلباتي" : "My requests"}</span>
          <strong>{requests.length}</strong>
        </div>
      </div>

      <div className="employeePortalToday cardInner employeeProfileTodayCard">
        <div className="employeeProfileSectionHead">
          <h3>{isArabic ? "اليوم" : "Today"}</h3>
          <span className="employeeProfileTodayDate">{todayIso}</span>
        </div>
        <div className="employeePortalTodayGrid">
          <div>
            <span className="employeePortalLabel">{isArabic ? "الحالة" : "Status"}</span>
            <strong>
              {todayRecord
                ? statusLabel(todayRecord.status, isArabic)
                : statusLabel("", isArabic)}
            </strong>
            {todayTiming?.isLate && (
              <span className="hrAttendanceFlag hrAttendanceFlagLate">
                {isArabic ? "تأخير" : "Late"}
              </span>
            )}
            {todayEarlyLeaveBadge === "permission" && (
              <span className="hrAttendanceFlag hrAttendanceFlagPermission">
                {isArabic ? "إذن" : "Permission"}
              </span>
            )}
            {todayEarlyLeaveBadge === "deduction" && (
              <span className="hrAttendanceFlag hrAttendanceFlagDeduction">
                {isArabic ? "خصم" : "Deduction"}
              </span>
            )}
          </div>
          <div>
            <span className="employeePortalLabel">{isArabic ? "حضور" : "Check in"}</span>
            <strong>{formatTime(todayRecord?.checkIn, isArabic)}</strong>
          </div>
          <div>
            <span className="employeePortalLabel">{isArabic ? "انصراف" : "Check out"}</span>
            <strong>{formatTime(todayRecord?.checkOut, isArabic)}</strong>
          </div>
        </div>

        <div className="employeePortalActions">
          {!branchGeofenceReady && (
            <p className="employeePortalSecureHint">
              {isArabic
                ? "لتفعيل «حضور بصمة» اطلب من المدير ضبط إحداثيات الفرع من الإعدادات."
                : "For fingerprint attendance, ask admin to set branch GPS in Settings."}
            </p>
          )}

          {!todayRecord?.checkIn && (
            <div className="employeePortalActionGroup">
              {branchGeofenceReady && (
                <SecureAttendanceScanner
                  isArabic={isArabic}
                  action="check_in"
                  disabled={!!busy}
                  onSuccess={() => void loadAll()}
                />
              )}
              <button
                type="button"
                className="printFullBtn employeePortalManualBtn"
                disabled={!!busy}
                onClick={() => void handleCheckIn()}
              >
                {isArabic ? "تسجيل حضور" : "Check in"}
              </button>
            </div>
          )}

          {todayRecord?.checkIn && !todayRecord?.checkOut && (
            <div className="employeePortalActionGroup">
              {branchGeofenceReady && (
                <SecureAttendanceScanner
                  isArabic={isArabic}
                  action="check_out"
                  disabled={!!busy}
                  onSuccess={() => void loadAll()}
                />
              )}
              <button
                type="button"
                className="completeBtn employeePortalManualBtn"
                disabled={!!busy}
                onClick={() => void handleCheckOut()}
              >
                {isArabic ? "تسجيل انصراف" : "Check out"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="employeePortalSection cardInner">
        <div className="employeeProfileSectionHead">
          <h3>{isArabic ? "جدول عمل الشهر" : "Monthly work plan"}</h3>
          <span className="employeeProfileMonthTitle">
            {formatMonthTitle(monthBounds.start, isArabic)}
          </span>
        </div>
        <div className="tableWrap">
          <table className="dataTable compactTable employeeProfileMonthTable">
            <thead>
              <tr>
                <th>{isArabic ? "اليوم" : "Day"}</th>
                <th>{isArabic ? "التاريخ" : "Date"}</th>
                <th>{isArabic ? "الشيفت" : "Shift"}</th>
                <th>{isArabic ? "التوقيت" : "Hours"}</th>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "الحضور" : "Attendance"}</th>
              </tr>
            </thead>
            <tbody>
              {monthPlanDays.map((day) => (
                <tr
                  key={day.date}
                  className={[
                    day.isToday ? "employeeProfileTodayRow" : "",
                    day.dayKind === "off" ? "employeeProfileOffRow" : "",
                    day.dayKind === "leave" ? "employeeProfileLeaveRow" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td>{day.weekdayLabel}</td>
                  <td>{day.date}</td>
                  <td>{day.isWorkDay ? day.shiftLabel : "—"}</td>
                  <td>{day.isWorkDay ? day.shiftWindow : "—"}</td>
                  <td>
                    <span className={`employeeProfileDayTag employeeProfileDayTag--${day.dayKind}`}>
                      {day.dayKind === "work"
                        ? isArabic
                          ? "عمل"
                          : "Work"
                        : day.dayKind === "leave"
                          ? isArabic
                            ? "إجازة"
                            : "Leave"
                          : isArabic
                            ? "راحة"
                            : "Off"}
                    </span>
                  </td>
                  <td>
                    {day.attendance?.checkIn
                      ? `${formatTime(day.attendance.checkIn, isArabic)} → ${formatTime(day.attendance.checkOut, isArabic)}`
                      : day.isWorkDay
                        ? isArabic
                          ? "لم يسجل"
                          : "Not recorded"
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAttendanceLog && (
        <div className="employeePortalSection cardInner">
          <h3>{isArabic ? "سجل الحضور والانصراف" : "Attendance log"}</h3>
          {monthRecords.length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد سجلات هذا الشهر" : "No records this month"}</p>
          ) : (
            <div className="tableWrap">
              <table className="dataTable compactTable">
                <thead>
                  <tr>
                    <th>{isArabic ? "التاريخ" : "Date"}</th>
                    <th>{isArabic ? "حضور" : "In"}</th>
                    <th>{isArabic ? "انصراف" : "Out"}</th>
                    <th>{isArabic ? "طريقة التسجيل" : "Method"}</th>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRecords
                    .slice()
                    .sort((a, b) => b.workDate.localeCompare(a.workDate))
                    .map((record) => {
                      const approvedEarlyLeave = isEarlyLeaveApproved(
                        record.earlyLeaveOutcome,
                        pharmacyService.hasApprovedPermissionForDate(
                          approvedPermissions,
                          staff.attendanceKey,
                          staff.employeeId,
                          record.workDate,
                        ),
                      );
                      const timing = evaluateAttendanceTiming(
                        record.workDate,
                        record.checkIn,
                        record.checkOut,
                        schedule,
                        graceMinutes,
                        { approvedEarlyLeave },
                      );
                      const rawEarlyLeave = evaluateAttendanceTiming(
                        record.workDate,
                        record.checkIn,
                        record.checkOut,
                        schedule,
                        graceMinutes,
                        { approvedEarlyLeave: false },
                      ).isEarlyLeave;
                      const earlyLeaveBadge = rawEarlyLeave
                        ? resolveEarlyLeaveOutcome(record.earlyLeaveOutcome)
                        : null;
                      const checkInMethod = getAttendanceCheckInMethod(record);
                      const checkOutMethod = getAttendanceCheckOutMethod(record);
                      return (
                        <tr key={record.id || record.workDate}>
                          <td>{record.workDate}</td>
                          <td>{formatTime(record.checkIn, isArabic)}</td>
                          <td>{formatTime(record.checkOut, isArabic)}</td>
                          <td>
                            <div className="attendanceMethodCell">
                              {checkInMethod && (
                                <span
                                  className={`attendanceMethodBadge ${checkInMethod === "secure" ? "secure" : "manual"}`}
                                >
                                  {isArabic ? "حضور" : "In"}:{" "}
                                  {formatAttendanceMethodLabel(checkInMethod, isArabic)}
                                </span>
                              )}
                              {checkOutMethod && (
                                <span
                                  className={`attendanceMethodBadge ${checkOutMethod === "secure" ? "secure" : "manual"}`}
                                >
                                  {isArabic ? "انصراف" : "Out"}:{" "}
                                  {formatAttendanceMethodLabel(checkOutMethod, isArabic)}
                                </span>
                              )}
                              {!checkInMethod && !checkOutMethod ? "—" : null}
                            </div>
                          </td>
                          <td>
                            {statusLabel(record.status, isArabic)}
                            {timing.isLate && (
                              <span className="hrAttendanceFlag hrAttendanceFlagLate">
                                {isArabic ? "تأخير" : "Late"}
                              </span>
                            )}
                            {earlyLeaveBadge === "permission" && (
                              <span className="hrAttendanceFlag hrAttendanceFlagPermission">
                                {isArabic ? "إذن" : "Permission"}
                              </span>
                            )}
                            {earlyLeaveBadge === "deduction" && (
                              <span className="hrAttendanceFlag hrAttendanceFlagDeduction">
                                {isArabic ? "خصم" : "Deduction"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="employeePortalSection cardInner">
        <h3>{isArabic ? "طلباتي" : "My requests"}</h3>
        {requests.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد طلبات" : "No requests"}</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable compactTable">
              <thead>
                <tr>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td>{requestTypeLabel(req.requestType, isArabic)}</td>
                    <td>
                      {req.requestType === "leave" &&
                      req.endDate &&
                      req.endDate !== req.workDate
                        ? `${req.workDate} → ${req.endDate}`
                        : req.workDate}
                    </td>
                    <td>
                      {req.requestType === "permission" && req.requestedTime
                        ? `${isArabic ? "انصراف" : "Leave at"} ${req.requestedTime}`
                        : req.reason || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${req.status === "pending" ? "warn" : req.status === "approved" ? "ok" : "danger"}`}
                      >
                        {statusLabel(req.status, isArabic)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
