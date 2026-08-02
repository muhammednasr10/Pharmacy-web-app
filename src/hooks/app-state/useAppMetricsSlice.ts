import { useMemo } from "react";
import { useInventoryDerived } from "../useInventoryDerived";
import { useBusinessMetrics } from "../useBusinessMetrics";
import { useDataExports } from "../useDataExports";
import { useExpiryNotify } from "../useExpiryNotify";
import { getSubscriptionStatus } from "../../utils/subscriptionStatus";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";
import type { AppDataSliceReturn } from "./useAppDataSlice";
import type { AppOperationsSliceReturn } from "./useAppOperationsSlice";
import type { AppOrgContextReturn, AppSharedStateReturn } from "./shared";

type UseAppMetricsSliceInput = Pick<
  AppSharedStateReturn,
  | "isArabic"
  | "query"
  | "inventoryStatusFilter"
  | "invoiceSearch"
  | "invoicePaymentFilter"
  | "invoiceFromDate"
  | "invoiceToDate"
  | "reportFrom"
  | "reportTo"
  | "setReportFrom"
  | "setReportTo"
  | "dashboardPeriod"
  | "dashboardFromDate"
  | "dashboardToDate"
  | "onOpenInventoryExpiryView"
> &
  Pick<AppAuthSliceReturn, "appUser" | "branches" | "getPharmacyId"> &
  Pick<
    AppDataSliceReturn,
    | "medicines"
    | "orgAlertMedicines"
    | "invoices"
    | "returns"
    | "customerPayments"
    | "pharmacyCosts"
    | "activityLogs"
    | "subscriptionRequests"
    | "purchases"
    | "pharmacySettings"
  > &
  Pick<
    AppOrgContextReturn,
    "showOrgInventoryAlerts" | "isViewingAllBranches" | "showBranchBreakdown" | "resolveBranchLabel"
  > &
  Pick<
    AppOperationsSliceReturn,
    | "getPaymentLabel"
    | "getReturnTypeLabel"
    | "getRefundMethodLabel"
    | "getReturnItemsSummary"
  > & {
    canViewInventoryCostProfitColumns: () => boolean;
  };

export function useAppMetricsSlice({
  isArabic,
  query,
  inventoryStatusFilter,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  dashboardPeriod,
  dashboardFromDate,
  dashboardToDate,
  onOpenInventoryExpiryView,
  appUser,
  branches,
  getPharmacyId,
  medicines,
  orgAlertMedicines,
  invoices,
  returns,
  customerPayments,
  pharmacyCosts,
  activityLogs,
  subscriptionRequests,
  purchases,
  pharmacySettings,
  showOrgInventoryAlerts,
  isViewingAllBranches,
  showBranchBreakdown,
  resolveBranchLabel,
  getPaymentLabel,
  getReturnTypeLabel,
  getRefundMethodLabel,
  getReturnItemsSummary,
  canViewInventoryCostProfitColumns,
  userLoading,
}: UseAppMetricsSliceInput & { userLoading: boolean }) {
  const {
    subscriptionDaysLeft,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    isTrialSubscription,
  } = useMemo(() => getSubscriptionStatus(pharmacySettings), [pharmacySettings]);

  const {
    lowStockThreshold,
    expiringSoonDays,
    filteredMedicines,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    branchInventoryAlertRows,
    lowStockCount,
    expiringCount,
    expiredCount,
    alertItems,
    alertTotal,
    useBranchAwareInventoryAlerts,
  } = useInventoryDerived({
    query,
    medicines,
    orgAlertMedicines,
    showOrgInventoryAlerts,
    inventoryStatusFilter,
    pharmacySettings,
    branches,
    isViewingAllBranches,
    isArabic,
    resolveBranchLabel,
  });

  const {
    filteredInvoicesList,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    dashboardProfitTotal,
    dashboardPaymentBreakdown,
    dashboardTopSellingMedicines,
    dashboardTopCashiers,
    todaySalesTotal,
    todayInvoicesCount,
    todayProfitTotal,
    monthSalesTotal,
    monthProfitTotal,
    totalInvoicesCount,
    totalSalesAmount,
    totalCustomerPayments,
    topCashiers,
    filteredReportInvoices,
    filteredReportTotal,
    customerDebts,
    totalCustomerRemainingDebt,
    subscriptionRenewLogs,
    pharmacySubscriptionRequests,
    filteredReportProfitTotal,
    filteredReportDiscountTotal,
    reportPaymentTotals,
    reportCashierTotals,
    topSellingMedicines,
    reportSalesTrend,
    reportPaymentBreakdown,
    reportUnitsSold,
    reportReturnsTotal,
    filteredReportCosts,
    reportCostsTotal,
    reportCostsCount,
    reportCostsByCategory,
    netProfitAfterCosts,
    reportBranchRows,
    dashboardBranchRows,
  } = useBusinessMetrics({
    invoices,
    returns,
    customerPayments,
    pharmacyCosts,
    activityLogs,
    subscriptionRequests,
    branches,
    reportFrom,
    reportTo,
    dashboardPeriod,
    dashboardFromDate,
    dashboardToDate,
    invoiceSearch,
    invoicePaymentFilter,
    invoiceFromDate,
    invoiceToDate,
    isArabic,
    showBranchBreakdown,
    appUser,
    getPharmacyId,
  });

  const {
    exportBackupCSV,
    exportInventoryCSV,
    exportInvoicesCSV,
    exportReturnsCSV,
    applyReportQuickRange,
  } = useDataExports({
    isArabic,
    pharmacySettings,
    medicines,
    filteredMedicines,
    invoices,
    filteredInvoicesList,
    returns,
    purchases,
    customerPayments,
    isViewingAllBranches,
    getPaymentLabel,
    resolveBranchLabel,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    setReportFrom,
    setReportTo,
    includeInventoryCostProfit: canViewInventoryCostProfitColumns(),
  });

  useExpiryNotify({
    userLoading,
    appUser,
    pharmacySettings,
    medicines,
    branches,
    isArabic,
    isSubscriptionExpired,
    getPharmacyId,
    onOpenInventoryExpiryView,
  });

  return {
    subscriptionDaysLeft,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    isTrialSubscription,
    lowStockThreshold,
    expiringSoonDays,
    filteredMedicines,
    lowStockMedicines,
    expiredMedicines,
    expiringSoonMedicines,
    branchInventoryAlertRows,
    lowStockCount,
    expiringCount,
    expiredCount,
    alertItems,
    alertTotal,
    useBranchAwareInventoryAlerts,
    filteredInvoicesList,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    dashboardProfitTotal,
    dashboardPaymentBreakdown,
    dashboardTopSellingMedicines,
    dashboardTopCashiers,
    todaySalesTotal,
    todayInvoicesCount,
    todayProfitTotal,
    monthSalesTotal,
    monthProfitTotal,
    totalInvoicesCount,
    totalSalesAmount,
    totalCustomerPayments,
    topCashiers,
    filteredReportInvoices,
    filteredReportTotal,
    customerDebts,
    totalCustomerRemainingDebt,
    subscriptionRenewLogs,
    pharmacySubscriptionRequests,
    filteredReportProfitTotal,
    filteredReportDiscountTotal,
    reportPaymentTotals,
    reportCashierTotals,
    topSellingMedicines,
    reportSalesTrend,
    reportPaymentBreakdown,
    reportUnitsSold,
    reportReturnsTotal,
    filteredReportCosts,
    reportCostsTotal,
    reportCostsCount,
    reportCostsByCategory,
    netProfitAfterCosts,
    reportBranchRows,
    dashboardBranchRows,
    exportBackupCSV,
    exportInventoryCSV,
    exportInvoicesCSV,
    exportReturnsCSV,
    applyReportQuickRange,
  };
}

export type AppMetricsSliceReturn = ReturnType<typeof useAppMetricsSlice>;
