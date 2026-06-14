import { Suspense } from "react";
import PageLoadingCard from "./PageLoadingCard";
import type { Dispatch, SetStateAction } from "react";
import {
  ActivityLogsPage,
  BranchesPage,
  CostsPage,
  CustomersPage,
  DashboardPage,
  EmployeePortalPage,
  EmployeesUsersPage,
  InventoryPage,
  InvoicesPage,
  PosPage,
  PurchasesPage,
  ReportsPage,
  ReturnsPage,
  SettingsPage,
  SqlMigrationsPage,
  StockMovementsPage,
  SuperAdminPage,
  UserGuidePage,
  type SettingsTab,
} from "../pages/lazyPages";
import type { AppTranslation } from "../i18n/appTranslations";
import type { FontScale, ThemeMode } from "../utils/displayPreferences";
import type { ReportQuickRangePreset } from "../utils/reportDateRange";
import type { StockCountSession } from "../utils/stockCount";
import type { SettingsFormState } from "../utils/pharmacySettingsForm";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import type { TierUpgradePrompt } from "../utils/subscriptionFeatures";
import { canDeleteCustomerPayments, isPharmacyManager } from "../utils/roles";
import { canTransferStockWithTier } from "../utils/subscriptionFeatures";
import { getSubscriptionTierLabel } from "../config/subscriptionTiers";
import { requestOpenReorderModal } from "../utils/reorderSuggestions";
import type {
  ActivityLog,
  AppUser,
  BranchStockTransfer,
  CartItem,
  CashierShift,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  Medicine,
  NewMedicineForm,
  Page,
  PaymentMethod,
  PharmacyCost,
  PharmacyLoginAccount,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  SubscriptionRequest,
  SystemUser,
  UserRole,
} from "../types";

type PendingBranchTransferGroup = {
  transferNumber: string;
  fromPharmacyId: string;
  toPharmacyId?: string;
  status: string;
  createdAt?: string;
  totalQty: number;
};

export type AppPageRouterProps = {
  displayPage: Page;
  isArabic: boolean;
  t: AppTranslation;
  canOpenPage: (page: Page) => boolean;
  allowedPages: Page[];
  setActivePage: (page: Page) => void;
  setQuery: (value: string) => void;
  setInventoryStatusFilter: (value: "all" | "low" | "expiring" | "expired") => void;
  goToCustomerPaymentForm: () => void;
  openSubscriptionSettings: () => void;
  switchBranch: (branchId: string) => void;
  getPharmacyId: () => string;
  getPaymentLabel: (method: string) => string;
  getSubscriptionPlanLabel: (plan: string) => string;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  getReturnItemsSummary: (record: ReturnRecord) => string;
  resolveBranchLabel: (branchId?: string) => string;
  hasRole: (roles: UserRole[]) => boolean;
  canUsePurchases: () => boolean;
  canDeletePurchase: () => boolean;
  canManageCosts: () => boolean;
  canUsePOS: () => boolean;
  canManageInventory: () => boolean;
  canDeleteMedicine: () => boolean;
  canUseReturns: () => boolean;
  canDeleteReturn: () => boolean;
  canViewCustomers: () => boolean;
  appUser: AppUser | null;
  user: { uid: string; email?: string } | null;
  orgSubscriptionTier: SubscriptionTier;
  isViewingAllBranches: boolean;
  isSubscriptionExpired: boolean;
  isSubscriptionExpiringSoon: boolean;
  isTrialSubscription: boolean;
  subscriptionDaysLeft: number | string | null;
  showBranchBreakdown: boolean;
  showOrgInventoryAlerts: boolean;
  useBranchAwareInventoryAlerts: boolean;
  tierUpgradePrompt: TierUpgradePrompt | null;
  transferUpgradeNotice: string | null;
  branchBreakdownUpgradeNotice: string | null;
  medicines: Medicine[];
  branches: PharmacySettings[];
  purchases: PurchaseRecord[];
  returns: ReturnRecord[];
  pharmacyCosts: PharmacyCost[];
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
  activityLogs: ActivityLog[];
  stockMovements: StockMovement[];
  systemUsers: SystemUser[];
  subscriptionRequests: SubscriptionRequest[];
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  branchTransfers: BranchStockTransfer[];
  pharmacySettings: PharmacySettings | null;
  appLogo: string;
  activeBranchId: string | null;
  settingsInitialTab?: SettingsTab;
  settingsForm: SettingsFormState;
  setSettingsForm: Dispatch<SetStateAction<SettingsFormState>>;
  lowStockThreshold: number;
  expiringSoonDays: number;
  lowStockCount: number;
  expiredCount: number;
  expiringCount: number;
  lowStockMedicines: Medicine[];
  expiringSoonMedicines: Medicine[];
  expiredMedicines: Medicine[];
  branchInventoryAlertRows: ReturnType<
    typeof import("../utils/inventoryAlerts").buildBranchInventoryAlertRows
  >;
  dashboardSalesTotal: number;
  dashboardInvoicesCount: number;
  dashboardProfitTotal: number;
  totalInvoicesCount: number;
  totalCustomerRemainingDebt: number;
  totalCustomerPayments: number;
  dashboardBranchRows: ReturnType<typeof import("../utils/branchReports").buildBranchReportRows>;
  pendingBranchTransferGroups: PendingBranchTransferGroup[];
  newMedicine: NewMedicineForm;
  setNewMedicine: Dispatch<SetStateAction<NewMedicineForm>>;
  editingMedicineId: number | null;
  filteredMedicines: Medicine[];
  filteredInvoicesList: Invoice[];
  invoiceSearch: string;
  invoicePaymentFilter: "all" | PaymentMethod;
  invoiceFromDate: string;
  invoiceToDate: string;
  setInvoiceSearch: (value: string) => void;
  setInvoicePaymentFilter: (value: "all" | PaymentMethod) => void;
  setInvoiceFromDate: (value: string) => void;
  setInvoiceToDate: (value: string) => void;
  reportFrom: string;
  reportTo: string;
  setReportFrom: (value: string) => void;
  setReportTo: (value: string) => void;
  filteredReportInvoices: Invoice[];
  filteredReportProfitTotal: number;
  filteredReportTotal: number;
  filteredReportDiscountTotal: number;
  reportUnitsSold: number;
  reportReturnsTotal: number;
  reportCostsTotal: number;
  reportCostsCount: number;
  reportCostsByCategory: { category: string; total: number }[];
  netProfitAfterCosts: number;
  topSellingMedicines: {
    medicineId: number;
    name_ar: string;
    name_en: string;
    quantity: number;
    total: number;
  }[];
  reportPaymentTotals: Record<string, number>;
  reportPaymentBreakdown: { method: string; total: number }[];
  reportSalesTrend: { date: string; total: number }[];
  reportCashierTotals: Record<string, number>;
  reportBranchRows: ReturnType<typeof import("../utils/branchReports").buildBranchReportRows>;
  subscriptionRenewLogs: ActivityLog[];
  pharmacySubscriptionRequests: SubscriptionRequest[];
  cart: CartItem[];
  cartItemsCount: number;
  cartTotalQty: number;
  subtotal: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  isSelling: boolean;
  heldInvoices: import("../types").HeldInvoice[];
  isHolding: boolean;
  currentWorkShiftLabel: string;
  currentWorkShiftId: string;
  activeCashierShift: CashierShift | null;
  setActiveCashierShift: Dispatch<SetStateAction<CashierShift | null>>;
  isOnline: boolean;
  pendingOfflineSalesCount: number;
  offlineMedicinesCacheAt: string | null;
  isSyncingOfflineSales: boolean;
  deletingReturnId: number | string | null;
  customerPaymentModalRequest: number;
  customerSearchSeed: string;
  selectedTenantId: string;
  tenantForm: {
    id: string;
    name: string;
    name_en: string;
    phone: string;
    address: string;
    packageChoice: SubscriptionTier | "custom";
    subscriptionTier: SubscriptionTier;
    maxBranches: number;
    maxUsers: number;
  };
  tenantUserForm: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    uid: string;
    pharmacyId: string;
  };
  creatingTenant: boolean;
  creatingTenantUser: boolean;
  themeMode: ThemeMode;
  fontScale: FontScale;
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
  setFontScale: (scale: FontScale) => void;
  addToCart: (medicine: Medicine) => void;
  changeQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  setDiscount: (value: number) => void;
  setPaymentMethod: (value: PaymentMethod) => void;
  setCustomerName: (value: string) => void;
  completeSale: () => void | Promise<void>;
  handleHoldInvoice: () => void | Promise<void>;
  openHeldInvoicesModal: () => void | Promise<void>;
  setShowInstantReturnModal: (open: boolean) => void;
  saveMedicine: () => Promise<boolean>;
  cancelEditMedicine: () => void;
  openAddMedicineForm: () => void;
  startEditMedicine: (medicine: Medicine) => void;
  deleteMedicine: (medicine: Medicine) => void | Promise<void>;
  handleApplyStockCount: (session: StockCountSession) => void | Promise<void>;
  handleBranchTransferComplete: () => void | Promise<void>;
  printBranchTransferRecords: (records: BranchStockTransfer[]) => void | Promise<void>;
  refreshMedicinesFromDb: () => Promise<void>;
  refreshPurchasesFromDb: () => Promise<void>;
  refreshPharmacyCostsFromDb: () => Promise<void>;
  refreshActivityLogsFromDb: () => Promise<void>;
  refreshBranchTransfers: () => Promise<void>;
  addActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
    pharmacyId?: string;
  }) => Promise<void>;
  exportInventoryCSV: () => void;
  exportInvoicesCSV: () => void;
  exportReturnsCSV: () => void;
  exportBackupCSV: () => void;
  applyReportQuickRange: (preset: ReportQuickRangePreset) => void;
  safeNumber: (value: unknown) => number;
  barcodeCSV: (rows: unknown[]) => string;
  downloadCSV: (filename: string, rows: unknown[][]) => void;
  printSavedInvoice: (invoice: Invoice) => void | Promise<void>;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  setSelectedReturn: (record: ReturnRecord | null) => void;
  openReturnModal: (invoice: Invoice) => void;
  handleDeleteReturn: (record: ReturnRecord) => void | Promise<void>;
  setCustomerPaymentModalRequest: Dispatch<SetStateAction<number>>;
  setCustomerSearchSeed: (value: string) => void;
  handleApproveBranchTransfer: (transferNumber: string) => void | Promise<void>;
  handleRejectBranchTransfer: (transferNumber: string) => void | Promise<void>;
  handleLogoUpload: (file: File | null) => void;
  savePharmacySettings: () => Promise<void>;
  handleSubmitSubscriptionRequest: (input: {
    plan: string;
    days: number;
    amount: number;
  }) => Promise<SubscriptionRequest | null>;
  handleSubmitTierUpgradeRequest: (
    targetTier: SubscriptionTier,
  ) => Promise<SubscriptionRequest | null>;
  handleRequestExpiryNotificationPermission: () => Promise<boolean>;
  handleSendExpiryNotifyNow: () => Promise<void>;
  handleOpenExpiryWhatsappDigest: () => void;
  handleOpenExpiryEmailDigest: () => void;
  setSelectedTenantId: (id: string) => void;
  setTenantForm: Dispatch<SetStateAction<AppPageRouterProps["tenantForm"]>>;
  resetTenantForm: () => void;
  handleCreateTenant: () => Promise<boolean>;
  setTenantUserForm: Dispatch<SetStateAction<AppPageRouterProps["tenantUserForm"]>>;
  resetTenantUserForm: () => void;
  handleCreateTenantUser: () => Promise<boolean>;
  handleCreateOrganizationBranch: (
    anchorPharmacyId: string,
    branch: { id: string; name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  handleUpdateOrganizationBranch: (
    branchId: string,
    branch: { name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  handleDeleteOrganization: (organizationId: string) => Promise<boolean>;
  handleDeleteOrganizationBranch: (branchId: string, organizationId: string) => Promise<boolean>;
  handleDeleteTenantStaff: (target: { uid?: string; employeeId?: string }) => Promise<boolean>;
  handleSwitchTenantView: (pharmacyId: string) => void | Promise<void>;
  handleOpenTenantUsers: (pharmacyId: string) => void | Promise<void>;
  employeesPageTenantScope: string | null;
  handleUpdateTenantStatus: (
    pharmacyId: string,
    status: "active" | "suspended",
  ) => Promise<boolean>;
  handleUpdateOrganizationMaxBranches: (
    organizationId: string,
    maxBranches: number,
  ) => Promise<boolean>;
  handleUpdateOrganizationMaxUsers: (
    organizationId: string,
    maxUsers: number,
  ) => Promise<boolean>;
  handleUpdateSubscriptionTier: (
    organizationId: string,
    tier: SubscriptionTier,
  ) => Promise<boolean>;
  handleApproveSubscriptionRequest: (requestId: number) => Promise<boolean>;
  handleRejectSubscriptionRequest: (requestId: number, note?: string) => Promise<boolean>;
  handleApprovePharmacyLoginAccount: (accountId: string) => Promise<boolean>;
  handleRejectPharmacyLoginAccount: (accountId: string, note?: string) => Promise<boolean>;
  refreshAdminRequestsStable: () => Promise<void>;
  refreshSystemUsersStable: () => Promise<void>;
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
};

export default function AppPageRouter(props: AppPageRouterProps) {
  const {
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
    switchBranch,
    getPharmacyId,
    getPaymentLabel,
    getSubscriptionPlanLabel,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    resolveBranchLabel,
    hasRole,
    canUsePurchases,
    canDeletePurchase,
    canManageCosts,
    canUsePOS,
    canManageInventory,
    canDeleteMedicine,
    canUseReturns,
    canDeleteReturn,
    canViewCustomers,
    appUser,
    user,
    orgSubscriptionTier,
    isViewingAllBranches,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    isTrialSubscription,
    subscriptionDaysLeft,
    showBranchBreakdown,
    showOrgInventoryAlerts,
    useBranchAwareInventoryAlerts,
    tierUpgradePrompt,
    transferUpgradeNotice,
    branchBreakdownUpgradeNotice,
    medicines,
    branches,
    purchases,
    returns,
    pharmacyCosts,
    customerDebts,
    customerPayments,
    activityLogs,
    stockMovements,
    systemUsers,
    subscriptionRequests,
    pendingPharmacyLoginAccounts,
    branchTransfers,
    pharmacySettings,
    appLogo,
    activeBranchId,
    settingsInitialTab,
    settingsForm,
    setSettingsForm,
    lowStockThreshold,
    expiringSoonDays,
    lowStockCount,
    expiredCount,
    expiringCount,
    lowStockMedicines,
    expiringSoonMedicines,
    expiredMedicines,
    branchInventoryAlertRows,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    dashboardProfitTotal,
    totalInvoicesCount,
    totalCustomerRemainingDebt,
    totalCustomerPayments,
    dashboardBranchRows,
    pendingBranchTransferGroups,
    newMedicine,
    setNewMedicine,
    editingMedicineId,
    filteredMedicines,
    filteredInvoicesList,
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
    filteredReportInvoices,
    filteredReportProfitTotal,
    filteredReportTotal,
    filteredReportDiscountTotal,
    reportUnitsSold,
    reportReturnsTotal,
    reportCostsTotal,
    reportCostsCount,
    reportCostsByCategory,
    netProfitAfterCosts,
    topSellingMedicines,
    reportPaymentTotals,
    reportPaymentBreakdown,
    reportSalesTrend,
    reportCashierTotals,
    reportBranchRows,
    subscriptionRenewLogs,
    pharmacySubscriptionRequests,
    cart,
    cartItemsCount,
    cartTotalQty,
    subtotal,
    total,
    discount,
    paymentMethod,
    customerName,
    isSelling,
    heldInvoices,
    isHolding,
    currentWorkShiftLabel,
    currentWorkShiftId,
    activeCashierShift,
    setActiveCashierShift,
    isOnline,
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    deletingReturnId,
    customerPaymentModalRequest,
    customerSearchSeed,
    selectedTenantId,
    tenantForm,
    tenantUserForm,
    creatingTenant,
    creatingTenantUser,
    themeMode,
    fontScale,
    resolvedTheme,
    setThemeMode,
    setFontScale,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    setDiscount,
    setPaymentMethod,
    setCustomerName,
    completeSale,
    handleHoldInvoice,
    openHeldInvoicesModal,
    setShowInstantReturnModal,
    saveMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    startEditMedicine,
    deleteMedicine,
    handleApplyStockCount,
    handleBranchTransferComplete,
    printBranchTransferRecords,
    refreshMedicinesFromDb,
    refreshPurchasesFromDb,
    refreshPharmacyCostsFromDb,
    refreshActivityLogsFromDb,
    refreshBranchTransfers,
    addActivityLog,
    exportInventoryCSV,
    exportInvoicesCSV,
    exportReturnsCSV,
    exportBackupCSV,
    applyReportQuickRange,
    safeNumber,
    barcodeCSV,
    downloadCSV,
    printSavedInvoice,
    setSelectedInvoice,
    setSelectedReturn,
    openReturnModal,
    handleDeleteReturn,
    setCustomerPaymentModalRequest,
    setCustomerSearchSeed,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    handleLogoUpload,
    savePharmacySettings,
    handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest,
    handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest,
    setSelectedTenantId,
    setTenantForm,
    resetTenantForm,
    handleCreateTenant,
    setTenantUserForm,
    resetTenantUserForm,
    handleCreateTenantUser,
    handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch,
    handleDeleteOrganization,
    handleDeleteOrganizationBranch,
    handleDeleteTenantStaff,
    handleSwitchTenantView,
    handleOpenTenantUsers,
    employeesPageTenantScope,
    handleUpdateTenantStatus,
    handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers,
    handleUpdateSubscriptionTier,
    handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest,
    handleApprovePharmacyLoginAccount,
    handleRejectPharmacyLoginAccount,
    refreshAdminRequestsStable,
    refreshSystemUsersStable,
    setBranches,
  } = props;

  return (
    <Suspense
      fallback={
        <PageLoadingCard isArabic={isArabic} />
      }
    >
      {displayPage === "dashboard" && (
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
          totalMedicinesCount={medicines.length}
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
      )}

      {displayPage === "inventory" && (
        <InventoryPage
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
          onApplyStockCount={handleApplyStockCount}
          onOpenPurchasesWithReorder={
            canUsePurchases() && !isSubscriptionExpired
              ? () => setActivePage("purchases")
              : undefined
          }
          userId={user?.uid}
          userName={appUser?.name}
          onFormChange={setNewMedicine}
          onSave={saveMedicine}
          onCancel={cancelEditMedicine}
          onOpenAdd={openAddMedicineForm}
          disabled={isSubscriptionExpired}
          exportInventoryCSV={exportInventoryCSV}
          isSubscriptionExpired={isSubscriptionExpired}
          canManageInventory={canManageInventory()}
          canDeleteMedicine={canDeleteMedicine()}
          onEditMedicine={startEditMedicine}
          onDeleteMedicine={deleteMedicine}
          pharmacyId={getPharmacyId()}
          onReloadMedicines={refreshMedicinesFromDb}
          lowStockThreshold={lowStockThreshold}
          expiringSoonDays={expiringSoonDays}
          branchAwareAlerts={isViewingAllBranches}
          fallbackSettings={pharmacySettings}
        />
      )}

      {displayPage === "purchases" && canOpenPage("purchases") && (
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
      )}

      {displayPage === "costs" && canOpenPage("costs") && (
        <CostsPage
          costs={pharmacyCosts}
          isArabic={isArabic}
          t={t}
          currency={t.currency}
          pharmacyId={getPharmacyId()}
          canManageCosts={canManageCosts()}
          isSubscriptionExpired={isSubscriptionExpired}
          userId={user?.uid}
          userName={appUser?.name}
          onActivityLog={addActivityLog}
          safeNumber={safeNumber}
          downloadCSV={downloadCSV}
          onRefreshCosts={refreshPharmacyCostsFromDb}
        />
      )}

      {displayPage === "pos" && (
        <PosPage
          medicines={medicines}
          filteredMedicines={filteredMedicines}
          t={t}
          isArabic={isArabic}
          currency={t.currency}
          canUsePOS={canUsePOS()}
          canManageInventory={canManageInventory()}
          canDeleteMedicine={canDeleteMedicine()}
          cart={cart}
          cartItemsCount={cartItemsCount}
          cartTotalQty={cartTotalQty}
          subtotal={subtotal}
          total={total}
          discount={discount}
          paymentMethod={paymentMethod}
          customerName={customerName}
          isSelling={isSelling}
          isSubscriptionExpired={isSubscriptionExpired}
          onAddToCart={addToCart}
          onEditMedicine={startEditMedicine}
          onDeleteMedicine={deleteMedicine}
          onDecreaseQty={(id) => changeQty(id, -1)}
          onIncreaseQty={(id) => changeQty(id, 1)}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onDiscountChange={setDiscount}
          onPaymentMethodChange={(value) => setPaymentMethod(value)}
          onCustomerNameChange={setCustomerName}
          onCompleteSale={completeSale}
          getPaymentLabel={getPaymentLabel}
          heldInvoicesCount={heldInvoices.length}
          isHolding={isHolding}
          onHoldInvoice={() => void handleHoldInvoice()}
          onOpenHeldInvoices={() => void openHeldInvoicesModal()}
          onOpenInstantReturn={() => setShowInstantReturnModal(true)}
          lowStockThreshold={lowStockThreshold}
          expiringSoonDays={expiringSoonDays}
          workShiftLabel={currentWorkShiftLabel}
          pharmacyId={getPharmacyId()}
          appUser={appUser}
          activeCashierShift={activeCashierShift}
          pharmacySettings={pharmacySettings}
          workShiftId={currentWorkShiftId}
          onCashierShiftChange={setActiveCashierShift}
          isOnline={isOnline}
          pendingOfflineSalesCount={pendingOfflineSalesCount}
          offlineMedicinesCacheAt={offlineMedicinesCacheAt}
          isSyncingOfflineSales={isSyncingOfflineSales}
        />
      )}

      {displayPage === "invoices" && (
        <InvoicesPage
          filteredInvoicesList={filteredInvoicesList}
          showBranchColumn={isViewingAllBranches}
          getBranchLabel={resolveBranchLabel}
          invoiceSearch={invoiceSearch}
          invoicePaymentFilter={invoicePaymentFilter}
          invoiceFromDate={invoiceFromDate}
          invoiceToDate={invoiceToDate}
          setInvoiceSearch={setInvoiceSearch}
          setInvoicePaymentFilter={setInvoicePaymentFilter}
          setInvoiceFromDate={setInvoiceFromDate}
          setInvoiceToDate={setInvoiceToDate}
          exportInvoicesCSV={exportInvoicesCSV}
          getPaymentLabel={getPaymentLabel}
          onViewInvoice={setSelectedInvoice}
          onReturnInvoice={openReturnModal}
          onPrintInvoice={printSavedInvoice}
          canUseReturns={canUseReturns()}
          t={t}
          isArabic={isArabic}
          currency={t.currency}
        />
      )}

      {displayPage === "returns" && canOpenPage("returns") && (
        <ReturnsPage
          returns={returns}
          filteredInvoicesList={filteredInvoicesList}
          invoiceSearch={invoiceSearch}
          invoicePaymentFilter={invoicePaymentFilter}
          invoiceFromDate={invoiceFromDate}
          invoiceToDate={invoiceToDate}
          setInvoiceSearch={setInvoiceSearch}
          setInvoicePaymentFilter={setInvoicePaymentFilter}
          setInvoiceFromDate={setInvoiceFromDate}
          setInvoiceToDate={setInvoiceToDate}
          exportInvoicesCSV={exportInvoicesCSV}
          exportReturnsCSV={exportReturnsCSV}
          getPaymentLabel={getPaymentLabel}
          getReturnTypeLabel={getReturnTypeLabel}
          getRefundMethodLabel={getRefundMethodLabel}
          getReturnItemsSummary={getReturnItemsSummary}
          onViewReturn={setSelectedReturn}
          onDeleteReturn={(record) => void handleDeleteReturn(record)}
          onViewInvoice={setSelectedInvoice}
          onReturnInvoice={openReturnModal}
          onPrintInvoice={printSavedInvoice}
          canUseReturns={canUseReturns()}
          canDeleteReturn={canDeleteReturn()}
          deletingReturnId={deletingReturnId}
          showBranchColumn={isViewingAllBranches}
          getBranchLabel={resolveBranchLabel}
          t={t}
          isArabic={isArabic}
          currency={t.currency}
          safeNumber={safeNumber}
        />
      )}

      {displayPage === "customers" && canOpenPage("customers") && (
        <CustomersPage
          isArabic={isArabic}
          t={t}
          customerDebts={customerDebts}
          customerPayments={customerPayments}
          appUser={appUser}
          user={user}
          isSubscriptionExpired={isSubscriptionExpired}
          canCollectPayments={canViewCustomers()}
          canDeletePayments={canDeleteCustomerPayments(appUser)}
          getPaymentLabel={getPaymentLabel}
          getPharmacyId={getPharmacyId}
          pharmacySettings={pharmacySettings}
          onActivityLog={addActivityLog}
          onViewInvoice={setSelectedInvoice}
          openPaymentModalRequest={customerPaymentModalRequest}
          onOpenPaymentModalRequestConsumed={() => setCustomerPaymentModalRequest(0)}
          initialCustomerSearch={customerSearchSeed}
          onInitialCustomerSearchConsumed={() => setCustomerSearchSeed("")}
        />
      )}

      {displayPage === "stockMovements" && canOpenPage("stockMovements") && (
        <StockMovementsPage
          isArabic={isArabic}
          t={t}
          movements={stockMovements}
          showBranchColumn={isViewingAllBranches}
          getBranchLabel={resolveBranchLabel}
        />
      )}

      {displayPage === "activityLogs" && canOpenPage("activityLogs") && (
        <ActivityLogsPage
          isArabic={isArabic}
          t={t}
          logs={activityLogs}
          branches={branches}
          showBranchFilter={isViewingAllBranches && branches.length > 1}
          showOrgAudit={isViewingAllBranches && branches.length > 1}
          getBranchLabel={resolveBranchLabel}
          onRefresh={refreshActivityLogsFromDb}
          downloadCSV={downloadCSV}
        />
      )}

      {displayPage === "reports" && canOpenPage("reports") && (
        <ReportsPage
          isArabic={isArabic}
          t={t}
          reportFrom={reportFrom}
          reportTo={reportTo}
          setReportFrom={setReportFrom}
          setReportTo={setReportTo}
          onQuickRange={applyReportQuickRange}
          filteredReportInvoicesCount={filteredReportInvoices.length}
          filteredReportProfitTotal={filteredReportProfitTotal}
          filteredReportTotal={filteredReportTotal}
          filteredReportDiscountTotal={filteredReportDiscountTotal}
          reportUnitsSold={reportUnitsSold}
          reportReturnsTotal={reportReturnsTotal}
          reportCostsTotal={reportCostsTotal}
          reportCostsCount={reportCostsCount}
          reportCostsByCategory={reportCostsByCategory}
          netProfitAfterCosts={netProfitAfterCosts}
          topSellingMedicines={topSellingMedicines}
          reportPaymentTotals={reportPaymentTotals}
          reportPaymentBreakdown={reportPaymentBreakdown}
          reportSalesTrend={reportSalesTrend}
          reportCashierTotals={reportCashierTotals}
          getPaymentLabel={getPaymentLabel}
          currency={t.currency}
          branchReportRows={reportBranchRows}
          showBranchBreakdown={showBranchBreakdown}
          branchBreakdownUpgradeNotice={branchBreakdownUpgradeNotice}
          onOpenSubscriptionSettings={openSubscriptionSettings}
          pharmacyId={getPharmacyId()}
          appUser={appUser}
          pharmacySettings={pharmacySettings}
          medicines={medicines}
        />
      )}

      {displayPage === "users" && canOpenPage("users") && (
        <EmployeesUsersPage
          isArabic={isArabic}
          appUser={appUser}
          pharmacyId={getPharmacyId()}
          pharmacies={branches}
          tenantScopePharmacyId={employeesPageTenantScope}
          currency={settingsForm.currency || "ج.م"}
          currentUid={user?.uid}
          onActivityLog={addActivityLog}
          onOpenSubscriptionSettings={openSubscriptionSettings}
        />
      )}

      {displayPage === "employeePortal" && canOpenPage("employeePortal") && (
        <EmployeePortalPage isArabic={isArabic} appUser={appUser} pharmacyId={getPharmacyId()} />
      )}

      {displayPage === "tenants" && canOpenPage("tenants") && (
        <SuperAdminPage
          isArabic={isArabic}
          operatorUid={appUser?.uid}
          pharmacies={branches}
          systemUsers={systemUsers}
          selectedPharmacyId={selectedTenantId}
          onSelectPharmacy={(id) => {
            setSelectedTenantId(id);
            setTenantUserForm((prev) => ({ ...prev, pharmacyId: id }));
          }}
          onSwitchTenant={handleSwitchTenantView}
          onOpenTenantUsers={handleOpenTenantUsers}
          tenantForm={tenantForm}
          onTenantFormChange={(updates) => setTenantForm({ ...tenantForm, ...updates })}
          onResetTenantForm={resetTenantForm}
          onCreateTenant={handleCreateTenant}
          creatingTenant={creatingTenant}
          onCreateOrganizationBranch={handleCreateOrganizationBranch}
          onUpdateOrganizationBranch={handleUpdateOrganizationBranch}
          onDeleteOrganization={handleDeleteOrganization}
          onDeleteOrganizationBranch={handleDeleteOrganizationBranch}
          onUpdateTenantStatus={handleUpdateTenantStatus}
          onUpdateMaxBranches={handleUpdateOrganizationMaxBranches}
          onUpdateMaxUsers={handleUpdateOrganizationMaxUsers}
          onUpdateSubscriptionTier={handleUpdateSubscriptionTier}
          subscriptionRequests={subscriptionRequests}
          onApproveSubscriptionRequest={handleApproveSubscriptionRequest}
          onRejectSubscriptionRequest={handleRejectSubscriptionRequest}
          pendingPharmacyLoginAccounts={pendingPharmacyLoginAccounts}
          onApprovePharmacyLoginAccount={handleApprovePharmacyLoginAccount}
          onRejectPharmacyLoginAccount={handleRejectPharmacyLoginAccount}
          onRefreshAdminRequests={refreshAdminRequestsStable}
          onRefreshSystemUsers={refreshSystemUsersStable}
        />
      )}

      {displayPage === "sqlMigrations" && canOpenPage("sqlMigrations") && (
        <SqlMigrationsPage isArabic={isArabic} />
      )}

      {displayPage === "branches" && canOpenPage("branches") && (
        <BranchesPage
          isArabic={isArabic}
          t={t}
          appUser={appUser}
          user={user}
          branches={branches}
          setBranches={setBranches}
          activeBranchId={activeBranchId}
          pharmacySettings={pharmacySettings}
          appLogo={appLogo}
          orgSubscriptionTier={orgSubscriptionTier}
          branchTransfers={branchTransfers}
          onRefreshBranchTransfers={refreshBranchTransfers}
          onTransferComplete={handleBranchTransferComplete}
          onSwitchBranch={switchBranch}
          getPharmacyId={getPharmacyId}
          resolveBranchLabel={resolveBranchLabel}
          onActivityLog={addActivityLog}
        />
      )}

      {displayPage === "userGuide" && canOpenPage("userGuide") && (
        <UserGuidePage isArabic={isArabic} />
      )}

      {displayPage === "settings" && canOpenPage("settings") && (
        <SettingsPage
          isArabic={isArabic}
          pharmacyId={getPharmacyId()}
          initialTab={settingsInitialTab}
          t={t}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          isSubscriptionExpired={isSubscriptionExpired}
          isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
          isTrialSubscription={isTrialSubscription}
          getSubscriptionPlanLabel={getSubscriptionPlanLabel}
          subscriptionTierLabel={getSubscriptionTierLabel(orgSubscriptionTier, isArabic)}
          subscriptionTier={orgSubscriptionTier}
          submitSubscriptionRequest={handleSubmitSubscriptionRequest}
          submitTierUpgradeRequest={handleSubmitTierUpgradeRequest}
          pharmacySubscriptionRequests={pharmacySubscriptionRequests}
          hasRole={hasRole}
          subscriptionRenewLogs={subscriptionRenewLogs}
          subscriptionDaysLeft={subscriptionDaysLeft}
          handleLogoUpload={handleLogoUpload}
          savePharmacySettings={savePharmacySettings}
          exportBackupCSV={exportBackupCSV}
          onRequestExpiryNotificationPermission={handleRequestExpiryNotificationPermission}
          onSendExpiryNotifyNow={handleSendExpiryNotifyNow}
          onOpenExpiryWhatsappDigest={handleOpenExpiryWhatsappDigest}
          onOpenExpiryEmailDigest={handleOpenExpiryEmailDigest}
          themeMode={themeMode}
          fontScale={fontScale}
          resolvedTheme={resolvedTheme}
          onThemeModeChange={setThemeMode}
          onFontScaleChange={setFontScale}
        />
      )}
    </Suspense>
  );
}
