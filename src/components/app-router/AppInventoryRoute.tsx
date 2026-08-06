import { useLocation } from "react-router-dom";
import { InventoryPage } from "../../pages/lazyPages";
import * as pharmacyService from "../../services/pharmacyService";
import { canTransferStockWithTier } from "../../utils/subscriptionFeatures";
import type { AppPageRouterProps } from "./types";

export type AppInventoryRouteProps = Pick<
  AppPageRouterProps,
  | "canOpenPage"
  | "appUser"
  | "activeBranchId"
  | "orgSubscriptionTier"
  | "switchBranch"
  | "setBranches"
  | "refreshMedicinesFromDb"
  | "medicines"
  | "branches"
  | "newMedicine"
  | "editingMedicineId"
  | "isArabic"
  | "t"
  | "isViewingAllBranches"
  | "resolveBranchLabel"
  | "transferUpgradeNotice"
  | "openSubscriptionSettings"
  | "handleBranchTransferComplete"
  | "printBranchTransferRecords"
  | "handleApplyStockCount"
  | "canUsePurchases"
  | "isSubscriptionExpired"
  | "setActivePage"
  | "user"
  | "setNewMedicine"
  | "saveMedicine"
  | "cancelEditMedicine"
  | "openAddMedicineForm"
  | "exportInventoryCSV"
  | "canManageInventory"
  | "canDeleteMedicine"
  | "canViewInventoryCostProfit"
  | "startEditMedicine"
  | "deleteMedicine"
  | "getPharmacyId"
  | "lowStockThreshold"
  | "expiringSoonDays"
  | "pharmacySettings"
  | "stockMovements"
  | "activityLogs"
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppInventoryRoute({
  canOpenPage,
  appUser,
  activeBranchId,
  orgSubscriptionTier,
  switchBranch,
  setBranches,
  refreshMedicinesFromDb,
  medicines,
  branches,
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  isViewingAllBranches,
  resolveBranchLabel,
  transferUpgradeNotice,
  openSubscriptionSettings,
  handleBranchTransferComplete,
  printBranchTransferRecords,
  handleApplyStockCount,
  canUsePurchases,
  isSubscriptionExpired,
  setActivePage,
  user,
  setNewMedicine,
  saveMedicine,
  cancelEditMedicine,
  openAddMedicineForm,
  exportInventoryCSV,
  canManageInventory,
  canDeleteMedicine,
  canViewInventoryCostProfit,
  startEditMedicine,
  deleteMedicine,
  getPharmacyId,
  lowStockThreshold,
  expiringSoonDays,
  pharmacySettings,
  stockMovements,
  activityLogs,
  subscriptionBlocksWrite,
}: AppInventoryRouteProps) {
  const location = useLocation();
  const initialTab = location.pathname.includes("/movements") ? "movements" : "stock";

  if (!canOpenPage("inventory") && !canOpenPage("stockMovements")) return null;

  return (
    <InventoryPage
      initialTab={initialTab}
      appUser={appUser}
      activeBranchId={activeBranchId}
      orgSubscriptionTier={orgSubscriptionTier}
      onSwitchBranch={switchBranch}
      onBranchesUpdated={async () => {
        setBranches(await pharmacyService.getPharmacies());
        await refreshMedicinesFromDb();
      }}
      medicines={medicines}
      branches={branches}
      newMedicine={newMedicine}
      editingMedicineId={editingMedicineId}
      isArabic={isArabic}
      t={t}
      currency={t.currency}
      showBranchColumn={isViewingAllBranches}
      getBranchLabel={resolveBranchLabel}
      canTransferStock={canTransferStockWithTier(appUser, orgSubscriptionTier, branches.length)}
      transferUpgradeNotice={transferUpgradeNotice}
      onOpenSubscriptionSettings={openSubscriptionSettings}
      onTransferComplete={handleBranchTransferComplete}
      onPrintTransfer={printBranchTransferRecords}
      onApplyStockCount={(session) => Promise.resolve(handleApplyStockCount(session))}
      onOpenPurchasesWithReorder={
        canUsePurchases() && !subscriptionBlocksWrite
          ? () => setActivePage("purchases")
          : undefined
      }
      userId={user?.uid}
      userName={appUser?.name}
      onFormChange={setNewMedicine}
      onSave={saveMedicine}
      onCancel={cancelEditMedicine}
      onOpenAdd={openAddMedicineForm}
      disabled={subscriptionBlocksWrite}
      exportInventoryCSV={exportInventoryCSV}
      isSubscriptionExpired={isSubscriptionExpired}
      canManageInventory={canManageInventory() && !subscriptionBlocksWrite}
      canDeleteMedicine={canDeleteMedicine() && !subscriptionBlocksWrite}
      canViewInventoryCostProfit={canViewInventoryCostProfit}
      onEditMedicine={startEditMedicine}
      onDeleteMedicine={deleteMedicine}
      pharmacyId={getPharmacyId()}
      onReloadMedicines={refreshMedicinesFromDb}
      lowStockThreshold={lowStockThreshold}
      expiringSoonDays={expiringSoonDays}
      branchAwareAlerts={isViewingAllBranches}
      fallbackSettings={pharmacySettings}
      stockMovementsCount={stockMovements.length}
      stockCountLogCount={activityLogs.filter((log) => log.type === "stock_count").length}
      dataRefreshKey={stockMovements.length + medicines.length + activityLogs.length}
    />
  );
}
