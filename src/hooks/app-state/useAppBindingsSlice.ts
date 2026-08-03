import { useCallback, useEffect, useLayoutEffect } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import { useAppBindings } from "../useAppBindings";
import { useGlobalSearchShortcut } from "../useGlobalSearchShortcut";
import { useSuperAdminNotifications } from "../useSuperAdminNotifications";
import {
  getSubscriptionPlanLabel as formatSubscriptionPlanLabel,
} from "../../utils/appLabels";
import { barcodeCSV, downloadCSV } from "../../utils/csvExport";
import { safeNumber } from "../../utils/safeNumber";
import type { GlobalSearchResult } from "../../utils/globalSearch";
import type { Page } from "../../types";
import type { AppAuthSliceReturn } from "./useAppAuthSlice";
import type { AppDataSliceReturn } from "./useAppDataSlice";
import type { AppMetricsSliceReturn } from "./useAppMetricsSlice";
import type { AppOperationsSliceReturn } from "./useAppOperationsSlice";
import type { AppTenantSliceReturn } from "./useAppTenantSlice";
import type { AppOrgContextReturn, AppSharedStateReturn } from "./shared";

import type { useAppPermissions } from "../useAppPermissions";

type AppPermissionsReturn = ReturnType<typeof useAppPermissions>;

type UseAppBindingsSliceInput = {
  shared: AppSharedStateReturn;
  auth: AppAuthSliceReturn;
  org: AppOrgContextReturn;
  data: AppDataSliceReturn;
  tenant: AppTenantSliceReturn;
  operations: AppOperationsSliceReturn;
  metrics: AppMetricsSliceReturn;
  permissions: AppPermissionsReturn;
  allowedPages: Page[];
  displayPage: Page;
};

export function useAppBindingsSlice({
  shared,
  auth,
  org,
  data,
  tenant,
  operations,
  metrics,
  permissions,
  allowedPages,
  displayPage,
}: UseAppBindingsSliceInput) {
  const {
    isArabic,
    t,
    lang,
    setLang,
    activePage,
    setActivePage,
    settingsInitialTab,
    openSubscriptionSettings,
    isMenuOpen,
    setIsMenuOpen,
    query,
    setQuery,
    globalSearchFocusToken,
    focusGlobalSearch,
    customerSearchSeed,
    setCustomerSearchSeed,
    customerPaymentModalRequest,
    setCustomerPaymentModalRequest,
    inventoryStatusFilter,
    setInventoryStatusFilter,
    invoiceSearch,
    setInvoiceSearch,
    invoicePaymentFilter,
    setInvoicePaymentFilter,
    invoiceFromDate,
    setInvoiceFromDate,
    invoiceToDate,
    setInvoiceToDate,
    reportFrom,
    reportTo,
    setReportFrom,
    setReportTo,
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    toggleTheme,
    goToCustomerPaymentForm,
  } = shared;

  const { user, appUser, handleLogout, branches, setBranches, activeBranchId, getPharmacyId } =
    auth;

  const {
    hasRole,
    canUseSystemActions,
    canUsePurchases,
    canManageCosts,
    canViewReports,
    canViewStockMovements,
    canViewActivityLogs,
    canDeleteMedicine,
    canViewInvoices,
    canViewCustomers,
    canUsePOS,
    canUseReturns,
    canDeleteReturn,
    canDeletePurchase,
    canViewInventoryCostProfitColumns,
    canViewPosCostProfitColumns,
    canOpenPage,
    canManageInventory,
  } = permissions;

  useLayoutEffect(() => {
    if (!appUser) return;
    if (displayPage !== activePage) {
      setActivePage(displayPage);
    }
  }, [appUser, displayPage, activePage, setActivePage]);

  useEffect(() => {
    if (displayPage !== "pos" || !appUser) return;
    pharmacyService.setActivePharmacy(getPharmacyId());
    void data.refreshMedicinesFromDb();
  }, [displayPage, appUser?.uid, activeBranchId, getPharmacyId, data.refreshMedicinesFromDb]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      operations.setAvailabilityModal(null);
      operations.setSelectedInvoice(null);
      operations.setSelectedReturn(null);
      operations.setReturnInvoice(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    setIsMenuOpen,
    operations.setAvailabilityModal,
    operations.setSelectedInvoice,
    operations.setSelectedReturn,
    operations.setReturnInvoice,
  ]);

  useGlobalSearchShortcut({
    enabled: Boolean(user && appUser),
    onFocus: focusGlobalSearch,
  });

  useSuperAdminNotifications({
    appUser,
    subscriptionRequests: data.subscriptionRequests,
    isArabic,
    onOpenTenants: tenant.onOpenTenants,
  });

  function getSubscriptionPlanLabel(plan: string) {
    return formatSubscriptionPlanLabel(plan, isArabic);
  }

  const handleGlobalSearchSelect = useCallback(
    (result: GlobalSearchResult) => {
      setIsMenuOpen(false);

      switch (result.type) {
        case "page":
          if (allowedPages.includes(result.page)) {
            setActivePage(result.page);
          }
          break;
        case "medicine":
          if (allowedPages.includes("inventory")) {
            setActivePage("inventory");
            setInventoryStatusFilter("all");
            setQuery(result.searchText);
          } else if (canUsePOS()) {
            setActivePage("pos");
            operations.addToCart(result.medicine);
          }
          break;
        case "invoice":
          operations.setSelectedInvoice(result.invoice);
          break;
        case "customer":
          if (allowedPages.includes("customers")) {
            setActivePage("customers");
            setCustomerSearchSeed(result.customerName);
          }
          break;
        default:
          break;
      }
    },
    [
      allowedPages,
      canUsePOS,
      operations.addToCart,
      operations.setSelectedInvoice,
      setActivePage,
      setCustomerSearchSeed,
      setInventoryStatusFilter,
      setIsMenuOpen,
      setQuery,
    ],
  );

  const { pageRouterProps, appModalsProps, appShellProps } = useAppBindings({
    displayPage,
    isArabic,
    t,
    canOpenPage,
    allowedPages,
    setActivePage,
    setQuery,
    setInventoryStatusFilter,
    goToCustomerPaymentForm,
    openSubscriptionSettings,
    switchBranch: operations.switchBranch,
    getPharmacyId,
    getPaymentLabel: operations.getPaymentLabel,
    getSubscriptionPlanLabel,
    getReturnTypeLabel: operations.getReturnTypeLabel,
    getRefundMethodLabel: operations.getRefundMethodLabel,
    getReturnItemsSummary: operations.getReturnItemsSummary,
    resolveBranchLabel: org.resolveBranchLabel,
    hasRole,
    canUsePurchases,
    canDeletePurchase,
    canManageCosts,
    canUsePOS,
    canManageInventory,
    canDeleteMedicine,
    canViewInventoryCostProfit: canViewInventoryCostProfitColumns(),
    canViewPosCostProfit: canViewPosCostProfitColumns(),
    canUseReturns,
    canDeleteReturn,
    canViewCustomers,
    appUser,
    user,
    orgSubscriptionTier: org.orgSubscriptionTier,
    isViewingAllBranches: org.isViewingAllBranches,
    isSubscriptionExpired: metrics.isSubscriptionExpired,
    isSubscriptionExpiringSoon: metrics.isSubscriptionExpiringSoon,
    isTrialSubscription: metrics.isTrialSubscription,
    subscriptionDaysLeft: metrics.subscriptionDaysLeft,
    showBranchBreakdown: org.showBranchBreakdown,
    showOrgInventoryAlerts: org.showOrgInventoryAlerts,
    useBranchAwareInventoryAlerts: metrics.useBranchAwareInventoryAlerts,
    tierUpgradePrompt: org.tierUpgradePrompt,
    transferUpgradeNotice: org.transferUpgradeNotice,
    branchBreakdownUpgradeNotice: org.branchBreakdownUpgradeNotice,
    medicines: data.medicines,
    branches,
    purchases: data.purchases,
    returns: data.returns,
    pharmacyCosts: data.pharmacyCosts,
    customerDebts: metrics.customerDebts,
    customerPayments: data.customerPayments,
    activityLogs: data.activityLogs,
    stockMovements: data.stockMovements,
    systemUsers: data.systemUsers,
    subscriptionRequests: data.subscriptionRequests,
    pendingPharmacyLoginAccounts: data.pendingPharmacyLoginAccounts,
    pendingCustomRoles: data.pendingCustomRoles,
    branchTransfers: operations.branchTransfers,
    pharmacySettings: data.pharmacySettings,
    appLogo: data.appLogo,
    activeBranchId,
    settingsInitialTab,
    settingsForm: data.settingsForm,
    setSettingsForm: data.setSettingsForm,
    lowStockThreshold: metrics.lowStockThreshold,
    expiringSoonDays: metrics.expiringSoonDays,
    lowStockCount: metrics.lowStockCount,
    expiredCount: metrics.expiredCount,
    expiringCount: metrics.expiringCount,
    lowStockMedicines: metrics.lowStockMedicines,
    expiringSoonMedicines: metrics.expiringSoonMedicines,
    expiredMedicines: metrics.expiredMedicines,
    branchInventoryAlertRows: metrics.branchInventoryAlertRows,
    dashboardSalesTotal: metrics.dashboardSalesTotal,
    dashboardInvoicesCount: metrics.dashboardInvoicesCount,
    dashboardProfitTotal: metrics.dashboardProfitTotal,
    totalInvoicesCount: metrics.totalInvoicesCount,
    totalMedicinesCount: metrics.totalMedicinesCount,
    totalCustomerRemainingDebt: metrics.totalCustomerRemainingDebt,
    totalCustomerPayments: metrics.totalCustomerPayments,
    dashboardBranchRows: metrics.dashboardBranchRows,
    pendingBranchTransferGroups: operations.pendingBranchTransferGroups,
    newMedicine: operations.newMedicine,
    setNewMedicine: operations.setNewMedicine,
    editingMedicineId: operations.editingMedicineId,
    filteredMedicines: metrics.filteredMedicines,
    filteredInvoicesList: metrics.filteredInvoicesList,
    invoices: data.invoices,
    invoiceSearch,
    invoicePaymentFilter,
    invoiceFromDate,
    invoiceToDate,
    setInvoiceSearch,
    setInvoicePaymentFilter,
    setInvoiceFromDate,
    setInvoiceToDate,
    reportFrom,
    reportTo,
    setReportFrom,
    setReportTo,
    filteredReportInvoices: metrics.filteredReportInvoices,
    filteredReportProfitTotal: metrics.filteredReportProfitTotal,
    filteredReportTotal: metrics.filteredReportTotal,
    filteredReportDiscountTotal: metrics.filteredReportDiscountTotal,
    reportUnitsSold: metrics.reportUnitsSold,
    reportReturnsTotal: metrics.reportReturnsTotal,
    reportCostsTotal: metrics.reportCostsTotal,
    reportCostsCount: metrics.reportCostsCount,
    reportCostsByCategory: metrics.reportCostsByCategory,
    netProfitAfterCosts: metrics.netProfitAfterCosts,
    topSellingMedicines: metrics.topSellingMedicines,
    reportPaymentTotals: metrics.reportPaymentTotals,
    reportPaymentBreakdown: metrics.reportPaymentBreakdown,
    reportSalesTrend: metrics.reportSalesTrend,
    reportCashierTotals: metrics.reportCashierTotals,
    reportBranchRows: metrics.reportBranchRows,
    subscriptionRenewLogs: metrics.subscriptionRenewLogs,
    pharmacySubscriptionRequests: metrics.pharmacySubscriptionRequests,
    cart: operations.cart,
    cartItemsCount: operations.cartItemsCount,
    cartTotalQty: operations.cartTotalQty,
    subtotal: operations.subtotal,
    total: operations.total,
    discount: operations.discount,
    paymentMethod: operations.paymentMethod,
    customerName: operations.customerName,
    isSelling: operations.isSelling,
    heldInvoices: operations.heldInvoices,
    isHolding: operations.isHolding,
    currentWorkShiftLabel: operations.currentWorkShiftLabel,
    currentWorkShiftId: operations.currentWorkShiftId,
    activeCashierShift: operations.activeCashierShift,
    setActiveCashierShift: operations.setActiveCashierShift,
    isOnline: operations.isOnline,
    pendingOfflineSalesCount: operations.pendingOfflineSalesCount,
    offlineMedicinesCacheAt: operations.offlineMedicinesCacheAt,
    isSyncingOfflineSales: operations.isSyncingOfflineSales,
    deletingReturnId: operations.deletingReturnId,
    customerPaymentModalRequest,
    customerSearchSeed,
    selectedTenantId: tenant.selectedTenantId,
    tenantForm: tenant.tenantForm,
    tenantUserForm: tenant.tenantUserForm,
    creatingTenant: tenant.creatingTenant,
    creatingTenantUser: tenant.creatingTenantUser,
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    addToCart: operations.addToCart,
    changeQty: operations.changeQty,
    removeItem: operations.removeItem,
    clearCart: operations.clearCart,
    setDiscount: operations.setDiscount,
    setPaymentMethod: operations.setPaymentMethod,
    setCustomerName: operations.setCustomerName,
    completeSale: operations.completeSale,
    handleHoldInvoice: operations.handleHoldInvoice,
    openHeldInvoicesModal: operations.openHeldInvoicesModal,
    setShowInstantReturnModal: operations.setShowInstantReturnModal,
    saveMedicine: operations.saveMedicine,
    cancelEditMedicine: operations.cancelEditMedicine,
    openAddMedicineForm: operations.openAddMedicineForm,
    startEditMedicine: operations.startEditMedicine,
    deleteMedicine: operations.deleteMedicine,
    handleApplyStockCount: operations.handleApplyStockCount,
    handleBranchTransferComplete: operations.handleBranchTransferComplete,
    printBranchTransferRecords: operations.printBranchTransferRecords,
    refreshMedicinesFromDb: data.refreshMedicinesFromDb,
    refreshPurchasesFromDb: data.refreshPurchasesFromDb,
    refreshPharmacyCostsFromDb: data.refreshPharmacyCostsFromDb,
    refreshActivityLogsFromDb: data.refreshActivityLogsFromDb,
    refreshBranchTransfers: operations.refreshBranchTransfers,
    addActivityLog: data.addActivityLog,
    exportInventoryCSV: metrics.exportInventoryCSV,
    exportInvoicesCSV: metrics.exportInvoicesCSV,
    exportReturnsCSV: metrics.exportReturnsCSV,
    exportBackupCSV: metrics.exportBackupCSV,
    applyReportQuickRange: metrics.applyReportQuickRange,
    safeNumber,
    barcodeCSV,
    downloadCSV,
    printSavedInvoice: operations.printSavedInvoice,
    setSelectedInvoice: operations.setSelectedInvoice,
    setSelectedReturn: operations.setSelectedReturn,
    openReturnModal: operations.openReturnModal,
    handleDeleteReturn: operations.handleDeleteReturn,
    setCustomerPaymentModalRequest,
    setCustomerSearchSeed,
    handleApproveBranchTransfer: operations.handleApproveBranchTransfer,
    handleRejectBranchTransfer: operations.handleRejectBranchTransfer,
    handleLogoUpload: data.handleLogoUpload,
    savePharmacySettings: data.savePharmacySettings,
    handleSubmitSubscriptionRequest: tenant.handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest: tenant.handleSubmitTierUpgradeRequest,
    handleRequestExpiryNotificationPermission: data.handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow: data.handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest: data.handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest: data.handleOpenExpiryEmailDigest,
    setSelectedTenantId: tenant.setSelectedTenantId,
    setTenantForm: tenant.setTenantForm,
    resetTenantForm: tenant.resetTenantForm,
    handleCreateTenant: tenant.handleCreateTenant,
    setTenantUserForm: tenant.setTenantUserForm,
    resetTenantUserForm: tenant.resetTenantUserForm,
    handleCreateTenantUser: tenant.handleCreateTenantUser,
    handleCreateOrganizationBranch: tenant.handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch: tenant.handleUpdateOrganizationBranch,
    handleDeleteOrganization: tenant.handleDeleteOrganization,
    handleDeleteOrganizationBranch: tenant.handleDeleteOrganizationBranch,
    handleDeleteTenantStaff: tenant.handleDeleteTenantStaff,
    handleSwitchTenantView: tenant.handleSwitchTenantView,
    handleOpenTenantUsers: tenant.openTenantEmployeesPage,
    employeesPageTenantScope: tenant.employeesPageTenantScope,
    handleUpdateTenantStatus: tenant.handleUpdateTenantStatus,
    handleUpdateOrganizationMaxBranches: tenant.handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers: tenant.handleUpdateOrganizationMaxUsers,
    handleUpdateSubscriptionTier: tenant.handleUpdateSubscriptionTier,
    handleUpdateOrganizationFreeTrial: tenant.handleUpdateOrganizationFreeTrial,
    handleApproveSubscriptionRequest: tenant.handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest: tenant.handleRejectSubscriptionRequest,
    handleApprovePharmacyLoginAccount: tenant.handleApprovePharmacyLoginAccount,
    handleRejectPharmacyLoginAccount: tenant.handleRejectPharmacyLoginAccount,
    refreshAdminRequestsStable: tenant.refreshAdminRequestsStable,
    refreshSystemUsersStable: tenant.refreshSystemUsersStable,
    refreshPharmacies: tenant.refreshPharmacies,
    setBranches,
    lang,
    invoices: data.invoices,
    selectedReturn: operations.selectedReturn,
    selectedInvoice: operations.selectedInvoice,
    availabilityModal: operations.availabilityModal,
    availabilityLoading: operations.availabilityLoading,
    setAvailabilityModal: operations.setAvailabilityModal,
    returnInvoice: operations.returnInvoice,
    setReturnInvoice: operations.setReturnInvoice,
    returnQuantities: operations.returnQuantities,
    setReturnQuantities: operations.setReturnQuantities,
    showHeldInvoicesModal: operations.showHeldInvoicesModal,
    setShowHeldInvoicesModal: operations.setShowHeldInvoicesModal,
    showInstantReturnModal: operations.showInstantReturnModal,
    globalSearchFocusToken,
    isHeldInvoiceProcessing: operations.isHeldInvoiceProcessing,
    isReturning: operations.isReturning,
    handleResumeHeldInvoice: operations.handleResumeHeldInvoice,
    handleDeleteHeldInvoice: operations.handleDeleteHeldInvoice,
    handleInstantReturnSuccess: operations.handleInstantReturnSuccess,
    getReturnedQtyForInvoice: operations.getReturnedQtyForInvoice,
    getAvailableReturnQty: operations.getAvailableReturnQty,
    completeReturn: operations.completeReturn,
    openInvoiceByNumber: operations.openInvoiceByNumber,
    handleGlobalSearchSelect,
    adminNavBadges: tenant.adminNavBadges,
    alertItems: metrics.alertItems,
    alertTotal: metrics.alertTotal,
    writeBranchLabel: org.writeBranchLabel,
    isMenuOpen,
    setIsMenuOpen,
    setLang,
    toggleTheme,
    handleLogout,
  });

  return {
    pageRouterProps,
    appModalsProps,
    appShellProps,
  };
}

export type AppBindingsSliceReturn = ReturnType<typeof useAppBindingsSlice>;
