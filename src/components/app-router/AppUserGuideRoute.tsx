import { UserGuidePage } from "../../pages/lazyPages";
import type { SettingsTab } from "../../pages/SettingsPage";
import type { AppPageRouterProps } from "./types";

export type AppUserGuideRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "allowedPages"
  | "totalMedicinesCount"
  | "totalInvoicesCount"
  | "todayInvoicesCount"
  | "activeCashierShift"
  | "pharmacySettings"
  | "getPharmacyId"
  | "setActivePage"
  | "setInventoryStatusFilter"
  | "setQuery"
  | "setSettingsInitialTab"
  | "refreshMedicinesFromDb"
>;

export default function AppUserGuideRoute({
  canOpenPage,
  isArabic,
  allowedPages,
  totalMedicinesCount,
  totalInvoicesCount,
  todayInvoicesCount = 0,
  activeCashierShift = null,
  pharmacySettings,
  getPharmacyId,
  setActivePage,
  setInventoryStatusFilter,
  setQuery,
  setSettingsInitialTab,
  refreshMedicinesFromDb,
}: AppUserGuideRouteProps) {
  if (!canOpenPage("userGuide")) return null;

  function openSettingsTab(tab: SettingsTab) {
    setSettingsInitialTab(tab);
    setActivePage("settings");
  }

  return (
    <UserGuidePage
      isArabic={isArabic}
      pharmacyId={getPharmacyId()}
      totalMedicinesCount={totalMedicinesCount}
      hasOpenShift={Boolean(activeCashierShift)}
      hasCompletedSale={todayInvoicesCount > 0 || totalInvoicesCount > 0}
      hasLogo={Boolean(pharmacySettings?.logoBase64?.trim())}
      hasAttendanceLocation={Boolean(
        pharmacySettings?.latitude != null && pharmacySettings?.longitude != null,
      )}
      canAccessInventory={allowedPages.includes("inventory")}
      canAccessPos={allowedPages.includes("pos")}
      canAccessSettings={allowedPages.includes("settings")}
      canAccessUsers={allowedPages.includes("users")}
      canAccessCosts={allowedPages.includes("costs")}
      onOpenInventory={() => {
        setInventoryStatusFilter("all");
        setQuery("");
        setActivePage("inventory");
      }}
      onOpenPOS={() => setActivePage("pos")}
      onOpenSettingsPharmacy={() => openSettingsTab("pharmacy")}
      onOpenSettingsEmployees={() => openSettingsTab("employees")}
      onOpenUsers={() => setActivePage("users")}
      onOpenInvestment={() => setActivePage("costs")}
      onQaStockReady={() => void refreshMedicinesFromDb()}
    />
  );
}
