import DashboardBranchBreakdown from "./dashboard/DashboardBranchBreakdown";
import DashboardIntroSection from "./dashboard/DashboardIntroSection";
import DashboardInventoryAlerts from "./dashboard/DashboardInventoryAlerts";
import DashboardModuleGrid from "./dashboard/DashboardModuleGrid";
import DashboardOrgInventoryAlerts from "./dashboard/DashboardOrgInventoryAlerts";
import DashboardPendingTransfers from "./dashboard/DashboardPendingTransfers";
import DashboardQuickActions from "./dashboard/DashboardQuickActions";
import DashboardSubscriptionAlert from "./dashboard/DashboardSubscriptionAlert";
import { useDashboardModules } from "./dashboard/useDashboardModules";
import type { DashboardPageProps } from "./dashboard/types";

export type { DashboardPageProps, PendingBranchTransferGroup } from "./dashboard/types";

export default function DashboardPage({
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
  totalPurchasesCount,
  totalReturnsCount,
  branchesCount,
  lowStockMedicines,
  expiringSoonMedicines,
  expiredMedicines,
  subscriptionDaysLeft,
  isSubscriptionExpired,
  isSubscriptionExpiringSoon,
  isTrialSubscription = false,
  hasAdminRole,
  showBranchBreakdown = false,
  dashboardBranchRows = [],
  showOrgInventoryAlerts = false,
  branchInventoryAlertRows = [],
  showBranchInAlertLists = false,
  getBranchLabel,
  onOpenBranchInventory,
  onOpenSubscriptionSettings,
  onOpenPOS,
  onOpenPurchases,
  onOpenReorderSuggestions,
  onOpenInventory,
  onOpenCustomerPayments,
  onNavigate,
  pendingBranchTransferGroups = [],
  onApproveBranchTransfer,
  onRejectBranchTransfer,
}: DashboardPageProps) {
  const { modules, quickActions, canAccess } = useDashboardModules({
    allowedPages,
    isArabic,
    t,
    totalMedicinesCount,
    lowStockCount,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    totalInvoicesCount,
    totalPurchasesCount,
    totalReturnsCount,
    totalCustomerRemainingDebt,
    totalCustomerPayments,
    dashboardProfitTotal,
    branchesCount,
    onOpenInventory,
    onOpenPOS,
    onOpenPurchases,
    onOpenCustomerPayments,
    onNavigate,
  });

  const showInventoryAlerts = canAccess("inventory");

  return (
    <div className="dashboardPage">
      <DashboardIntroSection isArabic={isArabic} />

      <DashboardModuleGrid isArabic={isArabic} modules={modules} />

      {showOrgInventoryAlerts && (
        <DashboardOrgInventoryAlerts
          isArabic={isArabic}
          branchInventoryAlertRows={branchInventoryAlertRows}
          onOpenBranchInventory={onOpenBranchInventory}
        />
      )}

      {showBranchBreakdown && (
        <DashboardBranchBreakdown
          isArabic={isArabic}
          t={t}
          dashboardBranchRows={dashboardBranchRows}
          canAccessReports={canAccess("reports")}
          onNavigate={onNavigate}
        />
      )}

      <DashboardSubscriptionAlert
        isArabic={isArabic}
        subscriptionDaysLeft={subscriptionDaysLeft}
        isSubscriptionExpired={isSubscriptionExpired}
        isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
        isTrialSubscription={isTrialSubscription}
        hasAdminRole={hasAdminRole}
        canAccessSettings={canAccess("settings")}
        onOpenSubscriptionSettings={onOpenSubscriptionSettings}
      />

      <DashboardQuickActions quickActions={quickActions} />

      {onApproveBranchTransfer && onRejectBranchTransfer && (
        <DashboardPendingTransfers
          isArabic={isArabic}
          t={t}
          pendingBranchTransferGroups={pendingBranchTransferGroups}
          getBranchLabel={getBranchLabel}
          onApproveBranchTransfer={onApproveBranchTransfer}
          onRejectBranchTransfer={onRejectBranchTransfer}
        />
      )}

      {showInventoryAlerts && (
        <DashboardInventoryAlerts
          isArabic={isArabic}
          lowStockCount={lowStockCount}
          expiringCount={expiringCount}
          expiredCount={expiredCount}
          lowStockMedicines={lowStockMedicines}
          expiringSoonMedicines={expiringSoonMedicines}
          expiredMedicines={expiredMedicines}
          showBranchInAlertLists={showBranchInAlertLists}
          getBranchLabel={getBranchLabel}
          onOpenInventory={onOpenInventory}
          onOpenReorderSuggestions={onOpenReorderSuggestions}
        />
      )}
    </div>
  );
}
