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
  | "settingsForm"
  | "user"
  | "addActivityLog"
  | "openSubscriptionSettings"
>;

export default function AppEmployeesRoute({
  displayPage,
  canOpenPage,
  isArabic,
  appUser,
  getPharmacyId,
  branches,
  employeesPageTenantScope,
  settingsForm,
  user,
  addActivityLog,
  openSubscriptionSettings,
}: AppEmployeesRouteProps) {
  if (displayPage !== "users" || !canOpenPage("users")) return null;

  return (
    <EmployeesUsersPage
      isArabic={isArabic}
      appUser={appUser}
      pharmacyId={getPharmacyId()}
      pharmacies={branches}
      tenantScopePharmacyId={employeesPageTenantScope}
      currency={settingsForm.currency || "ج.م"}
      currentUid={user?.uid}
      onActivityLog={addActivityLog}
      onOpenSubscriptionSettings={openSubscriptionSettings}
    />
  );
}
