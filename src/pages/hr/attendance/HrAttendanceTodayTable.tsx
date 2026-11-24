import { useMemo } from "react";
import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatTime } from "../../../utils/hrFormatters";
import { getEmployeeJobRoleLabel } from "../../../utils/roles";
import { getShiftDisplayName } from "../../../utils/workSchedule";
import type { HrPageState } from "../useHrPageState";
import { resolveAttendanceCardStatus } from "./attendanceCardStatus";
import { filterEmployeesBySearch } from "./attendanceDerived";

type Props = { state: HrPageState };

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
              <th>{isArabic ? "الموظف" : "Employee"}</th>
              <th>{isArabic ? "الكود" : "Code"}</th>
              {showOrgHr ? <th>{isArabic ? "الفرع" : "Branch"}</th> : null}
              <th>{isArabic ? "الشيفت" : "Shift"}</th>
              <th>{isArabic ? "الحالة" : "Status"}</th>
              <th>{isArabic ? "حضور" : "Check in"}</th>
              <th>{isArabic ? "انصراف" : "Check out"}</th>
              <th>{isArabic ? "إجراءات" : "Actions"}</th>
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
                const shiftLabel = emp.useCustomWorkSchedule
                  ? isArabic
                    ? "جدول مخصص"
                    : "Custom schedule"
                  : getShiftDisplayName(emp.assignedShiftId, payrollConfig.workShifts, isArabic);
                const roleLabel = emp.jobTitle
                  ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic)
                  : "";
                const branchLabel =
                  showOrgHr && resolveBranchLabel ? resolveBranchLabel(emp.pharmacyId) : "";

                return (
                  <tr key={emp.employeeId} className={`hrAttendanceTodayRow is-${status.tone}`}>
                    <td>
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
                    <td dir="ltr">
                      <code>{emp.employeeCode || "—"}</code>
                    </td>
                    {showOrgHr ? <td>{branchLabel || "—"}</td> : null}
                    <td>{shiftLabel}</td>
                    <td>
                      <span
                        className={`hrAttendanceCardStatus hrAttendanceCardStatus--${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>{formatTime(todayRecord?.checkIn, isArabic)}</td>
                    <td>{formatTime(todayRecord?.checkOut, isArabic)}</td>
                    <td>
                      <div className="actionButtons purchaseRowActions">
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
