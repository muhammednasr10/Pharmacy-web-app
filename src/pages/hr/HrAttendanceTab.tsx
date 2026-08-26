import HrAttendanceEmployeeCards from "./attendance/HrAttendanceEmployeeCards";
import HrAttendanceFilters from "./attendance/HrAttendanceFilters";
import HrAttendanceScannerPanel from "./attendance/HrAttendanceScannerPanel";
import HrAttendanceTable from "./attendance/HrAttendanceTable";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceTab({ state }: Props) {
  const { activeTab, attendanceEmployeeFilter } = state;

  if (activeTab !== "attendance") return null;

  const detailMode = Boolean(attendanceEmployeeFilter);

  return (
    <div className="settingsTabPanel">
      <HrAttendanceFilters state={state} />
      <HrAttendanceScannerPanel state={state} />
      {detailMode ? (
        <HrAttendanceTable state={state} />
      ) : (
        <HrAttendanceEmployeeCards state={state} />
      )}
    </div>
  );
}
