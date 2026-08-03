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
  ...props
}: AppBranchesRouteProps) {
  if (displayPage !== "branches" || !canOpenPage("branches")) return null;

  return <BranchesPage {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />;
}
