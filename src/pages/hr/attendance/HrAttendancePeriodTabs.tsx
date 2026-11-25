import type { AttendancePeriodView } from "../types";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

const PERIOD_TABS: { id: AttendancePeriodView; ar: string; en: string }[] = [
  { id: "daily", ar: "يومي", en: "Daily" },
  { id: "monthly", ar: "شهري", en: "Monthly" },
  { id: "yearly", ar: "سنوي", en: "Yearly" },
];

export default function HrAttendancePeriodTabs({ state }: Props) {
  const { isArabic, attendancePeriodView, changeAttendancePeriodView, attendanceEmployeeFilter } =
    state;

  if (attendanceEmployeeFilter) return null;

  return (
    <div
      className="staffBranchFilterChips hrAttendancePeriodTabs"
      role="tablist"
      aria-label={isArabic ? "فترة الحضور" : "Attendance period"}
    >
      {PERIOD_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={attendancePeriodView === tab.id}
          className={`staffBranchFilterChip${attendancePeriodView === tab.id ? " active" : ""}`}
          onClick={() => changeAttendancePeriodView(tab.id)}
        >
          {isArabic ? tab.ar : tab.en}
        </button>
      ))}
    </div>
  );
}
