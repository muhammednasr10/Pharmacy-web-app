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
>;

export default function AppBranchesRoute({
  displayPage,
  canOpenPage,
  isArabic,
  t,
  appUser,
  user,
  branches,
  setBranches,
  activeBranchId,
  pharmacySettings,
  appLogo,
  orgSubscriptionTier,
  branchTransfers,
  refreshBranchTransfers,
  handleBranchTransferComplete,
  switchBranch,
  getPharmacyId,
  resolveBranchLabel,
  addActivityLog,
}: AppBranchesRouteProps) {
  if (displayPage !== "branches" || !canOpenPage("branches")) return null;

  return (
    <BranchesPage
      isArabic={isArabic}
      t={t}
      appUser={appUser}
      user={user}
      branches={branches}
      setBranches={setBranches}
      activeBranchId={activeBranchId}
      pharmacySettings={pharmacySettings}
      appLogo={appLogo}
      orgSubscriptionTier={orgSubscriptionTier}
      branchTransfers={branchTransfers}
      onRefreshBranchTransfers={refreshBranchTransfers}
      onTransferComplete={handleBranchTransferComplete}
      onSwitchBranch={switchBranch}
      getPharmacyId={getPharmacyId}
      resolveBranchLabel={resolveBranchLabel}
      onActivityLog={addActivityLog}
    />
  );
}
