import { DashboardPage } from "../../pages/lazyPages";
import { requestOpenReorderModal } from "../../utils/reorderSuggestions";
import { isPharmacyManager } from "../../utils/roles";
import type { AppPageRouterProps } from "./types";

export type AppDashboardRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
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
  | "medicines"
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
  | "setInventoryStatusFilter"
  | "setQuery"
  | "openSubscriptionSettings"
  | "canUsePurchases"
  | "goToCustomerPaymentForm"
  | "pendingBranchTransferGroups"
  | "handleApproveBranchTransfer"
  | "handleRejectBranchTransfer"
>;

export default function AppDashboardRoute({
  displayPage,
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
  medicines,
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
  setInventoryStatusFilter,
  setQuery,
  openSubscriptionSettings,
  canUsePurchases,
  goToCustomerPaymentForm,
  pendingBranchTransferGroups,
  handleApproveBranchTransfer,
  handleRejectBranchTransfer,
}: AppDashboardRouteProps) {
  if (displayPage !== "dashboard") return null;

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
        setActivePage("inventory");
        setInventoryStatusFilter("low");
        setQuery("");
      }}
      onOpenSubscriptionSettings={openSubscriptionSettings}
      onOpenPOS={() => {
        setActivePage("pos");
        setQuery("");
      }}
      onOpenPurchases={() => {
        setActivePage("purchases");
        setQuery("");
      }}
      onOpenReorderSuggestions={
        canUsePurchases() && !isSubscriptionExpired
          ? () => {
              requestOpenReorderModal();
              setActivePage("purchases");
              setQuery("");
            }
          : undefined
      }
      onOpenInventory={(filter) => {
        setActivePage("inventory");
        setInventoryStatusFilter(filter);
        setQuery("");
      }}
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
