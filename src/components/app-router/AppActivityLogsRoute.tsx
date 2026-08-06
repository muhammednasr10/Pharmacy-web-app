import { ActivityLogsPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppActivityLogsRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "activityLogs"
  | "branches"
  | "isViewingAllBranches"
  | "resolveBranchLabel"
  | "refreshActivityLogsFromDb"
  | "downloadCSV"
>;

export default function AppActivityLogsRoute({
  displayPage,
  canOpenPage,
  isArabic,
  t,
  activityLogs,
  branches,
  isViewingAllBranches,
  resolveBranchLabel,
  refreshActivityLogsFromDb,
  downloadCSV,
}: AppActivityLogsRouteProps) {
  if (!canOpenPage("activityLogs")) return null;

  return (
    <ActivityLogsPage
      isArabic={isArabic}
      t={t}
      logs={activityLogs}
      branches={branches}
      showBranchFilter={isViewingAllBranches && branches.length > 1}
      showOrgAudit={isViewingAllBranches && branches.length > 1}
      getBranchLabel={resolveBranchLabel}
      onRefresh={refreshActivityLogsFromDb}
      downloadCSV={downloadCSV}
    />
  );
}
