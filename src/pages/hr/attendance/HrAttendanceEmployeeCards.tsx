import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { getShiftDisplayName } from "../../../utils/workSchedule";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceEmployeeCards({ state }: Props) {
  const {
    isArabic,
    loading,
    filteredAttendanceEmployees,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    setAttendanceEmployeeFilter,
    showOrgHr,
    resolveBranchLabel,
    payrollConfig,
  } = state;

  const query = attendanceEmployeeSearch.trim().toLowerCase();
  const cards = query
    ? filteredAttendanceEmployees.filter((emp) => {
        const haystack = [
          emp.name,
          emp.employeeCode,
          emp.phone,
          emp.jobTitle,
          showOrgHr && resolveBranchLabel ? resolveBranchLabel(emp.pharmacyId) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : filteredAttendanceEmployees;

  return (
    <div className="hrAttendanceCardsSection">
      <div className="hrAttendanceCardsToolbar">
        <div>
          <h3>{isArabic ? "موظفو الحضور" : "Attendance staff"}</h3>
          <p className="pageHint">
            {isArabic
              ? "اضغط على كارت الموظف لفتح سجل الحضور والانصراف الخاص به"
              : "Open an employee card to view their attendance log"}
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

      {loading && cards.length === 0 ? (
        <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : cards.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد موظفون" : "No employees"}</p>
      ) : (
        <div className="hrAttendanceCardsGrid">
          {cards.map((emp) => {
            const shiftLabel = emp.useCustomWorkSchedule
              ? isArabic
                ? "جدول مخصص"
                : "Custom schedule"
              : getShiftDisplayName(
                  emp.assignedShiftId,
                  payrollConfig.workShifts,
                  isArabic,
                );
            return (
              <button
                key={emp.employeeId}
                type="button"
                className="hrAttendanceEmployeeCard"
                onClick={() => setAttendanceEmployeeFilter(emp.attendanceKey)}
              >
                <EmployeePhotoThumb
                  photoBase64={emp.photoBase64}
                  name={emp.name}
                  variant="form"
                />
                <div className="hrAttendanceEmployeeCardBody">
                  <strong>{emp.name}</strong>
                  {emp.jobTitle ? <span>{emp.jobTitle}</span> : null}
                  <span dir="ltr" className="hrAttendanceEmployeeCardMeta">
                    {emp.employeeCode ? <code>{emp.employeeCode}</code> : <code>—</code>}
                    {emp.phone ? ` · ${emp.phone}` : ""}
                  </span>
                  <span className="hrAttendanceEmployeeCardMeta">
                    {shiftLabel}
                    {showOrgHr && resolveBranchLabel
                      ? ` · ${resolveBranchLabel(emp.pharmacyId)}`
                      : ""}
                  </span>
                </div>
                <span className="hrAttendanceEmployeeCardAction">
                  {isArabic ? "فتح السجل ←" : "Open log →"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
