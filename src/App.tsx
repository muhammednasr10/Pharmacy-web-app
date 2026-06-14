import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "./services/pharmacyService";
import LoginPage from "./components/LoginPage";
import type { SettingsTab } from "./pages/lazyPages";
import AppShell from "./components/AppShell";
import PageLoadingCard from "./components/PageLoadingCard";
import { LazyAppModals, LazyAppPageRouter } from "./components/lazyAppModules";
import { useAppBindings } from "./hooks/useAppBindings";
import { getShiftDisplayName } from "./utils/workSchedule";
import { useDisplayPreferences } from "./hooks/useDisplayPreferences";
import { useGlobalSearchShortcut } from "./hooks/useGlobalSearchShortcut";
import { useAppPermissions } from "./hooks/useAppPermissions";
import { usePosCart } from "./hooks/usePosCart";
import { usePosSales } from "./hooks/usePosSales";
import { useMedicineManagement } from "./hooks/useMedicineManagement";
import { useReturns } from "./hooks/useReturns";
import { usePharmacySettings } from "./hooks/usePharmacySettings";
import { useSubscriptionRequests } from "./hooks/useSubscriptionRequests";
import { usePharmacyLoginAccounts } from "./hooks/usePharmacyLoginAccounts";
import { useBranchOperations } from "./hooks/useBranchOperations";
import { useSuperAdminTenants } from "./hooks/useSuperAdminTenants";
import { useDataExports } from "./hooks/useDataExports";
import { useAppAuth } from "./hooks/useAppAuth";
import { usePharmacyData } from "./hooks/usePharmacyData";
import { useInventoryDerived } from "./hooks/useInventoryDerived";
import { useBusinessMetrics } from "./hooks/useBusinessMetrics";
import { useSuperAdminNotifications } from "./hooks/useSuperAdminNotifications";
import { useOfflinePosSync } from "./hooks/useOfflinePosSync";
import { useExpiryNotify } from "./hooks/useExpiryNotify";
import { ACTIVE_PAGE_STORAGE_KEY } from "./utils/sessionNavigation";
import { formatDateInput } from "./utils/date";
import { safeNumber } from "./utils/safeNumber";
import { getSubscriptionStatus } from "./utils/subscriptionStatus";
import { medicinesSeed } from "./data/medicinesSeed";
import { appTranslations } from "./i18n/appTranslations";
import type { GlobalSearchResult } from "./utils/globalSearch";
import {
  getPaymentLabel as formatPaymentLabel,
  getSubscriptionPlanLabel as formatSubscriptionPlanLabel,
  showSubscriptionExpiredAlert as alertSubscriptionExpired,
} from "./utils/appLabels";
import { barcodeCSV, downloadCSV } from "./utils/csvExport";
import { useOnlineStatus } from "./utils/useOnlineStatus";
import {
  getAllowedPages,
  isOrgPharmacyAdmin,
  isAccountant,
  isPharmacyManager,
  canApproveBranchStockTransfer,
  canDeleteCustomerPayments,
  canEditOrgWideSettings,
  isBranchManager,
  isSuperAdmin,
} from "./utils/roles";
import { requestOpenReorderModal } from "./utils/reorderSuggestions";
import { isAllBranchesMode } from "./constants/branches";
import { getBranchLabel as formatBranchLabel } from "./utils/branchLabel";
import { getSubscriptionTierLabel, type SubscriptionTier } from "./config/subscriptionTiers";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
  canShowOrgInventoryAlertsWithTier,
  canSwitchBranchesWithTier,
  canTransferStockWithTier,
  canViewBranchBreakdownWithTier,
  filterPagesBySubscriptionTier,
  getTierFeatures,
  getTierUpgradeNotice,
  getTierUpgradePrompt,
  resolveOrganizationTier,
} from "./utils/subscriptionFeatures";
import type {
  ActivityLog,
  AppUser,
  CustomerPayment,
  Invoice,
  InvoiceItem,
  Lang,
  Medicine,
  Page,
  PaymentMethod,
  PharmacyCost,
  PharmacySettings,
  PurchaseRecord,
  HeldInvoice,
  ReturnItem,
  ReturnRecord,
  StockMovement,
  SubscriptionRequest,
  PharmacyLoginAccount,
  BranchStockTransfer,
  SystemUser,
  UserRole,
  CashierShift,
} from "./types";

function App() {
  const { themeMode, fontScale, resolvedTheme, setThemeMode, setFontScale, toggleTheme } =
    useDisplayPreferences();
  const [lang, setLang] = useState<Lang>("ar");
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [customerSearchSeed, setCustomerSearchSeed] = useState("");

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (activePage !== "settings") {
      setSettingsInitialTab(undefined);
    }
  }, [activePage]);

  function openSubscriptionSettings() {
    setSettingsInitialTab("subscription");
    setActivePage("settings");
  }

  const [query, setQuery] = useState("");
  const [posMessage, setPosMessage] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>(medicinesSeed);
  const [orgAlertMedicines, setOrgAlertMedicines] = useState<Medicine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const isOnline = useOnlineStatus();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const heldInvoicesSetterRef = useRef<Dispatch<SetStateAction<HeldInvoice[]>>>(() => {});
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "low" | "expiring" | "expired"
  >("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [invoiceFromDate, setInvoiceFromDate] = useState("");
  const [invoiceToDate, setInvoiceToDate] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [pendingPharmacyLoginAccounts, setPendingPharmacyLoginAccounts] = useState<
    PharmacyLoginAccount[]
  >([]);
  const [reportFrom, setReportFrom] = useState(formatDateInput(new Date()));
  const [reportTo, setReportTo] = useState(formatDateInput(new Date()));
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [pharmacyCosts, setPharmacyCosts] = useState<PharmacyCost[]>([]);
  const [customerPaymentModalRequest, setCustomerPaymentModalRequest] = useState(0);
  const t = appTranslations[lang];
  const isArabic = lang === "ar";
  const [currentWorkShiftId, setCurrentWorkShiftId] = useState<string>("");
  const [currentWorkShiftLabel, setCurrentWorkShiftLabel] = useState<string>("");
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [branches, setBranches] = useState<PharmacySettings[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const { user, appUser, userLoading, loginScreenStatus, loginFormProps, handleLogout } =
    useAppAuth({ isArabic, activeBranchId, setActiveBranchId });
  const [branchTransfers, setBranchTransfers] = useState<BranchStockTransfer[]>([]);
  const [availabilityModal, setAvailabilityModal] = useState<{
    medicine: Medicine;
    rows: Array<{
      pharmacyId: string;
      qty: number;
      expiry?: string;
      price?: number;
    }>;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("main");
  const [employeesPageTenantScope, setEmployeesPageTenantScope] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    packageChoice: "basic" as SubscriptionTier | "custom",
    subscriptionTier: "basic" as SubscriptionTier,
    maxBranches: 1,
    maxUsers: 5,
  });
  const [tenantUserForm, setTenantUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "pharmacy_admin" as UserRole,
    uid: "",
    pharmacyId: "",
  });
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [creatingTenantUser, setCreatingTenantUser] = useState(false);

  const [dashboardPeriod, setDashboardPeriod] = useState<"today" | "7days" | "month" | "custom">(
    "today",
  );

  const [dashboardFromDate, setDashboardFromDate] = useState(formatDateInput(new Date()));

  const [dashboardToDate, setDashboardToDate] = useState(formatDateInput(new Date()));
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings | null>(null);
  const appLogo = pharmacySettings?.logoBase64 || "/icon.svg";
  const writeBranchLabel = useMemo(() => {
    const writeId = appUser?.pharmacyId || "main";
    const branch = branches.find((item) => item.id === writeId);
    if (!branch) return writeId;
    return (isArabic ? branch.name : branch.name_en) || branch.name;
  }, [branches, appUser?.pharmacyId, isArabic]);
  const resolveBranchLabel = useCallback(
    (branchId: string | undefined) => formatBranchLabel(branchId, branches, isArabic),
    [branches, isArabic],
  );
  const orgSubscriptionTier = useMemo(
    () => resolveOrganizationTier(branches, appUser?.pharmacyId),
    [branches, appUser?.pharmacyId],
  );
  const showBranchBreakdown = useMemo(
    () => canViewBranchBreakdownWithTier(appUser, orgSubscriptionTier, branches.length),
    [appUser, orgSubscriptionTier, branches.length],
  );
  const orgTierFeatures = useMemo(
    () => getTierFeatures(orgSubscriptionTier),
    [orgSubscriptionTier],
  );
  const tierUpgradePrompt = useMemo(
    () => getTierUpgradePrompt(appUser, orgSubscriptionTier, isArabic),
    [appUser, orgSubscriptionTier, isArabic],
  );
  const transferUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchTransfers",
        isArabic,
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic],
  );
  const branchBreakdownUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchBreakdownReports",
        isArabic,
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic],
  );
  const isViewingAllBranches = useMemo(
    () =>
      isAllBranchesMode(activeBranchId) &&
      canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length),
    [activeBranchId, appUser, orgSubscriptionTier, branches.length],
  );
  const {
    cart,
    setCart,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    customerName,
    setCustomerName,
    subtotal,
    safeDiscount,
    total,
    cartItemsCount,
    cartTotalQty,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    resetCart,
  } = usePosCart({
    medicines,
    isArabic,
    isViewingAllBranches,
    isOnline,
  });

  const getPharmacyId = useCallback(() => {
    if (activeBranchId && !isAllBranchesMode(activeBranchId)) {
      return activeBranchId;
    }
    return appUser?.pharmacyId || "default-pharmacy";
  }, [activeBranchId, appUser?.pharmacyId]);

  const refreshMedicinesFromDb = useCallback(async () => {
    setMedicines(await pharmacyService.getMedicines());
  }, []);

  const addActivityLog = useCallback(
    async (data: {
      type: string;
      title: string;
      description: string;
      referenceType?: string;
      referenceId?: string;
      pharmacyId?: string;
    }) => {
      try {
        const logId = Date.now();
        const logRecord: ActivityLog = {
          id: logId,
          type: data.type,
          title: data.title,
          description: data.description,
          referenceType: data.referenceType || "",
          referenceId: data.referenceId || "",
          pharmacyId: data.pharmacyId || getPharmacyId(),
          userId: user?.uid || "",
          userName: appUser?.name || "",
          createdAt: new Date().toISOString(),
        };
        await pharmacyService.addActivityLog(logRecord);
      } catch (error) {
        console.error("Activity log error:", error);
      }
    },
    [appUser?.name, getPharmacyId, user?.uid],
  );

  const refreshActiveCashierShift = useCallback(async () => {
    const pharmacyId = getPharmacyId();
    const uid = appUser?.uid;
    if (!pharmacyId || !uid || isAllBranchesMode(pharmacyId)) {
      setActiveCashierShift(null);
      return null;
    }
    const shift = await pharmacyService.getOpenCashierShift(pharmacyId, uid);
    setActiveCashierShift(shift);
    return shift;
  }, [appUser?.uid, getPharmacyId]);

  const branchTransferGroups = useMemo(() => {
    const grouped = new Map<string, BranchStockTransfer[]>();
    for (const row of branchTransfers) {
      const list = grouped.get(row.transferNumber) || [];
      list.push(row);
      grouped.set(row.transferNumber, list);
    }
    return Array.from(grouped.entries()).map(([transferNumber, items]) => ({
      transferNumber,
      items,
      fromPharmacyId: items[0]?.fromPharmacyId,
      toPharmacyId: items[0]?.toPharmacyId,
      createdAt: items[0]?.createdAt,
      status: items[0]?.status || "completed",
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }, [branchTransfers]);
  const pendingBranchTransferGroups = useMemo(() => {
    if (!canReviewBranchTransfersWithTier(appUser, orgSubscriptionTier, branches.length)) {
      return [];
    }
    return branchTransferGroups.filter(
      (group) =>
        group.status === "pending" &&
        group.toPharmacyId &&
        canApproveBranchStockTransfer(appUser, group.toPharmacyId),
    );
  }, [branchTransferGroups, appUser, orgSubscriptionTier, branches.length]);
  const completedBranchTransferGroups = useMemo(
    () => branchTransferGroups.filter((group) => group.status !== "pending"),
    [branchTransferGroups],
  );

  const onOpenInventoryExpiryView = useCallback(() => {
    setActivePage("inventory");
    setInventoryStatusFilter("expiring");
    setQuery("");
  }, []);

  const {
    settingsForm,
    setSettingsForm,
    handleLogoUpload,
    savePharmacySettings,
    handleRequestExpiryNotificationPermission,
    handleSendExpiryNotifyNow,
    handleOpenExpiryWhatsappDigest,
    handleOpenExpiryEmailDigest,
  } = usePharmacySettings({
    isArabic,
    appUser,
    pharmacySettings,
    setPharmacySettings,
    medicines,
    branches,
    getPharmacyId,
    addActivityLog,
    onOpenInventoryExpiryView,
  });

  const { refreshPurchasesFromDb, refreshActivityLogsFromDb, refreshPharmacyCostsFromDb } =
    usePharmacyData({
      appUser,
      activeBranchId,
      branches,
      isViewingAllBranches,
      medicinesSeed,
      heldInvoicesSetterRef,
      setBranches,
      setPharmacySettings,
      setSettingsForm,
      setMedicines,
      setInvoices,
      setReturns,
      setPurchases,
      setCustomerPayments,
      setPharmacyCosts,
      setStockMovements,
      setActivityLogs,
      setSubscriptionRequests,
      setPendingPharmacyLoginAccounts,
      setSystemUsers,
    });

  const {
    handleSubmitSubscriptionRequest,
    handleSubmitTierUpgradeRequest,
    handleApproveSubscriptionRequest,
    handleRejectSubscriptionRequest,
  } = useSubscriptionRequests({
    isArabic,
    appUser,
    subscriptionRequests,
    setSubscriptionRequests,
    branches,
    setBranches,
    settingsForm,
    setSettingsForm,
    pharmacySettings,
    getPharmacyId,
    addActivityLog,
  });

  const { handleApprovePharmacyLoginAccount, handleRejectPharmacyLoginAccount } =
    usePharmacyLoginAccounts({
      isArabic,
      appUser,
      pendingPharmacyLoginAccounts,
      setPendingPharmacyLoginAccounts,
      addActivityLog,
    });

  const {
    refreshBranchTransfers,
    handleBranchTransferComplete,
    handleApproveBranchTransfer,
    handleRejectBranchTransfer,
    printBranchTransferRecords,
    switchBranch,
  } = useBranchOperations({
    isArabic,
    appUser,
    user,
    branches,
    pharmacySettings,
    appLogo,
    activeBranchId,
    setBranchTransfers,
    setActiveBranchId,
    setIsMenuOpen,
    refreshMedicinesFromDb,
    setStockMovements,
    resetCart,
  });

  const {
    resetTenantForm,
    resetTenantUserForm,
    handleCreateTenant,
    handleCreateTenantUser,
    handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch,
    handleDeleteOrganization,
    handleDeleteOrganizationBranch,
    handleDeleteTenantStaff,
    handleUpdateSubscriptionTier,
    handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers,
    handleUpdateTenantStatus,
    handleSwitchTenantView,
    handleOpenTenantUsers,
  } = useSuperAdminTenants({
    isArabic,
    appUser,
    branches,
    setBranches,
    setSystemUsers,
    selectedTenantId,
    setSelectedTenantId,
    tenantForm,
    setTenantForm,
    tenantUserForm,
    setTenantUserForm,
    setCreatingTenant,
    setCreatingTenantUser,
    activeBranchId,
    setActiveBranchId,
    setActivePage,
  });

  const openTenantEmployeesPage = useCallback(
    (pharmacyId: string) => {
      setEmployeesPageTenantScope(pharmacyId);
      handleOpenTenantUsers(pharmacyId);
    },
    [handleOpenTenantUsers],
  );

  useEffect(() => {
    if (activePage !== "users") {
      setEmployeesPageTenantScope(null);
    }
  }, [activePage]);

  useEffect(() => {
    if (!appUser) {
      pharmacyService.setPharmacyCustomRoles([]);
      return;
    }
    void pharmacyService.loadPharmacyRoleAccessIntoScope(appUser, branches).catch((error) => {
      console.error("[RoleAccess] load failed", error);
    });
  }, [appUser?.uid, appUser?.pharmacyId, branches]);

  useEffect(() => {
    if (!appUser) return;
    void pharmacyService.loadSubscriptionTierConfigs().catch((error) => {
      console.error("[SubscriptionTiers] load failed", error);
    });
    return pharmacyService.subscribeSubscriptionTierConfigs(() => {
      /* cache updated globally */
    });
  }, [appUser?.uid]);

  useEffect(() => {
    if (!appUser) return;
    const savedPage = sessionStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) as Page | null;
    if (!savedPage) return;
    const page = savedPage === "hr" ? "users" : savedPage;
    if (getAllowedPages(appUser).includes(page)) {
      setActivePage(page);
    }
  }, [appUser?.uid]);

  useEffect(() => {
    if (!appUser) return;
    sessionStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
  }, [activePage, appUser]);

  useEffect(() => {
    if (!appUser || branches.length === 0) return;
    const canSwitch = canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length);
    if (!canSwitch) {
      if (
        isAllBranchesMode(activeBranchId) ||
        (activeBranchId && activeBranchId !== appUser.pharmacyId)
      ) {
        setActiveBranchId(appUser.pharmacyId);
      }
      return;
    }
    const validIds = new Set(branches.map((branch) => branch.id));
    if (isAllBranchesMode(activeBranchId)) {
      if (branches.length <= 1) {
        setActiveBranchId(appUser.pharmacyId);
      }
      return;
    }
    if (activeBranchId && !validIds.has(activeBranchId)) {
      setActiveBranchId(appUser.pharmacyId);
    }
  }, [branches, appUser, activeBranchId, orgSubscriptionTier]);

  const showOrgInventoryAlerts = canShowOrgInventoryAlertsWithTier(
    appUser,
    orgSubscriptionTier,
    branches.length,
  );

  useEffect(() => {
    if (!showOrgInventoryAlerts) {
      setOrgAlertMedicines([]);
      return;
    }

    let cancelled = false;
    const branchIds = branches.map((branch) => branch.id);

    void pharmacyService.getMedicinesForPharmacies(branchIds).then((rows) => {
      if (!cancelled) setOrgAlertMedicines(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [showOrgInventoryAlerts, branches, medicines]);

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

  useEffect(() => {
    const shouldLoadOrgHistory =
      activePage === "branches" &&
      branches.length > 1 &&
      canManageOrgBranchesWithTier(appUser, orgSubscriptionTier);
    const shouldLoadPendingReview = canReviewBranchTransfersWithTier(
      appUser,
      orgSubscriptionTier,
      branches.length,
    );
    if (!shouldLoadOrgHistory && !shouldLoadPendingReview) return;
    void refreshBranchTransfers();
  }, [activePage, branches.length, appUser?.uid, activeBranchId, orgSubscriptionTier]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      setAvailabilityModal(null);
      setSelectedInvoice(null);
      setSelectedReturn(null);
      setReturnInvoice(null);
      setGlobalSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useGlobalSearchShortcut({
    enabled: Boolean(user && appUser),
    isOpen: globalSearchOpen,
    onOpen: () => setGlobalSearchOpen(true),
    onClose: () => setGlobalSearchOpen(false),
  });

  const allowedPages = useMemo(() => {
    if (!appUser) return [];
    return filterPagesBySubscriptionTier(getAllowedPages(appUser), appUser, orgSubscriptionTier);
  }, [appUser, orgSubscriptionTier]);

  const displayPage = useMemo((): Page => {
    if (!appUser) return activePage;
    if (activePage === "hr") return "users";
    if (allowedPages.includes(activePage)) return activePage;
    return allowedPages[0] || "dashboard";
  }, [appUser, activePage, allowedPages]);

  const adminNavBadges = useMemo((): Partial<Record<Page, number>> | undefined => {
    if (!isSuperAdmin(appUser)) return undefined;
    const pendingSubscriptions = subscriptionRequests.filter(
      (request) => request.status === "pending",
    ).length;
    const pendingTotal = pendingSubscriptions + pendingPharmacyLoginAccounts.length;
    if (pendingTotal <= 0) return undefined;
    return { tenants: pendingTotal };
  }, [appUser, subscriptionRequests, pendingPharmacyLoginAccounts.length]);

  useLayoutEffect(() => {
    if (!appUser) return;
    if (displayPage !== activePage) {
      setActivePage(displayPage);
    }
  }, [appUser, displayPage, activePage]);

  const refreshAdminRequestsStable = useCallback(async () => {
    if (!isSuperAdmin(appUser)) return;
    setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
    setPendingPharmacyLoginAccounts(
      await pharmacyService.getAllPharmacyLoginAccounts({
        pendingApproval: true,
      }),
    );
  }, [appUser?.uid]);

  const refreshSystemUsersStable = useCallback(async () => {
    if (!isSuperAdmin(appUser)) return;
    setSystemUsers(await pharmacyService.getAllSystemUsers());
  }, [appUser?.uid]);

  useEffect(() => {
    if (!appUser || !isSuperAdmin(appUser)) return;
    if (activePage !== "tenants") return;
    void refreshAdminRequestsStable();
  }, [activePage, appUser?.uid, refreshAdminRequestsStable]);

  useEffect(() => {
    if (!appUser) {
      setCurrentWorkShiftId("");
      setCurrentWorkShiftLabel("");
      return;
    }
    void pharmacyService.resolveWorkShiftForUser(appUser).then((ctx) => {
      if (!ctx) {
        setCurrentWorkShiftId("");
        setCurrentWorkShiftLabel("");
        return;
      }
      setCurrentWorkShiftId(ctx.shiftId);
      setCurrentWorkShiftLabel(getShiftDisplayName(ctx.shiftId, ctx.shifts, isArabic));
    });
  }, [appUser, isArabic]);

  const onOpenTenants = useCallback(() => {
    setActivePage("tenants");
    setIsMenuOpen(false);
  }, []);

  useSuperAdminNotifications({
    appUser,
    subscriptionRequests,
    isArabic,
    onOpenTenants,
  });

  const {
    subscriptionDaysLeft,
    isSubscriptionExpired,
    isSubscriptionExpiringSoon,
    isTrialSubscription,
  } = useMemo(() => getSubscriptionStatus(pharmacySettings), [pharmacySettings]);

  const {
    hasRole,
    canUseSystemActions,
    canManageInventory,
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
    canOpenPage,
  } = useAppPermissions(appUser, isSubscriptionExpired);

  function getPaymentLabel(method: string) {
    return formatPaymentLabel(method, isArabic);
  }

  function getSubscriptionPlanLabel(plan: string) {
    return formatSubscriptionPlanLabel(plan, isArabic);
  }

  function showSubscriptionExpiredAlert() {
    alertSubscriptionExpired(isArabic);
  }

  const {
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  } = useOfflinePosSync({
    isOnline,
    isArabic,
    appUser,
    activeBranchId,
    medicines,
    setMedicines,
    activeCashierShift,
    getPharmacyId,
    refreshMedicinesFromDb,
    refreshActiveCashierShift,
  });

  const {
    isSelling,
    heldInvoices,
    setHeldInvoices,
    showHeldInvoicesModal,
    setShowHeldInvoicesModal,
    isHolding,
    isHeldInvoiceProcessing,
    printSavedInvoice,
    completeSale,
    refreshHeldInvoices,
    openHeldInvoicesModal,
    handleHoldInvoice,
    handleResumeHeldInvoice,
    handleDeleteHeldInvoice,
  } = usePosSales({
    isArabic,
    t,
    appUser,
    user,
    medicines,
    setMedicines,
    pharmacySettings,
    activeCashierShift,
    currentWorkShiftId,
    cart,
    discount,
    subtotal,
    safeDiscount,
    total,
    paymentMethod,
    customerName,
    setCart,
    setDiscount,
    setPaymentMethod,
    setCustomerName,
    resetCart,
    getPharmacyId,
    getPaymentLabel,
    canUseSystemActions,
    canUsePOS,
    showSubscriptionExpiredAlert,
    addActivityLog,
    refreshMedicinesFromDb,
    refreshActiveCashierShift,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  });

  heldInvoicesSetterRef.current = setHeldInvoices;

  const {
    newMedicine,
    setNewMedicine,
    editingMedicineId,
    saveMedicine,
    handleApplyStockCount,
    startEditMedicine,
    cancelEditMedicine,
    openAddMedicineForm,
    deleteMedicine,
  } = useMedicineManagement({
    isArabic,
    medicines,
    setMedicines,
    setStockMovements,
    appUser,
    user,
    getPharmacyId,
    addActivityLog,
    canUseSystemActions,
    canManageInventory,
    canDeleteMedicine,
    showSubscriptionExpiredAlert,
    onNavigateToInventory: () => setActivePage("inventory"),
  });

  const {
    selectedReturn,
    setSelectedReturn,
    returnInvoice,
    setReturnInvoice,
    returnQuantities,
    setReturnQuantities,
    isReturning,
    deletingReturnId,
    showInstantReturnModal,
    setShowInstantReturnModal,
    getReturnedQtyForInvoice,
    getAvailableReturnQty,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
    openInvoiceByNumber,
    openReturnModal,
    completeReturn,
    handleDeleteReturn,
    handleInstantReturnSuccess,
  } = useReturns({
    isArabic,
    t,
    returns,
    setReturns,
    invoices,
    appUser,
    user,
    discount,
    setDiscount,
    getPharmacyId,
    addActivityLog,
    canUseSystemActions,
    canUseReturns,
    canDeleteReturn,
    showSubscriptionExpiredAlert,
    refreshMedicinesFromDb,
    setStockMovements,
    onViewInvoice: setSelectedInvoice,
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

  useEffect(() => {
    void refreshActiveCashierShift();
  }, [refreshActiveCashierShift]);

  const goToCustomerPaymentForm = useCallback(() => {
    setActivePage("customers");
    setCustomerPaymentModalRequest((count) => count + 1);
  }, []);

  const handleGlobalSearchSelect = useCallback(
    (result: GlobalSearchResult) => {
      setGlobalSearchOpen(false);
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
            addToCart(result.medicine);
          }
          break;
        case "invoice":
          setSelectedInvoice(result.invoice);
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
    [addToCart, allowedPages, canUsePOS],
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
    handleOpenTenantUsers: openTenantEmployeesPage,
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
    lang,
    invoices,
    selectedReturn,
    selectedInvoice,
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
    globalSearchOpen,
    setGlobalSearchOpen,
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
  });

  if (loginScreenStatus) {
    return (
      <LoginPage
        status={loginScreenStatus}
        {...loginFormProps}
        isArabic={isArabic}
        t={t}
        onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
        themeMode={themeMode}
        fontScale={fontScale}
        resolvedTheme={resolvedTheme}
        onThemeModeChange={setThemeMode}
        onFontScaleChange={setFontScale}
        onToggleTheme={toggleTheme}
        onLogout={loginScreenStatus === "denied" ? handleLogout : undefined}
      />
    );
  }

  return (
    <AppShell
      {...appShellProps}
      children={
        <Suspense fallback={<PageLoadingCard isArabic={isArabic} />}>
          <LazyAppPageRouter {...pageRouterProps} />
        </Suspense>
      }
      modals={
        <Suspense fallback={null}>
          <LazyAppModals {...appModalsProps} />
        </Suspense>
      }
    />
  );
}

export default App;
