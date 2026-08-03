import { useMemo } from "react";
import { useInventoryDerived } from "../useInventoryDerived";
import { useBusinessMetrics } from "../useBusinessMetrics";
import { useDataExports } from "../useDataExports";
import { useExpiryNotify } from "../useExpiryNotify";
import { useMedicineCatalogStats } from "../useMedicineCatalogStats";
import { getSubscriptionStatus } from "../../utils/subscriptionStatus";
import {
  buildBranchInventoryAlertRowsFromStats,
} from "../../utils/inventoryAlerts";
import { LARGE_MEDICINE_CATALOG } from "../../constants/medicineCatalog";
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
    branchInventoryAlertRows: derivedBranchInventoryAlertRows,
    lowStockCount: derivedLowStockCount,
    expiringCount: derivedExpiringCount,
    expiredCount: derivedExpiredCount,
    alertItems,
    alertTotal: derivedAlertTotal,
    useBranchAwareInventoryAlerts: derivedUseBranchAwareInventoryAlerts,
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

  const catalogStats = useMedicineCatalogStats({
    pharmacyId: getPharmacyId(),
    branches,
    pharmacySettings,
    showOrgStats: showOrgInventoryAlerts,
  });

  const useCatalogStats =
    catalogStats.scopedStats.total > medicines.length ||
    catalogStats.scopedStats.total > LARGE_MEDICINE_CATALOG;

  const branchInventoryAlertRows = useMemo(() => {
    if (!showOrgInventoryAlerts) return derivedBranchInventoryAlertRows;
    if (Object.keys(catalogStats.branchStats).length > 0) {
      return buildBranchInventoryAlertRowsFromStats({
        branchStats: catalogStats.branchStats,
        branches,
        isArabic,
      });
    }
    return derivedBranchInventoryAlertRows;
  }, [
    showOrgInventoryAlerts,
    catalogStats.branchStats,
    derivedBranchInventoryAlertRows,
    branches,
    isArabic,
  ]);

  const totalMedicinesCount = useCatalogStats
    ? catalogStats.scopedStats.total
    : medicines.length;

  const lowStockCount = useCatalogStats
    ? catalogStats.scopedStats.lowStock
    : derivedLowStockCount;

  const expiringCount = useCatalogStats
    ? catalogStats.scopedStats.expiring
    : derivedExpiringCount;

  const expiredCount = useCatalogStats
    ? catalogStats.scopedStats.expired
    : derivedExpiredCount;

  const alertTotal = lowStockCount + expiringCount + expiredCount;

  const useBranchAwareInventoryAlerts =
    derivedUseBranchAwareInventoryAlerts ||
    (showOrgInventoryAlerts && Object.keys(catalogStats.branchStats).length > 0);

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
    totalMedicinesCount,
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
