import type { Dispatch, SetStateAction } from "react";
import type { AppTranslation } from "../../i18n/appTranslations";
import type { FontScale, ThemeMode } from "../../utils/displayPreferences";
import type { ReportQuickRangePreset } from "../../utils/reportDateRange";
import type { StockCountSession } from "../../utils/stockCount";
import type { SettingsFormState } from "../../utils/pharmacySettingsForm";
import type { SubscriptionTier } from "../../config/subscriptionTiers";
import type { TierUpgradePrompt } from "../../utils/subscriptionFeatures";
import type { SettingsTab } from "../../pages/lazyPages";
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
  PharmacyCustomRole,
  PharmacySettings,
  PurchaseRecord,
  ReportsTab,
  ReturnRecord,
  StockMovement,
  SubscriptionRequest,
  SystemUser,
  UserRole,
} from "../../types";

export type PendingBranchTransferGroup = {
  transferNumber: string;
  fromPharmacyId: string;
  toPharmacyId?: string;
  status: string;
  createdAt?: string;
  totalQty: number;
  items?: import("../../types").BranchStockTransfer[];
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
  canViewInventoryCostProfit: boolean;
  canViewPosCostProfit: boolean;
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
  pendingCustomRoles: PharmacyCustomRole[];
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
    typeof import("../../utils/inventoryAlerts").buildBranchInventoryAlertRows
  >;
  dashboardSalesTotal: number;
  dashboardInvoicesCount: number;
  dashboardProfitTotal: number;
  totalInvoicesCount: number;
  totalMedicinesCount: number;
  totalCustomerRemainingDebt: number;
  totalCustomerPayments: number;
  dashboardBranchRows: ReturnType<typeof import("../../utils/branchReports").buildBranchReportRows>;
  pendingBranchTransferGroups: PendingBranchTransferGroup[];
  newMedicine: NewMedicineForm;
  setNewMedicine: Dispatch<SetStateAction<NewMedicineForm>>;
  editingMedicineId: number | null;
  filteredMedicines: Medicine[];
  filteredInvoicesList: Invoice[];
  invoices: Invoice[];
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
  reportsTab: ReportsTab;
  setReportsTab: Dispatch<SetStateAction<ReportsTab>>;
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
  reportBranchRows: ReturnType<typeof import("../../utils/branchReports").buildBranchReportRows>;
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
  heldInvoices: import("../../types").HeldInvoice[];
  isHolding: boolean;
  showHeldInvoicesModal: boolean;
  setShowHeldInvoicesModal: Dispatch<SetStateAction<boolean>>;
  isHeldInvoiceProcessing: boolean;
  handleResumeHeldInvoice: (held: import("../../types").HeldInvoice) => void | Promise<void>;
  handleDeleteHeldInvoice: (held: import("../../types").HeldInvoice) => void | Promise<void>;
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
  handleHoldInvoice: () => void | Promise<void | import("../../hooks/usePosSales").PosActionFeedback>;
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
  handleUpdateOrganizationFreeTrial: (
    organizationId: string,
    params: { enabled: boolean; endDate: string },
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
  refreshPharmacies: () => Promise<void>;
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
};
