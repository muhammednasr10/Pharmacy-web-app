import { useMemo } from "react";
import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatWorkMinutes } from "../../../utils/hrFormatters";
import { getEmployeeJobRoleLabel } from "../../../utils/roles";
import type { HrPageState } from "../useHrPageState";
import { filterEmployeesBySearch } from "./attendanceDerived";

type Props = { state: HrPageState };

export default function HrAttendancePeriodSummaryTable({ state }: Props) {
  const {
    isArabic,
    loading,
    isAttendanceLoading,
    attendancePeriodView,
    attendancePeriodSummaries,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    showOrgHr,
    resolveBranchLabel,
    setAttendanceEmployeeFilter,
  } = state;

  const rows = useMemo(() => {
    const employees = attendancePeriodSummaries.map((row) => row.emp);
    const matched = new Set(
      filterEmployeesBySearch(employees, attendanceEmployeeSearch, {
        showOrgHr,
        resolveBranchLabel,
      }).map((emp) => emp.employeeId),
    );
    return attendancePeriodSummaries.filter((row) => matched.has(row.emp.employeeId));
  }, [
    attendancePeriodSummaries,
    attendanceEmployeeSearch,
    showOrgHr,
    resolveBranchLabel,
  ]);

  const periodLabel =
    attendancePeriodView === "yearly"
      ? isArabic
        ? "ملخص الحضور السنوي"
        : "Yearly attendance summary"
      : isArabic
        ? "ملخص الحضور الشهري"
        : "Monthly attendance summary";

  const colSpan = 8 + (showOrgHr ? 1 : 0);

  return (
    <div className="hrAttendanceCardsSection">
      <div className="hrAttendanceCardsToolbar">
        <div>
          <h3>{periodLabel}</h3>
          <p className="pageHint">
            {isArabic
              ? "اضغط «السجل» لعرض تفاصيل أيام الموظف"
              : "Open Log to view the employee day-by-day details"}
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
        <table className="hrAttendanceTable hrAttendanceTodayTable hrAttendancePeriodSummaryTable">
          <thead>
            <tr>
              <th className="col-code">{isArabic ? "الكود" : "Code"}</th>
              <th className="col-employee">{isArabic ? "الموظف" : "Employee"}</th>
              {showOrgHr ? <th className="col-branch">{isArabic ? "الفرع" : "Branch"}</th> : null}
              <th>{isArabic ? "حضور" : "Present"}</th>
              <th>{isArabic ? "غياب" : "Absent"}</th>
              <th>{isArabic ? "تأخير" : "Late"}</th>
              <th>{isArabic ? "مرضي" : "Sick"}</th>
              <th>{isArabic ? "إجازة" : "Leave"}</th>
              <th>{isArabic ? "ساعات العمل" : "Work hours"}</th>
              <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {isAttendanceLoading || (loading && rows.length === 0) ? (
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
              rows.map(({ emp, presentDays, absentDays, lateDays, sickDays, leaveDays, workMinutes }) => {
                const roleLabel = emp.jobTitle
                  ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic)
                  : "";
                const branchLabel =
                  showOrgHr && resolveBranchLabel ? resolveBranchLabel(emp.pharmacyId) : "";

                return (
                  <tr key={emp.employeeId}>
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
                    <td>{presentDays}</td>
                    <td>{absentDays}</td>
                    <td>{lateDays}</td>
                    <td>{sickDays}</td>
                    <td>{leaveDays}</td>
                    <td>{formatWorkMinutes(workMinutes, isArabic)}</td>
                    <td className="col-actions">
                      <div className="actionButtons purchaseRowActions hrAttendanceTodayActions">
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
