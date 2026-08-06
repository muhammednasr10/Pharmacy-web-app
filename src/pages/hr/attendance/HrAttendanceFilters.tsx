import BranchScopeSelect from "../../../components/BranchScopeSelect";
import { formatTotalWorked } from "../../../utils/hrFormatters";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceFilters({ state }: Props) {
  const {
    isArabic,
    attendanceMonth,
    setAttendanceMonth,
    attendanceEmployeeFilter,
    setAttendanceEmployeeFilter,
    attendanceBranchFilter,
    setAttendanceBranchFilter,
    activeEmployees,
    showOrgHr,
    orgBranchIds,
    orgBranches,
    resolveBranchLabel,
    attendanceHoursSummary,
  } = state;

  return (
    <div className="hrFilters hrAttendanceFilters">
      <div className="hrFiltersFields">
        <label>
          {isArabic ? "الشهر" : "Month"}
          <input
            type="month"
            className="tableInput hrMonthInput"
            value={attendanceMonth}
            onChange={(e) => setAttendanceMonth(e.target.value)}
          />
        </label>
        <label>
          {isArabic ? "الموظف" : "Employee"}
          <select
            className="tableInput"
            value={attendanceEmployeeFilter}
            onChange={(e) => setAttendanceEmployeeFilter(e.target.value)}
          >
            <option value="">{isArabic ? "كل الموظفين" : "All employees"}</option>
            {activeEmployees.map((emp) => (
              <option key={emp.employeeId} value={emp.attendanceKey}>
                {showOrgHr && resolveBranchLabel
                  ? `${emp.name} — ${resolveBranchLabel(emp.pharmacyId)}`
                  : emp.name}
              </option>
            ))}
          </select>
        </label>
        {showOrgHr && orgBranchIds.length > 1 && (
          <label>
            {isArabic ? "الفرع" : "Branch"}
            <BranchScopeSelect
              className="tableInput"
              pharmacies={orgBranches ?? []}
              value={attendanceBranchFilter}
              onChange={setAttendanceBranchFilter}
              isArabic={isArabic}
              includeAllOption={{
                value: "all",
                label: isArabic ? "كل الفروع" : "All branches",
              }}
            />
          </label>
        )}
      </div>
      <div className="hrAttendanceHoursStats">
        <span className="hrAttendanceHoursStat">
          <strong>{isArabic ? "الساعات الأساسية:" : "Regular hours:"}</strong>{" "}
          {formatTotalWorked(attendanceHoursSummary.regularMinutes, isArabic)}
        </span>
        <span className="hrAttendanceHoursStat hrAttendanceHoursStatOvertime">
          <strong>{isArabic ? "الساعات الإضافية:" : "Overtime hours:"}</strong>{" "}
          {formatTotalWorked(attendanceHoursSummary.overtimeMinutes, isArabic)}
        </span>
        <span className="hrAttendanceHoursStat hrAttendanceHoursStatLate">
          <strong>{isArabic ? "عدد التأخيرات:" : "Late count:"}</strong>{" "}
          {attendanceHoursSummary.lateCount}
        </span>
        <span className="hrAttendanceHoursStat hrAttendanceHoursStatPermission">
          <strong>{isArabic ? "عدد الأذونات:" : "Early leave count:"}</strong>{" "}
          {attendanceHoursSummary.permissionCount}
        </span>
        <span className="hrAttendanceHoursStat hrAttendanceHoursStatDeduction">
          <strong>{isArabic ? "خصم انصراف مبكر:" : "Early leave deductions:"}</strong>{" "}
          {attendanceHoursSummary.earlyLeaveDeductionCount}
        </span>
      </div>
    </div>
  );
}
