import { BranchesPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppBranchesRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "appUser"
  | "user"
  | "branches"
  | "setBranches"
  | "activeBranchId"
  | "pharmacySettings"
  | "appLogo"
  | "orgSubscriptionTier"
  | "branchTransfers"
  | "refreshBranchTransfers"
  | "handleBranchTransferComplete"
  | "switchBranch"
  | "getPharmacyId"
  | "resolveBranchLabel"
  | "addActivityLog"
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppBranchesRoute({
  displayPage,
  canOpenPage,
  subscriptionBlocksWrite,
  refreshBranchTransfers,
  handleBranchTransferComplete,
  switchBranch,
  addActivityLog,
  ...props
}: AppBranchesRouteProps) {
  if (!canOpenPage("branches")) return null;

  return (
    <BranchesPage
      {...props}
      subscriptionBlocksWrite={subscriptionBlocksWrite}
      onRefreshBranchTransfers={refreshBranchTransfers}
      onTransferComplete={() => Promise.resolve(handleBranchTransferComplete())}
      onSwitchBranch={switchBranch}
      onActivityLog={addActivityLog}
    />
  );
}
