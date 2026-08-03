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
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppEmployeesRoute({
  displayPage,
  canOpenPage,
  subscriptionBlocksWrite,
  ...props
}: AppEmployeesRouteProps) {
  if (displayPage !== "users" || !canOpenPage("users")) return null;

  return <EmployeesUsersPage {...props} subscriptionBlocksWrite={subscriptionBlocksWrite} />;
}
