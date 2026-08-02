import { useMemo } from "react";
import { useAppSharedState, useAppOrgContext } from "./app-state/shared";
import { useAppAuthSlice } from "./app-state/useAppAuthSlice";
import { useAppDataSlice } from "./app-state/useAppDataSlice";
import { useAppTenantSlice } from "./app-state/useAppTenantSlice";
import { useAppOperationsSlice } from "./app-state/useAppOperationsSlice";
import { useAppMetricsSlice } from "./app-state/useAppMetricsSlice";
import { useAppBindingsSlice } from "./app-state/useAppBindingsSlice";
import { useAppPermissions } from "./useAppPermissions";
import { getAllowedPages } from "../utils/roles";
import { filterPagesBySubscriptionTier } from "../utils/subscriptionFeatures";
import { getSubscriptionStatus } from "../utils/subscriptionStatus";
import type { Page } from "../types";

export function useAppState() {
  const shared = useAppSharedState();
  const auth = useAppAuthSlice({
    isArabic: shared.isArabic,
    activePage: shared.activePage,
    setActivePage: shared.setActivePage,
  });
  const data = useAppDataSlice({
    isArabic: shared.isArabic,
    onOpenInventoryExpiryView: shared.onOpenInventoryExpiryView,
    appUser: auth.appUser,
    user: auth.user,
    branches: auth.branches,
    setBranches: auth.setBranches,
    activeBranchId: auth.activeBranchId,
    getPharmacyId: auth.getPharmacyId,
  });
  const org = useAppOrgContext(shared, auth, data.medicines);

  const { isSubscriptionExpired } = useMemo(
    () => getSubscriptionStatus(data.pharmacySettings),
    [data.pharmacySettings],
  );

  const allowedPages = useMemo(() => {
    if (!auth.appUser) return [];
    return filterPagesBySubscriptionTier(
      getAllowedPages(auth.appUser),
      auth.appUser,
      org.orgSubscriptionTier,
    );
  }, [auth.appUser, org.orgSubscriptionTier]);

  const displayPage = useMemo((): Page => {
    if (!auth.appUser) return shared.activePage;
    if (shared.activePage === "hr") return "users";
    if (allowedPages.includes(shared.activePage)) return shared.activePage;
    return allowedPages[0] || "dashboard";
  }, [auth.appUser, shared.activePage, allowedPages]);

  const permissions = useAppPermissions(auth.appUser, isSubscriptionExpired, allowedPages);

  const operations = useAppOperationsSlice({
    isArabic: shared.isArabic,
    t: shared.t,
    activePage: shared.activePage,
    setActivePage: shared.setActivePage,
    setIsMenuOpen: shared.setIsMenuOpen,
    user: auth.user,
    appUser: auth.appUser,
    branches: auth.branches,
    activeBranchId: auth.activeBranchId,
    setActiveBranchId: auth.setActiveBranchId,
    getPharmacyId: auth.getPharmacyId,
    medicines: data.medicines,
    setMedicines: data.setMedicines,
    invoices: data.invoices,
    returns: data.returns,
    setReturns: data.setReturns,
    setStockMovements: data.setStockMovements,
    pharmacySettings: data.pharmacySettings,
    appLogo: data.appLogo,
    heldInvoicesSetterRef: data.heldInvoicesSetterRef,
    refreshMedicinesFromDb: data.refreshMedicinesFromDb,
    addActivityLog: data.addActivityLog,
    branchMedicines: org.branchMedicines,
    isViewingAllBranches: org.isViewingAllBranches,
    orgSubscriptionTier: org.orgSubscriptionTier,
    canUseSystemActions: permissions.canUseSystemActions,
    canUsePOS: permissions.canUsePOS,
    canManageInventory: permissions.canManageInventory,
    canDeleteMedicine: permissions.canDeleteMedicine,
    canUseReturns: permissions.canUseReturns,
    canDeleteReturn: permissions.canDeleteReturn,
  });

  const tenant = useAppTenantSlice({
    isArabic: shared.isArabic,
    activePage: shared.activePage,
    setActivePage: shared.setActivePage,
    setIsMenuOpen: shared.setIsMenuOpen,
    appUser: auth.appUser,
    branches: auth.branches,
    setBranches: auth.setBranches,
    activeBranchId: auth.activeBranchId,
    setActiveBranchId: auth.setActiveBranchId,
    getPharmacyId: auth.getPharmacyId,
    settingsForm: data.settingsForm,
    setSettingsForm: data.setSettingsForm,
    pharmacySettings: data.pharmacySettings,
    addActivityLog: data.addActivityLog,
    subscriptionRequests: data.subscriptionRequests,
    setSubscriptionRequests: data.setSubscriptionRequests,
    pendingPharmacyLoginAccounts: data.pendingPharmacyLoginAccounts,
    setPendingPharmacyLoginAccounts: data.setPendingPharmacyLoginAccounts,
    pendingCustomRoles: data.pendingCustomRoles,
    setPendingCustomRoles: data.setPendingCustomRoles,
    systemUsers: data.systemUsers,
    setSystemUsers: data.setSystemUsers,
  });

  const metrics = useAppMetricsSlice({
    isArabic: shared.isArabic,
    query: shared.query,
    inventoryStatusFilter: shared.inventoryStatusFilter,
    invoiceSearch: shared.invoiceSearch,
    invoicePaymentFilter: shared.invoicePaymentFilter,
    invoiceFromDate: shared.invoiceFromDate,
    invoiceToDate: shared.invoiceToDate,
    reportFrom: shared.reportFrom,
    reportTo: shared.reportTo,
    setReportFrom: shared.setReportFrom,
    setReportTo: shared.setReportTo,
    dashboardPeriod: shared.dashboardPeriod,
    dashboardFromDate: shared.dashboardFromDate,
    dashboardToDate: shared.dashboardToDate,
    onOpenInventoryExpiryView: shared.onOpenInventoryExpiryView,
    appUser: auth.appUser,
    branches: auth.branches,
    getPharmacyId: auth.getPharmacyId,
    medicines: data.medicines,
    orgAlertMedicines: data.orgAlertMedicines,
    invoices: data.invoices,
    returns: data.returns,
    customerPayments: data.customerPayments,
    pharmacyCosts: data.pharmacyCosts,
    activityLogs: data.activityLogs,
    subscriptionRequests: data.subscriptionRequests,
    purchases: data.purchases,
    pharmacySettings: data.pharmacySettings,
    showOrgInventoryAlerts: org.showOrgInventoryAlerts,
    isViewingAllBranches: org.isViewingAllBranches,
    showBranchBreakdown: org.showBranchBreakdown,
    resolveBranchLabel: org.resolveBranchLabel,
    getPaymentLabel: operations.getPaymentLabel,
    getReturnTypeLabel: operations.getReturnTypeLabel,
    getRefundMethodLabel: operations.getRefundMethodLabel,
    getReturnItemsSummary: operations.getReturnItemsSummary,
    canViewInventoryCostProfitColumns: permissions.canViewInventoryCostProfitColumns,
    userLoading: auth.userLoading,
  });

  const bindings = useAppBindingsSlice({
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
  });

  return {
    loginScreenStatus: auth.loginScreenStatus,
    loginFormProps: auth.loginFormProps,
    isArabic: shared.isArabic,
    t: shared.t,
    lang: shared.lang,
    setLang: shared.setLang,
    themeMode: shared.themeMode,
    fontScale: shared.fontScale,
    resolvedTheme: shared.resolvedTheme,
    setThemeMode: shared.setThemeMode,
    setFontScale: shared.setFontScale,
    toggleTheme: shared.toggleTheme,
    handleLogout: auth.handleLogout,
    appUser: auth.appUser,
    orgSubscriptionTier: org.orgSubscriptionTier,
    openSubscriptionSettings: shared.openSubscriptionSettings,
    pageRouterProps: bindings.pageRouterProps,
    appModalsProps: bindings.appModalsProps,
    appShellProps: bindings.appShellProps,
  };
}
