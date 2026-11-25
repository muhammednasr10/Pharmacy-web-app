import { useMemo } from "react";
import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatTime } from "../../../utils/hrFormatters";
import { getEmployeeJobRoleLabel } from "../../../utils/roles";
import { getShiftDisplayNameWithHours } from "../../../utils/workSchedule";
import type { HrPageState } from "../useHrPageState";
import { resolveAttendanceCardStatus } from "./attendanceCardStatus";
import { filterEmployeesBySearch } from "./attendanceDerived";

type Props = { state: HrPageState };

function formatAttendanceShiftLabel(
  emp: HrPageState["filteredAttendanceEmployees"][number],
  workShifts: HrPageState["payrollConfig"]["workShifts"],
  isArabic: boolean,
) {
  if (emp.useCustomWorkSchedule) {
    const start = emp.workDayStart || "—";
    const end = emp.workDayEnd || "—";
    return isArabic ? `مخصص (${start} - ${end})` : `Custom (${start} - ${end})`;
  }
  return getShiftDisplayNameWithHours(emp.assignedShiftId, workShifts, isArabic);
}

export default function HrAttendanceTodayTable({ state }: Props) {
  const {
    isArabic,
    loading,
    busyAction,
    todayIso,
    attendanceRecords,
    filteredAttendanceEmployees,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    showOrgHr,
    resolveBranchLabel,
    payrollConfig,
    canManageHrFor,
    showAttendanceActions,
    handleCheckIn,
    handleCheckOut,
    setAttendanceEmployeeFilter,
  } = state;

  const rows = useMemo(
    () =>
      filterEmployeesBySearch(filteredAttendanceEmployees, attendanceEmployeeSearch, {
        showOrgHr,
        resolveBranchLabel,
      }),
    [filteredAttendanceEmployees, attendanceEmployeeSearch, showOrgHr, resolveBranchLabel],
  );

  const todayByAttendanceKey = useMemo(() => {
    const map = new Map<string, (typeof attendanceRecords)[number]>();
    for (const row of attendanceRecords) {
      if (row.workDate === todayIso) map.set(row.userId, row);
    }
    return map;
  }, [attendanceRecords, todayIso]);

  const colSpan = 6 + (showOrgHr ? 1 : 0) + (showAttendanceActions ? 1 : 0);

  return (
    <div className="hrAttendanceCardsSection">
      <div className="hrAttendanceCardsToolbar">
        <div>
          <h3>{isArabic ? "حضور وانصراف اليوم" : "Today's attendance"}</h3>
          <p className="pageHint">
            {isArabic
              ? "سجّل الحضور والانصراف من الجدول، أو افتح السجل الشهري للموظف"
              : "Check in/out from the table, or open an employee monthly log"}
          </p>
        </div>
        <label className="hrAttendanceCardsSearch">
          <input
            type="search"
            className="tableInput"
            value={attendanceEmployeeSearch}
            onChange={(e) => setAttendanceEmployeeSearch(e.target.value)}
            placeholder={isArabic ? "بحث بالاسم أو الكود أو الهاتف" : "Search name, code, or phone"}
            aria-label={isArabic ? "بحث عن موظف" : "Search employee"}
          />
        </label>
      </div>

      <div className="tableWrap hrAttendanceTodayTableWrap">
        <table className="hrAttendanceTable hrAttendanceTodayTable">
          <thead>
            <tr>
              <th className="col-code">{isArabic ? "الكود" : "Code"}</th>
              <th className="col-employee">{isArabic ? "الموظف" : "Employee"}</th>
              {showOrgHr ? <th className="col-branch">{isArabic ? "الفرع" : "Branch"}</th> : null}
              <th className="col-shift">{isArabic ? "الشيفت" : "Shift"}</th>
              <th className="col-status">{isArabic ? "الحالة" : "Status"}</th>
              <th className="col-time">{isArabic ? "حضور" : "Check in"}</th>
              <th className="col-time">{isArabic ? "انصراف" : "Check out"}</th>
              <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="empty">
                  {isArabic ? "جاري التحميل..." : "Loading..."}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="empty">
                  {isArabic ? "لا يوجد موظفون" : "No employees"}
                </td>
              </tr>
            ) : (
              rows.map((emp) => {
                const todayRecord = todayByAttendanceKey.get(emp.attendanceKey);
                const checkedIn = Boolean(todayRecord?.checkIn);
                const checkedOut = Boolean(todayRecord?.checkOut);
                const status = resolveAttendanceCardStatus(checkedIn, checkedOut, isArabic);
                const canManageThis = canManageHrFor(emp.pharmacyId);
                const inBusy = busyAction === `in-${emp.attendanceKey}`;
                const outBusy = busyAction === `out-${emp.attendanceKey}`;
                const shiftLabel = formatAttendanceShiftLabel(
                  emp,
                  payrollConfig.workShifts,
                  isArabic,
                );
                const roleLabel = emp.jobTitle
                  ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic)
                  : "";
                const branchLabel =
                  showOrgHr && resolveBranchLabel ? resolveBranchLabel(emp.pharmacyId) : "";

                return (
                  <tr key={emp.employeeId} className={`hrAttendanceTodayRow is-${status.tone}`}>
                    <td className="col-code" dir="ltr">
                      <code>{emp.employeeCode || "—"}</code>
                    </td>
                    <td className="col-employee">
                      <div className="hrAttendanceTodayEmployee">
                        <EmployeePhotoThumb
                          photoBase64={emp.photoBase64}
                          name={emp.name}
                          variant="form"
                        />
                        <div>
                          <strong>{emp.name}</strong>
                          {roleLabel ? <span className="saasSub">{roleLabel}</span> : null}
                        </div>
                      </div>
                    </td>
                    {showOrgHr ? <td className="col-branch">{branchLabel || "—"}</td> : null}
                    <td className="col-shift">{shiftLabel}</td>
                    <td className="col-status">
                      <span
                        className={`hrAttendanceCardStatus hrAttendanceCardStatus--${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="col-time">{formatTime(todayRecord?.checkIn, isArabic)}</td>
                    <td className="col-time">{formatTime(todayRecord?.checkOut, isArabic)}</td>
                    <td className="col-actions">
                      <div className="actionButtons purchaseRowActions hrAttendanceTodayActions">
                        {showAttendanceActions && canManageThis ? (
                          <>
                            <button
                              type="button"
                              className="smallBtn"
                              disabled={!!busyAction || checkedIn}
                              onClick={() =>
                                void handleCheckIn(emp.attendanceKey, emp.name, todayIso)
                              }
                            >
                              {inBusy ? "…" : isArabic ? "حضور" : "In"}
                            </button>
                            <button
                              type="button"
                              className="smallBtn"
                              disabled={!!busyAction || !checkedIn || checkedOut}
                              onClick={() =>
                                void handleCheckOut(emp.attendanceKey, emp.name, todayIso)
                              }
                            >
                              {outBusy ? "…" : isArabic ? "انصراف" : "Out"}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => setAttendanceEmployeeFilter(emp.attendanceKey)}
                        >
                          {isArabic ? "السجل" : "Log"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
