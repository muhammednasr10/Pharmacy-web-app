import { EmployeesUsersPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppEmployeesRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "appUser"
  | "getPharmacyId"
  | "branches"
  | "employeesPageTenantScope"
  | "user"
  | "addActivityLog"
  | "openSubscriptionSettings"
  | "t"
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppEmployeesRoute({
  displayPage,
  canOpenPage,
  subscriptionBlocksWrite,
  isArabic,
  appUser,
  getPharmacyId,
  branches,
  employeesPageTenantScope,
  user,
  addActivityLog,
  openSubscriptionSettings,
  t,
}: AppEmployeesRouteProps) {
  if (!canOpenPage("users")) return null;

  return (
    <EmployeesUsersPage
      isArabic={isArabic}
      appUser={appUser}
      pharmacyId={getPharmacyId()}
      pharmacies={branches}
      tenantScopePharmacyId={employeesPageTenantScope}
      currency={t.currency}
      currentUid={user?.uid}
      onActivityLog={addActivityLog}
      onOpenSubscriptionSettings={openSubscriptionSettings}
      subscriptionBlocksWrite={subscriptionBlocksWrite}
    />
  );
}
