import { EmployeePortalPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppEmployeePortalRouteProps = Pick<
  AppPageRouterProps,
  "displayPage" | "canOpenPage" | "isArabic" | "appUser" | "getPharmacyId"
>;

export default function AppEmployeePortalRoute({
  displayPage,
  canOpenPage,
  isArabic,
  appUser,
  getPharmacyId,
}: AppEmployeePortalRouteProps) {
  if (displayPage !== "employeePortal" || !canOpenPage("employeePortal")) return null;

  return (
    <EmployeePortalPage isArabic={isArabic} appUser={appUser} pharmacyId={getPharmacyId()} />
  );
}
