import { CostsPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppCostsRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "pharmacyCosts"
  | "isArabic"
  | "t"
  | "getPharmacyId"
  | "canManageCosts"
  | "isSubscriptionExpired"
  | "user"
  | "appUser"
  | "addActivityLog"
  | "safeNumber"
  | "downloadCSV"
  | "refreshPharmacyCostsFromDb"
>;

export default function AppCostsRoute({
  displayPage,
  canOpenPage,
  pharmacyCosts,
  isArabic,
  t,
  getPharmacyId,
  canManageCosts,
  isSubscriptionExpired,
  user,
  appUser,
  addActivityLog,
  safeNumber,
  downloadCSV,
  refreshPharmacyCostsFromDb,
}: AppCostsRouteProps) {
  if (displayPage !== "costs" || !canOpenPage("costs")) return null;

  return (
    <CostsPage
      costs={pharmacyCosts}
      isArabic={isArabic}
      t={t}
      currency={t.currency}
      pharmacyId={getPharmacyId()}
      canManageCosts={canManageCosts()}
      isSubscriptionExpired={isSubscriptionExpired}
      userId={user?.uid}
      userName={appUser?.name}
      onActivityLog={addActivityLog}
      safeNumber={safeNumber}
      downloadCSV={downloadCSV}
      onRefreshCosts={refreshPharmacyCostsFromDb}
    />
  );
}
