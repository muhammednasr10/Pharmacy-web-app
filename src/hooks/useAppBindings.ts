import type { Dispatch, SetStateAction } from "react";
import type { AppPageRouterProps } from "../components/AppPageRouter";
import type { AppModalsProps } from "../components/AppModals";
import type { AppShellProps } from "../components/AppShell";
import type { AlertItem } from "../components/Topbar";
import type { GlobalSearchResult } from "../utils/globalSearch";
import type {
  HeldInvoice,
  Invoice,
  InvoiceItem,
  Lang,
  Medicine,
  Page,
  PharmacySettings,
  ReturnRecord,
} from "../types";
import { resolveBranchDisplay } from "../utils/branchDisplay";

type AvailabilityModalState = {
  medicine: Medicine;
  rows: Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>;
};

export type UseAppBindingsInput = AppPageRouterProps & {
  lang: Lang;
  invoices: Invoice[];
  selectedReturn: ReturnRecord | null;
  selectedInvoice: Invoice | null;
  availabilityModal: AvailabilityModalState | null;
  availabilityLoading: boolean;
  setAvailabilityModal: Dispatch<SetStateAction<AvailabilityModalState | null>>;
  returnInvoice: Invoice | null;
  setReturnInvoice: Dispatch<SetStateAction<Invoice | null>>;
  returnQuantities: Record<number, number>;
  setReturnQuantities: Dispatch<SetStateAction<Record<number, number>>>;
  showHeldInvoicesModal: boolean;
  setShowHeldInvoicesModal: Dispatch<SetStateAction<boolean>>;
  showInstantReturnModal: boolean;
  globalSearchFocusToken: number;
  isHeldInvoiceProcessing: boolean;
  isReturning: boolean;
  handleResumeHeldInvoice: (held: HeldInvoice) => void | Promise<void>;
  handleDeleteHeldInvoice: (held: HeldInvoice) => void | Promise<void>;
  handleInstantReturnSuccess: AppModalsProps["handleInstantReturnSuccess"];
  getReturnedQtyForInvoice: (invoiceNumber: string, medicineId: number) => number;
  getAvailableReturnQty: (invoice: Invoice, item: InvoiceItem) => number;
  completeReturn: () => void;
  openInvoiceByNumber: (invoiceNumber: string) => void;
  handleGlobalSearchSelect: (result: GlobalSearchResult) => void;
  adminNavBadges?: Partial<Record<Page, number>>;
  alertItems: AlertItem[];
  alertTotal: number;
  writeBranchLabel: string;
  isMenuOpen: boolean;
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>;
  setLang: Dispatch<SetStateAction<Lang>>;
  toggleTheme: () => void;
  handleLogout: () => void;
  isOnline?: boolean;
  pendingOfflineSalesCount?: number;
  appDataCacheAt?: string | null;
  isSyncingOfflineSales?: boolean;
  subscriptionReadOnly?: boolean;
  subscriptionEndDate?: string;
};

export type AppShellBindings = Omit<AppShellProps, "children" | "modals">;

export type AppBindingsResult = {
  pageRouterProps: AppPageRouterProps;
  appModalsProps: AppModalsProps;
  appShellProps: AppShellBindings;
};

function computeTopbarPharmacyTitle(
  isArabic: boolean,
  pharmacySettings: PharmacySettings | null,
  isViewingAllBranches: boolean,
  activeBranchId: string | null,
  branches: PharmacySettings[],
): string {
  const baseName = isArabic
    ? pharmacySettings?.name || "صيدلية Focus"
    : pharmacySettings?.name_en || pharmacySettings?.name || "Focus Pharmacy";
  if (isViewingAllBranches) {
    return isArabic ? `${baseName} — كل الفروع` : `${baseName} — All branches`;
  }
  if (activeBranchId && branches.length > 1) {
    const display = resolveBranchDisplay(activeBranchId, branches, isArabic);
    if (!display.isMainSite) {
      return `${display.organizationName} — ${display.branchSiteName}`;
    }
  }
  return baseName;
}

export function useAppBindings(input: UseAppBindingsInput): AppBindingsResult {
  const {
    lang,
    invoices,
    availabilityModal,
    availabilityLoading,
    setAvailabilityModal,
    returnInvoice,
    setReturnInvoice,
    returnQuantities,
    setReturnQuantities,
    showHeldInvoicesModal,
    setShowHeldInvoicesModal,
    showInstantReturnModal,
    globalSearchFocusToken,
    isHeldInvoiceProcessing,
    isReturning,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
    handleInstantReturnSuccess,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    completeReturn,
    openInvoiceByNumber,
    handleGlobalSearchSelect,
    adminNavBadges,
    alertItems,
    alertTotal,
    writeBranchLabel,
    isMenuOpen,
    setIsMenuOpen,
    setLang,
    toggleTheme,
    handleLogout,
    selectedReturn,
    selectedInvoice,
    setSelectedReturn,
    setSelectedInvoice,
    setShowInstantReturnModal,
    setActivePage,
    setInventoryStatusFilter,
    ...routerFields
  } = input;

  const pageRouterProps: AppPageRouterProps = {
    ...routerFields,
    invoices,
    setSelectedReturn,
    setSelectedInvoice,
    setShowInstantReturnModal,
    setActivePage,
    setInventoryStatusFilter,
  };

  const appModalsProps: AppModalsProps = {
    isArabic: input.isArabic,
    t: input.t,
    appUser: input.appUser,
    user: input.user,
    branches: input.branches,
    activeBranchId: input.activeBranchId,
    lowStockThreshold: input.lowStockThreshold,
    allowedPages: input.allowedPages,
    medicines: input.medicines,
    invoices,
    customerDebts: input.customerDebts,
    cart: input.cart,
    availabilityModal,
    availabilityLoading,
    onCloseAvailability: () => setAvailabilityModal(null),
    selectedReturn,
    onCloseReturn: () => setSelectedReturn(null),
    openInvoiceByNumber,
    handleDeleteReturn: input.handleDeleteReturn,
    canDeleteReturn: input.canDeleteReturn(),
    deletingReturnId: input.deletingReturnId,
    selectedInvoice,
    onCloseInvoice: () => setSelectedInvoice(null),
    printSavedInvoice: input.printSavedInvoice,
    getPaymentLabel: input.getPaymentLabel,
    safeNumber: input.safeNumber,
    getReturnTypeLabel: input.getReturnTypeLabel,
    getRefundMethodLabel: input.getRefundMethodLabel,
    returnInvoice,
    onCloseReturnInvoice: () => setReturnInvoice(null),
    returnQuantities,
    setReturnQuantities,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    completeReturn,
    isReturning,
    showHeldInvoicesModal,
    onCloseHeldInvoices: () => setShowHeldInvoicesModal(false),
    heldInvoices: input.heldInvoices,
    isHeldInvoiceProcessing,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
    showInstantReturnModal,
    onCloseInstantReturn: () => setShowInstantReturnModal(false),
    handleInstantReturnSuccess,
    getAvailableReturnQtyForInstant: getAvailableReturnQty,
  };

  const appShellProps: AppShellBindings = {
    isArabic: input.isArabic,
    lang,
    t: input.t,
    resolvedTheme: input.resolvedTheme,
    displayPage: input.displayPage,
    allowedPages: input.allowedPages,
    adminNavBadges,
    topbarPharmacyTitle: computeTopbarPharmacyTitle(
      input.isArabic,
      input.pharmacySettings,
      input.isViewingAllBranches,
      input.activeBranchId,
      input.branches,
    ),
    writeBranchLabel,
    isViewingAllBranches: input.isViewingAllBranches,
    branchesCount: input.branches.length,
    pharmacySettings: input.pharmacySettings,
    appLogo: input.appLogo,
    appUser: input.appUser,
    orgSubscriptionTier: input.orgSubscriptionTier,
    branches: input.branches,
    activeBranchId: input.activeBranchId,
    alertItems,
    alertTotal,
    isMenuOpen,
    onToggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
    onToggleTheme: toggleTheme,
    globalSearchAllowedPages: input.allowedPages,
    medicines: input.medicines,
    invoices,
    customerDebts: input.customerDebts,
    canSearchMedicines:
      input.allowedPages.includes("inventory") || input.allowedPages.includes("pos"),
    canSearchInvoices: input.allowedPages.includes("invoices"),
    canSearchCustomers: input.allowedPages.includes("customers"),
    onGlobalSearchSelect: handleGlobalSearchSelect,
    globalSearchFocusToken,
    onLogout: handleLogout,
    onToggleMenu: () => setIsMenuOpen((value) => !value),
    onSwitchBranch: input.switchBranch,
    onSelectPage: setActivePage,
    onAlertNavigate: (filter) => {
      setActivePage("inventory");
      setInventoryStatusFilter(filter);
      setIsMenuOpen(false);
    },
    onCloseMenu: () => setIsMenuOpen(false),
    resolveBranchLabel: input.resolveBranchLabel,
    onOpenSubscriptionSettings: input.openSubscriptionSettings,
    tierUpgradePrompt: input.tierUpgradePrompt,
    isOnline: input.isOnline,
    pendingOfflineSalesCount: input.pendingOfflineSalesCount,
    appDataCacheAt: input.appDataCacheAt,
    isSyncingOfflineSales: input.isSyncingOfflineSales,
    subscriptionReadOnly: input.subscriptionReadOnly,
    subscriptionEndDate: input.subscriptionEndDate,
  };

  return { pageRouterProps, appModalsProps, appShellProps };
}
