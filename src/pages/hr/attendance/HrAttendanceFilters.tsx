import BranchScopeSelect from "../../../components/BranchScopeSelect";
import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatTotalWorked } from "../../../utils/hrFormatters";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceFilters({ state }: Props) {
  const {
    isArabic,
    attendancePeriodView,
    attendanceMonth,
    setAttendanceMonth,
    attendanceYear,
    setAttendanceYear,
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

  const selectedEmployee = attendanceEmployeeFilter
    ? activeEmployees.find((emp) => emp.attendanceKey === attendanceEmployeeFilter)
    : null;
  const detailMode = Boolean(selectedEmployee);
  const showMonthPicker = detailMode || attendancePeriodView === "monthly";
  const showYearPicker = !detailMode && attendancePeriodView === "yearly";

  return (
    <div className="hrFilters hrAttendanceFilters">
      {detailMode && selectedEmployee ? (
        <div className="hrAttendanceDetailHeader">
          <button
            type="button"
            className="smallBtn"
            onClick={() => setAttendanceEmployeeFilter("")}
          >
            {isArabic ? "→ كل الموظفين" : "← All employees"}
          </button>
          <div className="hrAttendanceDetailIdentity">
            <EmployeePhotoThumb
              photoBase64={selectedEmployee.photoBase64}
              name={selectedEmployee.name}
            />
            <div>
              <strong>{selectedEmployee.name}</strong>
              <span className="saasSub">
                {[
                  selectedEmployee.jobTitle,
                  selectedEmployee.employeeCode,
                  selectedEmployee.phone,
                  showOrgHr && resolveBranchLabel
                    ? resolveBranchLabel(selectedEmployee.pharmacyId)
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="hrFiltersFields">
        {showMonthPicker ? (
          <label>
            {isArabic ? "الشهر" : "Month"}
            <input
              type="month"
              className="tableInput hrMonthInput"
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(e.target.value)}
            />
          </label>
        ) : null}
        {showYearPicker ? (
          <label>
            {isArabic ? "السنة" : "Year"}
            <input
              type="number"
              className="tableInput hrMonthInput"
              min={2000}
              max={2100}
              step={1}
              value={attendanceYear}
              onChange={(e) => setAttendanceYear(e.target.value)}
            />
          </label>
        ) : null}
        {showOrgHr && orgBranchIds.length > 1 && !detailMode && (
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

      {detailMode ? (
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
            <strong>{isArabic ? "عدد الأذونات:" : "Permission count:"}</strong>{" "}
            {attendanceHoursSummary.permissionCount}
          </span>
          <span className="hrAttendanceHoursStat hrAttendanceHoursStatDeduction">
            <strong>
              {isArabic ? "انصراف مبكر (خصم):" : "Early leave (deduction):"}
            </strong>{" "}
            {attendanceHoursSummary.earlyLeaveDeductionCount}
          </span>
        </div>
      ) : null}
    </div>
  );
}
