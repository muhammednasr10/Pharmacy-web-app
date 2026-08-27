import { EmployeePhotoThumb } from "../../../components/staff/EmployeePhotoThumb";
import { formatTime } from "../../../utils/hrFormatters";
import { getEmployeeJobRoleLabel } from "../../../utils/roles";
import { getShiftDisplayName } from "../../../utils/workSchedule";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceEmployeeCards({ state }: Props) {
  const {
    isArabic,
    loading,
    busyAction,
    todayIso,
    attendanceRecords,
    filteredAttendanceEmployees,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    setAttendanceEmployeeFilter,
    showOrgHr,
    resolveBranchLabel,
    payrollConfig,
    canManageHrFor,
    showAttendanceActions,
    handleCheckIn,
    handleCheckOut,
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
              ? "سجّل الحضور أو الانصراف من الكارت، أو افتح السجل الشهري للموظف"
              : "Check in or out from the card, or open the monthly attendance log"}
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
              : getShiftDisplayName(emp.assignedShiftId, payrollConfig.workShifts, isArabic);
            const todayRecord = attendanceRecords.find(
              (row) => row.userId === emp.attendanceKey && row.workDate === todayIso,
            );
            const canManageThis = canManageHrFor(emp.pharmacyId);
            const roleLabel = emp.jobTitle
              ? getEmployeeJobRoleLabel(emp.jobTitle, isArabic)
              : "";
            const checkedIn = Boolean(todayRecord?.checkIn);
            const checkedOut = Boolean(todayRecord?.checkOut);
            const inBusy = busyAction === `in-${emp.attendanceKey}`;
            const outBusy = busyAction === `out-${emp.attendanceKey}`;

            return (
              <article key={emp.employeeId} className="hrAttendanceEmployeeCard">
                <div className="hrAttendanceEmployeeCardTop">
                  <EmployeePhotoThumb
                    photoBase64={emp.photoBase64}
                    name={emp.name}
                    variant="form"
                  />
                  <div className="hrAttendanceEmployeeCardBody">
                    <strong>{emp.name}</strong>
                    {roleLabel ? <span>{roleLabel}</span> : null}
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
                </div>

                <div className="hrAttendanceEmployeeCardToday">
                  <span>
                    {isArabic ? "حضور اليوم" : "Today in"}:{" "}
                    <strong>{formatTime(todayRecord?.checkIn, isArabic)}</strong>
                  </span>
                  <span>
                    {isArabic ? "انصراف اليوم" : "Today out"}:{" "}
                    <strong>{formatTime(todayRecord?.checkOut, isArabic)}</strong>
                  </span>
                </div>

                {showAttendanceActions && canManageThis ? (
                  <div className="hrAttendanceEmployeeCardQuick">
                    <button
                      type="button"
                      className="smallBtn completeBtn"
                      disabled={!!busyAction || checkedIn}
                      onClick={() => void handleCheckIn(emp.attendanceKey, emp.name, todayIso)}
                    >
                      {inBusy
                        ? isArabic
                          ? "..."
                          : "..."
                        : isArabic
                          ? "حضور"
                          : "Check in"}
                    </button>
                    <button
                      type="button"
                      className="smallBtn editBtn"
                      disabled={!!busyAction || !checkedIn || checkedOut}
                      onClick={() => void handleCheckOut(emp.attendanceKey, emp.name, todayIso)}
                    >
                      {outBusy
                        ? isArabic
                          ? "..."
                          : "..."
                        : isArabic
                          ? "انصراف"
                          : "Check out"}
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="hrAttendanceEmployeeCardAction"
                  onClick={() => setAttendanceEmployeeFilter(emp.attendanceKey)}
                >
                  {isArabic ? "فتح سجل الحضور ←" : "Open attendance log →"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
