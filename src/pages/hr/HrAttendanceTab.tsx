import HrAttendanceFilters from "./attendance/HrAttendanceFilters";
import HrAttendancePeriodSummaryTable from "./attendance/HrAttendancePeriodSummaryTable";
import HrAttendancePeriodTabs from "./attendance/HrAttendancePeriodTabs";
import HrAttendanceTable from "./attendance/HrAttendanceTable";
import HrAttendanceTodayTable from "./attendance/HrAttendanceTodayTable";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceTab({ state }: Props) {
  const { activeTab, attendanceEmployeeFilter, attendancePeriodView } = state;

  if (activeTab !== "attendance") return null;

  const detailMode = Boolean(attendanceEmployeeFilter);

  return (
    <div className="settingsTabPanel">
      <HrAttendancePeriodTabs state={state} />
      <HrAttendanceFilters state={state} />
      {detailMode ? (
        <HrAttendanceTable state={state} />
      ) : attendancePeriodView === "daily" ? (
        <HrAttendanceTodayTable state={state} />
      ) : (
        <HrAttendancePeriodSummaryTable state={state} />
      )}
    </div>
  );
}
