import HrAttendanceFilters from "./attendance/HrAttendanceFilters";
import HrAttendanceScannerPanel from "./attendance/HrAttendanceScannerPanel";
import HrAttendanceTable from "./attendance/HrAttendanceTable";
import type { HrPageState } from "./useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceTab({ state }: Props) {
  const { activeTab } = state;

  if (activeTab !== "attendance") return null;

  return (
    <div className="settingsTabPanel">
      <HrAttendanceFilters state={state} />
      <HrAttendanceScannerPanel state={state} />
      <HrAttendanceTable state={state} />
    </div>
  );
}
