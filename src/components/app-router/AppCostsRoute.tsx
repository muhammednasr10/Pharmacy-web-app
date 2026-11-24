import CostsPage from "../../pages/CostsPage";
import type { AppPageRouterProps } from "./types";

export type AppCostsRouteProps = Pick<
  AppPageRouterProps,
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "getPharmacyId"
  | "appUser"
  | "user"
  | "pharmacyCosts"
  | "invoices"
  | "canManageCosts"
  | "isSubscriptionExpired"
  | "addActivityLog"
  | "safeNumber"
  | "downloadCSV"
  | "refreshPharmacyCostsFromDb"
>;

export default function AppCostsRoute({
  canOpenPage,
  isArabic,
  t,
  getPharmacyId,
  appUser,
  user,
  pharmacyCosts,
  invoices,
  canManageCosts,
  isSubscriptionExpired,
  addActivityLog,
  safeNumber,
  downloadCSV,
  refreshPharmacyCostsFromDb,
}: AppCostsRouteProps) {
  if (!canOpenPage("costs")) {
    return null;
  }

  return (
    <CostsPage
      costs={pharmacyCosts}
      invoices={invoices}
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
