import { useMemo } from "react";
import type { HrPageState } from "../useHrPageState";
import { filterEmployeesBySearch } from "./attendanceDerived";
import HrAttendanceEmployeeCard from "./HrAttendanceEmployeeCard";

type Props = { state: HrPageState };

export default function HrAttendanceEmployeeCards({ state }: Props) {
  const {
    isArabic,
    loading,
    todayIso,
    attendanceRecords,
    filteredAttendanceEmployees,
    attendanceEmployeeSearch,
    setAttendanceEmployeeSearch,
    showOrgHr,
    resolveBranchLabel,
  } = state;

  const cards = useMemo(
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

  return (
    <div className="hrAttendanceCardsSection">
      <div className="hrAttendanceCardsToolbar">
        <div>
          <h3>{isArabic ? "موظفو الحضور" : "Attendance staff"}</h3>
          <p className="pageHint">
            {isArabic
              ? "سجّل الحضور والانصراف من أزرار الكارت، أو افتح السجل الشهري"
              : "Use the card buttons to check in or out, or open the monthly log"}
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
          {cards.map((emp) => (
            <HrAttendanceEmployeeCard
              key={emp.employeeId}
              emp={emp}
              todayRecord={todayByAttendanceKey.get(emp.attendanceKey)}
              state={state}
            />
          ))}
        </div>
      )}
    </div>
  );
}
