import HrAttendanceFilters from "./attendance/HrAttendanceFilters";
import HrAttendanceTable from "./attendance/HrAttendanceTable";
import HrAttendanceTodayTable from "./attendance/HrAttendanceTodayTable";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceTab({ state }: Props) {
  const { activeTab, attendanceEmployeeFilter } = state;

  if (activeTab !== "attendance") return null;

  const detailMode = Boolean(attendanceEmployeeFilter);

  return (
    <div className="settingsTabPanel">
      <HrAttendanceFilters state={state} />
      {detailMode ? <HrAttendanceTable state={state} /> : <HrAttendanceTodayTable state={state} />}
    </div>
  );
}
