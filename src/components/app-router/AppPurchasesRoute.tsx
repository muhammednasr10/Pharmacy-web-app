import { PurchasesPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppPurchasesRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "purchases"
  | "branches"
  | "getPharmacyId"
  | "isViewingAllBranches"
  | "isArabic"
  | "t"
  | "canUsePurchases"
  | "canDeletePurchase"
  | "isSubscriptionExpired"
  | "user"
  | "appUser"
  | "addActivityLog"
  | "refreshMedicinesFromDb"
  | "refreshPurchasesFromDb"
  | "medicines"
  | "pharmacySettings"
  | "safeNumber"
  | "barcodeCSV"
  | "downloadCSV"
>;

export default function AppPurchasesRoute({
  displayPage,
  canOpenPage,
  purchases,
  branches,
  getPharmacyId,
  isViewingAllBranches,
  isArabic,
  t,
  canUsePurchases,
  canDeletePurchase,
  isSubscriptionExpired,
  user,
  appUser,
  addActivityLog,
  refreshMedicinesFromDb,
  refreshPurchasesFromDb,
  medicines,
  pharmacySettings,
  safeNumber,
  barcodeCSV,
  downloadCSV,
}: AppPurchasesRouteProps) {
  if (displayPage !== "purchases" || !canOpenPage("purchases")) return null;

  return (
    <PurchasesPage
      purchases={purchases}
      branches={branches}
      defaultBranchId={getPharmacyId()}
      showBranchColumn={isViewingAllBranches}
      isArabic={isArabic}
      t={t}
      currency={t.currency}
      canUsePurchases={canUsePurchases()}
      canDeletePurchase={canDeletePurchase()}
      isSubscriptionExpired={isSubscriptionExpired}
      userId={user?.uid}
      userName={appUser?.name}
      onActivityLog={addActivityLog}
      onRefreshMedicines={refreshMedicinesFromDb}
      onRefreshPurchases={refreshPurchasesFromDb}
      medicines={medicines}
      fallbackSettings={pharmacySettings}
      safeNumber={safeNumber}
      barcodeCSV={barcodeCSV}
      downloadCSV={downloadCSV}
    />
  );
}
