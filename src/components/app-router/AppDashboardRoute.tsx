import { DashboardPage } from "../../pages/lazyPages";
import { requestOpenReorderModal } from "../../utils/reorderSuggestions";
import { isPharmacyManager } from "../../utils/roles";
import type { AppPageRouterProps } from "./types";

export type AppDashboardRouteProps = Pick<
  AppPageRouterProps,
  | "isArabic"
  | "t"
  | "allowedPages"
  | "lowStockCount"
  | "expiredCount"
  | "expiringCount"
  | "totalCustomerRemainingDebt"
  | "totalCustomerPayments"
  | "dashboardSalesTotal"
  | "dashboardInvoicesCount"
  | "dashboardProfitTotal"
  | "totalInvoicesCount"
  | "totalMedicinesCount"
  | "purchases"
  | "returns"
  | "branches"
  | "lowStockMedicines"
  | "expiringSoonMedicines"
  | "expiredMedicines"
  | "subscriptionDaysLeft"
  | "isSubscriptionExpired"
  | "isSubscriptionExpiringSoon"
  | "isTrialSubscription"
  | "appUser"
  | "dashboardBranchRows"
  | "showBranchBreakdown"
  | "showOrgInventoryAlerts"
  | "branchInventoryAlertRows"
  | "useBranchAwareInventoryAlerts"
  | "isViewingAllBranches"
  | "resolveBranchLabel"
  | "switchBranch"
  | "setActivePage"
  | "openInventoryWithFilter"
  | "openSubscriptionSettings"
  | "canUsePurchases"
  | "goToCustomerPaymentForm"
  | "pendingBranchTransferGroups"
  | "handleApproveBranchTransfer"
  | "handleRejectBranchTransfer"
>;

export default function AppDashboardRoute({
  isArabic,
  t,
  allowedPages,
  lowStockCount,
  expiredCount,
  expiringCount,
  totalCustomerRemainingDebt,
  totalCustomerPayments,
  dashboardSalesTotal,
  dashboardInvoicesCount,
  dashboardProfitTotal,
  totalInvoicesCount,
  totalMedicinesCount,
  purchases,
  returns,
  branches,
  lowStockMedicines,
  expiringSoonMedicines,
  expiredMedicines,
  subscriptionDaysLeft,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription,
  appUser,
  dashboardBranchRows,
  showBranchBreakdown,
  showOrgInventoryAlerts,
  branchInventoryAlertRows,
  useBranchAwareInventoryAlerts,
  isViewingAllBranches,
  resolveBranchLabel,
  switchBranch,
  setActivePage,
  openInventoryWithFilter,
  openSubscriptionSettings,
  canUsePurchases,
  goToCustomerPaymentForm,
  pendingBranchTransferGroups,
  handleApproveBranchTransfer,
  handleRejectBranchTransfer,
}: AppDashboardRouteProps) {
  return (
    <DashboardPage
      isArabic={isArabic}
      t={t}
      allowedPages={allowedPages}
      lowStockCount={lowStockCount}
      expiredCount={expiredCount}
      expiringCount={expiringCount}
      totalCustomerRemainingDebt={totalCustomerRemainingDebt}
      totalCustomerPayments={totalCustomerPayments}
      dashboardSalesTotal={dashboardSalesTotal}
      dashboardInvoicesCount={dashboardInvoicesCount}
      dashboardProfitTotal={dashboardProfitTotal}
      totalInvoicesCount={totalInvoicesCount}
      totalMedicinesCount={totalMedicinesCount}
      totalPurchasesCount={purchases.length}
      totalReturnsCount={returns.length}
      branchesCount={branches.length}
      lowStockMedicines={lowStockMedicines}
      expiringSoonMedicines={expiringSoonMedicines}
      expiredMedicines={expiredMedicines}
      subscriptionDaysLeft={subscriptionDaysLeft}
      isSubscriptionExpired={isSubscriptionExpired}
      isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
      isTrialSubscription={isTrialSubscription}
      hasAdminRole={isPharmacyManager(appUser)}
      dashboardBranchRows={dashboardBranchRows}
      showBranchBreakdown={showBranchBreakdown}
      showOrgInventoryAlerts={showOrgInventoryAlerts}
      branchInventoryAlertRows={branchInventoryAlertRows}
      showBranchInAlertLists={useBranchAwareInventoryAlerts || isViewingAllBranches}
      getBranchLabel={resolveBranchLabel}
      onOpenBranchInventory={(branchId) => {
        switchBranch(branchId);
        openInventoryWithFilter("low");
      }}
      onOpenSubscriptionSettings={openSubscriptionSettings}
      onOpenPOS={() => {
        setActivePage("pos");
      }}
      onOpenPurchases={() => {
        setActivePage("purchases");
      }}
      onOpenReorderSuggestions={
        canUsePurchases() && !isSubscriptionExpired
          ? () => {
              requestOpenReorderModal();
              setActivePage("purchases");
            }
          : undefined
      }
      onOpenInventory={(filter) => openInventoryWithFilter(filter)}
      onOpenCustomerPayments={goToCustomerPaymentForm}
      onNavigate={(page) => {
        setActivePage(page);
      }}
      pendingBranchTransferGroups={pendingBranchTransferGroups}
      onApproveBranchTransfer={handleApproveBranchTransfer}
      onRejectBranchTransfer={handleRejectBranchTransfer}
    />
  );
}
