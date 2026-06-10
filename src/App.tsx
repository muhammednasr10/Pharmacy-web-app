import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as pharmacyService from "./services/pharmacyService";
import "./styles.css";
import { ARABIC_FONT_BASE64 } from "./arabicFont";
import { LOGO_BASE64 } from "./logoBase64";
import Sidebar from "./components/Sidebar";
import AppNavBar from "./components/AppNavBar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";
import MedicineTable from "./components/MedicineTable";
import MedicineForm from "./components/MedicineForm";
import PosCart from "./components/PosCart";
import InvoiceTable from "./components/InvoiceTable";
import InvoiceModal from "./components/InvoiceModal";
import HeldInvoicesModal from "./components/HeldInvoicesModal";
import InstantReturnModal from "./components/InstantReturnModal";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import PosPage from "./pages/PosPage";
import { getShiftDisplayName } from "./utils/workSchedule";
import InvoicesPage from "./pages/InvoicesPage";
import ReturnsPage from "./pages/ReturnsPage";
import ReturnModal from "./components/ReturnModal";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage, { type SettingsTab } from "./pages/SettingsPage";
import EmployeesUsersPage from "./pages/EmployeesUsersPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import PurchasesPage from "./pages/PurchasesPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import BranchesPage from "./pages/BranchesPage";
import CostsPage from "./pages/CostsPage";
import CustomersPage from "./pages/CustomersPage";
import EmployeePortalPage from "./pages/EmployeePortalPage";
import StockMovementsPage from "./pages/StockMovementsPage";
import SqlMigrationsPage from "./pages/SqlMigrationsPage";
import { barcodeCSV, downloadCSV } from "./utils/csvExport";
import {
  applyOptimisticStockDeduction,
  cacheMedicinesSnapshot,
  countPendingOfflineSales,
  loadCachedMedicines,
  queueOfflineSale,
} from "./utils/offlinePosStorage";
import { syncPendingOfflineSales } from "./utils/offlinePosSync";
import { useOnlineStatus } from "./utils/useOnlineStatus";
import {
  getAllowedPages,
  getRoleLabel as getRoleLabelUtil,
  hasRole as checkUserRole,
  isOrgPharmacyAdmin,
  isAccountant,
  isPharmacyManager,
  canApproveBranchStockTransfer,
  canDeleteCustomerPayments,
  canDeleteMedicines,
  canDeletePurchases,
  canDeleteReturns,
  canEditOrgWideSettings,
  canRequestSubscription,
  canViewOrgActivityLogs,
  isBranchManager,
  isSuperAdmin,
  pharmacyAdminRoleOptions,
} from "./utils/roles";
import BranchScopeBanner from "./components/BranchScopeBanner";
import { buildBranchReportRows } from "./utils/branchReports";
import {
  buildBranchTransferPrintParams,
  printBranchTransferPDF,
} from "./utils/branchTransferPrint";
import {
  playAdminAlertSound,
  requestSuperAdminNotificationPermission,
  showSuperAdminBrowserNotification,
} from "./utils/superAdminNotify";
import {
  buildExpiryAlertSummary,
  formatExpiryAlertMessage,
  getExpiryMailtoUrl,
  getExpiryWhatsappUrl,
  notifyExpiryAlerts,
  requestExpiryNotificationPermission,
  resolveExpiryNotifyEmail,
  resolveExpiryNotifyPhone,
} from "./utils/expiryNotify";
import { getVarianceLines, type StockCountSession } from "./utils/stockCount";
import { requestOpenReorderModal } from "./utils/reorderSuggestions";
import {
  ALL_BRANCHES_ID,
  branchPreferenceStorageKey,
  isAllBranchesMode,
} from "./constants/branches";
import { getBranchLabel as formatBranchLabel } from "./utils/branchLabel";
import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  buildBranchInventoryAlertRows,
  filterExpiredMedicines,
  filterExpiringSoonMedicines,
  filterLowStockMedicines,
  getExpiringSoonDays,
  getExpiringSoonDaysForBranch,
  getExpiryLimitValue,
  getLowStockThreshold,
  getLowStockThresholdForBranch,
} from "./utils/inventoryAlerts";
import {
  computeSubscriptionEndDate,
  getTierUpgradeAmount,
  isTrialSubscriptionStatus,
  planToSubscriptionPlan,
  TRIAL_SUBSCRIPTION_DAYS,
} from "./config/subscription";
import {
  getSubscriptionTierLabel,
  type SubscriptionTier,
} from "./config/subscriptionTiers";
import {
  canManageOrgBranchesWithTier,
  canReviewBranchTransfersWithTier,
  canShowOrgInventoryAlertsWithTier,
  canSwitchBranchesWithTier,
  canTransferStockWithTier,
  canViewBranchBreakdownWithTier,
  filterPagesBySubscriptionTier,
  getTierFeatures,
  buildTierUpgradePlan,
  getTierUpgradeNotice,
  getTierUpgradePrompt,
  parseTierUpgradePlan,
  resolveOrganizationTier,
} from "./utils/subscriptionFeatures";
import type { FormEvent } from "react";
import type {
  ActivityLog,
  AppUser,
  CartItem,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  InvoiceItem,
  Lang,
  Medicine,
  NewMedicineForm,
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

const translations = {
  ar: {
    dashboard: "لوحة التحكم",
    inventory: "المخزون",
    pos: "نقطة البيع",
    invoices: "الفواتير",
    reports: "التقارير",
    settings: "الإعدادات",
    search: "ابحث باسم الدواء أو الباركود",
    medicine: "الدواء",
    barcode: "الباركود",
    qty: "الكمية",
    price: "السعر",
    expiry: "الصلاحية",
    action: "الإجراء",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    remove: "حذف",
    total: "الإجمالي",
    subtotal: "قبل الخصم",
    discount: "الخصم",
    paymentMethod: "طريقة الدفع",
    cart: "سلة البيع",
    emptyCart: "السلة فارغة",
    completeSale: "إتمام البيع",
    lowStock: "نواقص المخزون",
    expiringSoon: "أدوية قرب الانتهاء",
    todaySales: "مبيعات اليوم",
    todayInvoices: "فواتير اليوم",
    currency: "ج.م",
    langButton: "English",
    addMedicine: "إضافة دواء جديد",
    editMedicine: "تعديل بيانات الدواء",
    saveChanges: "حفظ التعديل",
    cancelEdit: "إلغاء التعديل",
    addMedicineBtn: "إضافة الدواء",
    latestInvoices: "آخر الفواتير",
    noInvoices: "لا توجد فواتير حتى الآن",
    allInvoices: "كل الفواتير",
    invoiceNo: "رقم الفاتورة",
    date: "التاريخ",
    items: "عدد الأصناف",
    view: "عرض",
    print: "طباعة",
    close: "إغلاق",
    invoiceDetails: "تفاصيل الفاتورة",
    printInvoice: "طباعة الفاتورة",
    item: "الصنف",
    unitPrice: "سعر الوحدة",
    lineTotal: "إجمالي الصنف",
    salesSummary: "ملخص المبيعات",
    loadedInvoices: "الفواتير المعروضة",
    loadedSales: "المبيعات المعروضة",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    filteredSales: "مبيعات الفترة",
    filteredInvoices: "فواتير الفترة",
  },
  en: {
    dashboard: "Dashboard",
    inventory: "Inventory",
    pos: "Point of Sale",
    invoices: "Invoices",
    reports: "Reports",
    settings: "Settings",
    search: "Search by medicine name or barcode",
    medicine: "Medicine",
    barcode: "Barcode",
    qty: "Qty",
    price: "Price",
    expiry: "Expiry",
    action: "Action",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    remove: "Remove",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    paymentMethod: "Payment Method",
    cart: "Cart",
    emptyCart: "Cart is empty",
    completeSale: "Complete Sale",
    lowStock: "Low Stock",
    expiringSoon: "Expiring Soon",
    todaySales: "Today Sales",
    todayInvoices: "Today Invoices",
    currency: "EGP",
    langButton: "عربي",
    addMedicine: "Add New Medicine",
    editMedicine: "Edit Medicine",
    saveChanges: "Save Changes",
    cancelEdit: "Cancel Edit",
    addMedicineBtn: "Add Medicine",
    latestInvoices: "Latest Invoices",
    noInvoices: "No invoices yet",
    allInvoices: "All Invoices",
    invoiceNo: "Invoice No.",
    date: "Date",
    items: "Items",
    view: "View",
    print: "Print",
    close: "Close",
    invoiceDetails: "Invoice Details",
    printInvoice: "Print Invoice",
    item: "Item",
    unitPrice: "Unit Price",
    lineTotal: "Line Total",
    salesSummary: "Sales Summary",
    loadedInvoices: "Loaded Invoices",
    loadedSales: "Loaded Sales",
    fromDate: "From Date",
    toDate: "To Date",
    filteredSales: "Filtered Sales",
    filteredInvoices: "Filtered Invoices",
  },
};

const medicinesSeed: Medicine[] = [
  {
  id: 1,
  name_ar: "باراسيتامول 500 مجم",
  name_en: "Paracetamol 500 mg",
  barcode: "6221001000011",
  qty: 125,
  buyPrice: 8,
  price: 12,
  expiry: "2026-08-15",
},
  {
    id: 2,
    name_ar: "أوجمنتين 625 مجم",
    name_en: "Augmentin 625 mg",
    barcode: "6221001000028",
    qty: 18,
    buyPrice: 110,
    price: 115,
    expiry: "2025-07-10",
  },
  {
    id: 3,
    name_ar: "كونجستال أقراص",
    name_en: "Congestal Tablets",
    barcode: "6221001000035",
    qty: 45,
    buyPrice: 30,
    price: 35,
    expiry: "2026-01-20",
  },
  {
    id: 4,
    name_ar: "بانادول إكسترا",
    name_en: "Panadol Extra",
    barcode: "6221001000042",
    qty: 9,
    buyPrice: 40,
    price: 42,
    expiry: "2025-06-05",
  },
  {
    id: 5,
    name_ar: "زيرتك 10 مجم",
    name_en: "Zyrtec 10 mg",
    barcode: "6221001000059",
    qty: 33,
    buyPrice: 55,
    price: 58,
    expiry: "2025-05-29",
  },
];

const emptyMedicineForm: NewMedicineForm = {
  name_ar: "",
  name_en: "",
  barcode: "",
  qty: 0,
  buyPrice: 0,
  price: 0,
  expiry: "",
};

const ACTIVE_PAGE_STORAGE_KEY = "pharmacy_active_page";

function clearSessionNavigationState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function App() {
  const [lang, setLang] = useState<Lang>("ar");
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab | undefined>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isSelling, setIsSelling] = useState(false);
  const isOnline = useOnlineStatus();
  const [pendingOfflineSalesCount, setPendingOfflineSalesCount] = useState(0);
  const [offlineMedicinesCacheAt, setOfflineMedicinesCacheAt] = useState<string | null>(null);
  const [isSyncingOfflineSales, setIsSyncingOfflineSales] = useState(false);
  const wasOfflineRef = useRef(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isReturning, setIsReturning] = useState(false);
  const [deletingReturnId, setDeletingReturnId] = useState<number | string | null>(null);
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
  const [showHeldInvoicesModal, setShowHeldInvoicesModal] = useState(false);
  const [showInstantReturnModal, setShowInstantReturnModal] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isHeldInvoiceProcessing, setIsHeldInvoiceProcessing] = useState(false);
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
  const [newMedicine, setNewMedicine] = useState<NewMedicineForm>(emptyMedicineForm);
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [reportFrom, setReportFrom] = useState(formatDateInput(new Date()));
  const [reportTo, setReportTo] = useState(formatDateInput(new Date()));
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [pharmacyCosts, setPharmacyCosts] = useState<PharmacyCost[]>([]);
  const [customerPaymentModalRequest, setCustomerPaymentModalRequest] = useState(0);
  const t = translations[lang];
  const isArabic = lang === "ar";
  const [user, setUser] = useState<{ uid: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const accessRevokedRef = useRef(false);
  const knownPendingSubscriptionIdsRef = useRef<Set<number>>(new Set());
  const superAdminNotifyReadyRef = useRef(false);
  const expiryNotifyRanRef = useRef(false);
  const [currentWorkShiftId, setCurrentWorkShiftId] = useState<string>("");
  const [currentWorkShiftLabel, setCurrentWorkShiftLabel] = useState<string>("");
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [branches, setBranches] = useState<PharmacySettings[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branchTransfers, setBranchTransfers] = useState<BranchStockTransfer[]>([]);
  const [availabilityModal, setAvailabilityModal] = useState<{
    medicine: Medicine;
    rows: Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerName, setRegisterName] = useState("");
  const [registerPharmacyName, setRegisterPharmacyName] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registering, setRegistering] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("main");
  const [tenantForm, setTenantForm] = useState({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    subscriptionTier: "basic" as SubscriptionTier,
    maxBranches: 1,
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
  const [subscriptionBlocked, setSubscriptionBlocked] = useState("");
  const [userModal, setUserModal] = useState<"add" | "edit" | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [savingUserEdit, setSavingUserEdit] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as AppUser["role"],
    pharmacyId: "",
  });
  const [editUserDraft, setEditUserDraft] = useState<{
    uid: string;
    name: string;
    role: AppUser["role"];
    email: string;
  } | null>(null);

  const [dashboardPeriod, setDashboardPeriod] = useState<
    "today" | "7days" | "month" | "custom"
  >("today");

  const [dashboardFromDate, setDashboardFromDate] = useState(
    formatDateInput(new Date())
  );

  const [dashboardToDate, setDashboardToDate] = useState(
    formatDateInput(new Date())
  );
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings | null>(null);
  const appLogo = pharmacySettings?.logoBase64 || LOGO_BASE64;
  const writeBranchLabel = useMemo(() => {
    const writeId = appUser?.pharmacyId || "main";
    const branch = branches.find((item) => item.id === writeId);
    if (!branch) return writeId;
    return (isArabic ? branch.name : branch.name_en) || branch.name;
  }, [branches, appUser?.pharmacyId, isArabic]);
  const resolveBranchLabel = useCallback(
    (branchId: string | undefined) => formatBranchLabel(branchId, branches, isArabic),
    [branches, isArabic]
  );
  const orgSubscriptionTier = useMemo(
    () => resolveOrganizationTier(branches, appUser?.pharmacyId),
    [branches, appUser?.pharmacyId]
  );
  const orgTierFeatures = useMemo(
    () => getTierFeatures(orgSubscriptionTier),
    [orgSubscriptionTier]
  );
  const tierUpgradePrompt = useMemo(
    () => getTierUpgradePrompt(appUser, orgSubscriptionTier, isArabic),
    [appUser, orgSubscriptionTier, isArabic]
  );
  const transferUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchTransfers",
        isArabic
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic]
  );
  const branchBreakdownUpgradeNotice = useMemo(
    () =>
      getTierUpgradeNotice(
        appUser,
        orgSubscriptionTier,
        branches.length,
        "branchBreakdownReports",
        isArabic
      ),
    [appUser, orgSubscriptionTier, branches.length, isArabic]
  );
  const isViewingAllBranches = useMemo(
    () =>
      isAllBranchesMode(activeBranchId) &&
      canSwitchBranchesWithTier(appUser, orgSubscriptionTier, branches.length),
    [activeBranchId, appUser, orgSubscriptionTier, branches.length]
  );
  const topbarPharmacyTitle = useMemo(() => {
    const baseName = isArabic
      ? pharmacySettings?.name || "صيدلية Focus"
      : pharmacySettings?.name_en || pharmacySettings?.name || "Focus Pharmacy";
    if (isViewingAllBranches) {
      return isArabic ? `${baseName} — كل الفروع` : `${baseName} — All branches`;
    }
    if (activeBranchId && activeBranchId !== appUser?.pharmacyId) {
      const branch = branches.find((item) => item.id === activeBranchId);
      if (branch) {
        return (isArabic ? branch.name : branch.name_en) || branch.name;
      }
    }
    return baseName;
  }, [
    isArabic,
    pharmacySettings,
    isViewingAllBranches,
    activeBranchId,
    branches,
    appUser?.pharmacyId,
  ]);
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
        canApproveBranchStockTransfer(appUser, group.toPharmacyId)
    );
  }, [branchTransferGroups, appUser, orgSubscriptionTier, branches.length]);
  const completedBranchTransferGroups = useMemo(
    () => branchTransferGroups.filter((group) => group.status !== "pending"),
    [branchTransferGroups]
  );
  const [settingsForm, setSettingsForm] = useState({
  name: "",
  name_en: "",
  phone: "",
  address: "",
  currency: "ج.م",
  invoiceFooter: "",
  subscriptionPlan: "monthly",
  subscriptionEndDate: "",
  logoBase64: "",
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  expiringSoonDays: DEFAULT_EXPIRING_SOON_DAYS,
  expiryNotifyEnabled: true,
  expiryNotifyPhone: "",
  expiryNotifyEmail: "",
});

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
      if (isAllBranchesMode(activeBranchId) || (activeBranchId && activeBranchId !== appUser.pharmacyId)) {
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
    branches.length
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

  useEffect(() => {
    const shouldLoadOrgHistory =
      activePage === "branches" &&
      branches.length > 1 &&
      canManageOrgBranchesWithTier(appUser, orgSubscriptionTier);
    const shouldLoadPendingReview = canReviewBranchTransfersWithTier(
      appUser,
      orgSubscriptionTier,
      branches.length
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
      setUserModal(null);
      setEditUserDraft(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allowedPages = useMemo(() => {
    if (!appUser) return [];
    return filterPagesBySubscriptionTier(
      getAllowedPages(appUser),
      appUser,
      orgSubscriptionTier
    );
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
      (request) => request.status === "pending"
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
      await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true })
    );
  }, [appUser?.uid]);

  useEffect(() => {
    if (!appUser || !isSuperAdmin(appUser)) return;
    if (activePage !== "tenants") return;
    void refreshAdminRequestsStable();
  }, [activePage, appUser?.uid, refreshAdminRequestsStable]);

useEffect(() => {
  let cancelled = false;

  const processSession = async (
    session: {
      user?: {
        id: string;
        email?: string | null;
        app_metadata?: Record<string, unknown>;
        identities?: Array<{ provider?: string }>;
        user_metadata?: Record<string, unknown>;
      };
    } | null
  ) => {
    if (cancelled) return;

    const authUser = session?.user;
    const currentUser = authUser
      ? { uid: authUser.id, email: authUser.email || undefined }
      : null;

    setUser(currentUser);
    setAuthLoading(false);

    if (!currentUser || !authUser) {
      setAppUser(null);
      setActiveBranchId(null);
      clearSessionNavigationState();
      pharmacyService.setActivePharmacy(null);
      pharmacyService.setCurrentAppUser(null);
      setUserLoading(false);
      setSubscriptionBlocked("");
      return;
    }

    try {
      setUserLoading(true);
      setSubscriptionBlocked("");
      let data = await pharmacyService.getAppUserByUid(currentUser.uid);

      if (!data) {
        const provisioned = await pharmacyService.ensureTrialPharmacyFromAuth(authUser);
        if (provisioned) {
          data = await pharmacyService.getAppUserByUid(currentUser.uid);
        }
      }

      if (!data && pharmacyService.getAuthProvider(authUser) === "google") {
        data = await pharmacyService.ensureGoogleAppUser(authUser);
      }

      if (!data) {
        setAppUser(null);
        pharmacyService.setCurrentAppUser(null);
        await pharmacyService.signOutUser();
        alert(
          isArabic
            ? "هذا المستخدم غير مسجل في نظام الصيدلية"
            : "This user is not registered in the pharmacy system"
        );
        return;
      }

      if (!data.isActive) {
        setAppUser(null);
        pharmacyService.setCurrentAppUser(null);
        await pharmacyService.signOutUser();
        alert(isArabic ? "هذا المستخدم موقوف" : "This user account is inactive");
        return;
      }

      if (!isSuperAdmin(data)) {
        const pharmacyAllowed = await pharmacyService.isPharmacyAccessAllowed(data.pharmacyId);
        if (!pharmacyAllowed) {
          setAppUser(null);
          pharmacyService.setCurrentAppUser(null);
          await pharmacyService.signOutUser();
          const msg = isArabic
            ? "الصيدلية غير نشطة أو انتهت الفترة التجريبية/الاشتراك. تواصل مع الدعم أو جدّد الاشتراك."
            : "Pharmacy is inactive or the trial/subscription has ended. Contact support or renew.";
          setSubscriptionBlocked(msg);
          alert(msg);
          return;
        }
      }

      const linkedUser = await pharmacyService.ensureAppUserEmployeeLink(data);
      pharmacyService.setCurrentAppUser(linkedUser);
      setAppUser(linkedUser);
      void pharmacyService.recordLastLogin(data.uid);

      if (isSuperAdmin(data)) {
        const tenantScope = activeBranchId || data.pharmacyId || "main";
        setActiveBranchId(tenantScope);
        pharmacyService.setActivePharmacy(tenantScope);
      } else if (isOrgPharmacyAdmin(data) || isAccountant(data)) {
        const saved = localStorage.getItem(branchPreferenceStorageKey(data.uid));
        const initialBranch = saved || data.pharmacyId || null;
        setActiveBranchId(initialBranch);
        pharmacyService.setActivePharmacy(initialBranch);
      } else {
        setActiveBranchId(data.pharmacyId || null);
        pharmacyService.setActivePharmacy(data.pharmacyId || null);
      }
    } catch (error) {
      console.error("[Auth] error loading app user", error);
      setAppUser(null);
      pharmacyService.setCurrentAppUser(null);
      await pharmacyService.signOutUser();
      alert(isArabic ? "حدث خطأ أثناء تحميل بيانات المستخدم" : "Error loading user profile");
    } finally {
      if (!cancelled) setUserLoading(false);
    }
  };

  pharmacyService
    .getAuthSession()
    .then(({ data: { session } }) => processSession(session))
    .catch((error) => {
      console.error("[Auth] getSession failed", error);
      if (!cancelled) {
        setAuthLoading(false);
        setUserLoading(false);
      }
    });

  const authSubscription = pharmacyService.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    void processSession(session);
  });

  const authTimeout = window.setTimeout(() => {
    if (!cancelled) {
      setAuthLoading(false);
      setUserLoading(false);
    }
  }, 10000);

  return () => {
    cancelled = true;
    window.clearTimeout(authTimeout);
    authSubscription.data?.subscription.unsubscribe();
  };
}, []);

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

useEffect(() => {
  accessRevokedRef.current = false;
  superAdminNotifyReadyRef.current = false;
  knownPendingSubscriptionIdsRef.current = new Set();
}, [appUser?.uid]);

useEffect(() => {
  if (!isSuperAdmin(appUser)) return;

  const pending = subscriptionRequests.filter((request) => request.status === "pending");
  const currentIds = new Set(pending.map((request) => request.id));

  if (!superAdminNotifyReadyRef.current) {
    knownPendingSubscriptionIdsRef.current = currentIds;
    superAdminNotifyReadyRef.current = true;
    void requestSuperAdminNotificationPermission();
    return;
  }

  const newRequests = pending.filter(
    (request) => !knownPendingSubscriptionIdsRef.current.has(request.id)
  );
  knownPendingSubscriptionIdsRef.current = currentIds;

  newRequests.forEach((request) => {
    playAdminAlertSound();
    showSuperAdminBrowserNotification(request, isArabic, () => {
      setActivePage("tenants");
      setIsMenuOpen(false);
    });
  });
}, [subscriptionRequests, appUser, isArabic]);

useEffect(() => {
  if (!isSuperAdmin(appUser)) return;
  const onFocusAdminRequests = () => {
    setActivePage("tenants");
    setIsMenuOpen(false);
  };
  window.addEventListener("focus-admin-requests", onFocusAdminRequests);
  return () => window.removeEventListener("focus-admin-requests", onFocusAdminRequests);
}, [appUser]);

useEffect(() => {
  const uid = appUser?.uid;
  if (!uid) return;

  let cancelled = false;

  const forceLogout = async () => {
    if (cancelled || accessRevokedRef.current) return;
    accessRevokedRef.current = true;
    setAppUser(null);
    pharmacyService.setCurrentAppUser(null);
    clearSessionNavigationState();
    await pharmacyService.signOutUser();
    alert(
      isArabic
        ? "تم إنهاء جلستك من قبل مدير النظام"
        : "Your session was ended by the system owner"
    );
  };

  const unsubscribe = pharmacyService.subscribeUserAccessRevocation(uid, () => {
    void forceLogout();
  });

  const interval = window.setInterval(() => {
    void pharmacyService.isAppUserStillActive(uid).then((active) => {
      if (!active) void forceLogout();
    });
  }, 5000);

  return () => {
    cancelled = true;
    unsubscribe();
    window.clearInterval(interval);
  };
}, [appUser?.uid, isArabic]);

useEffect(() => {
    const currentAppUser = appUser;
    if (!currentAppUser) return;

    const isAllBranches = isAllBranchesMode(activeBranchId);
    const scopedBranchId =
      activeBranchId && !isAllBranches
        ? activeBranchId
        : currentAppUser.pharmacyId;
    const settingsBranchId = isAllBranches
      ? currentAppUser.pharmacyId || "main"
      : scopedBranchId || "main";

    pharmacyService.setActivePharmacy(
      isAllBranches ? ALL_BRANCHES_ID : activeBranchId || currentAppUser.pharmacyId
    );

    const cleanup: Array<() => void> = [];

    async function loadData(user: AppUser) {
      const branchesList = await pharmacyService.getPharmacies();
      setBranches(branchesList);
      pharmacyService.setOrganizationBranchIds(branchesList.map((branch) => branch.id));

      const pharmacySettings = await pharmacyService.getPharmacySettings(settingsBranchId);
      if (pharmacySettings) {
        setPharmacySettings(pharmacySettings);
        setSettingsForm({
          name: pharmacySettings.name || "",
          name_en: pharmacySettings.name_en || "",
          phone: pharmacySettings.phone || "",
          address: pharmacySettings.address || "",
          currency: pharmacySettings.currency || "ج.م",
          invoiceFooter: pharmacySettings.invoiceFooter || "",
          subscriptionPlan: pharmacySettings.subscriptionPlan || "monthly",
          subscriptionEndDate: pharmacySettings.subscriptionEndDate || "",
          logoBase64: pharmacySettings.logoBase64 || "",
          lowStockThreshold: getLowStockThreshold(pharmacySettings),
          expiringSoonDays: getExpiringSoonDays(pharmacySettings),
          expiryNotifyEnabled: pharmacySettings.expiryNotifyEnabled !== false,
          expiryNotifyPhone: pharmacySettings.expiryNotifyPhone || "",
          expiryNotifyEmail: pharmacySettings.expiryNotifyEmail || "",
        });
      }

      if (isPharmacyManager(user) && !isAllBranches && scopedBranchId === "main") {
        const medicinesList = await pharmacyService.getMedicines();
        if (medicinesList.length === 0 && typeof medicinesSeed !== "undefined") {
          for (const medicine of medicinesSeed) {
            await pharmacyService.addMedicine(medicine);
          }
        }
      }

      setMedicines(await pharmacyService.getMedicines());
      setInvoices(await pharmacyService.getInvoices());
      setReturns(await pharmacyService.getReturns());
      setPurchases(await pharmacyService.getPurchases());
      setCustomerPayments(await pharmacyService.getCustomerPayments());
      try {
        setPharmacyCosts(await pharmacyService.getPharmacyCosts());
      } catch (costsError) {
        console.error("Load pharmacy costs error:", costsError);
        setPharmacyCosts([]);
      }
      setStockMovements(await pharmacyService.getStockMovements());
      if (
        isAllBranches &&
        branchesList.length > 0 &&
        canViewOrgActivityLogs(user)
      ) {
        setActivityLogs(
          await pharmacyService.getActivityLogsForPharmacies(
            branchesList.map((branch) => branch.id),
            500
          )
        );
      } else {
        setActivityLogs(await pharmacyService.getActivityLogs());
      }
      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      if (isSuperAdmin(user)) {
        setPendingPharmacyLoginAccounts(
          await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true })
        );
      }
      try {
        setHeldInvoices(await pharmacyService.getHeldInvoices(settingsBranchId));
      } catch (heldError) {
        console.error("Load held invoices error:", heldError);
        setHeldInvoices([]);
      }

      if (isSuperAdmin(user)) {
        setSystemUsers(await pharmacyService.getAllSystemUsers());
      } else if (isPharmacyManager(user)) {
        setSystemUsers(await pharmacyService.getSystemUsers(settingsBranchId));
      }
    }

    loadData(currentAppUser).catch((error) => {
      console.error("Initial data load error:", error);
    });

    cleanup.push(
      pharmacyService.subscribePharmacies((rows) => {
        setBranches(rows);
        pharmacyService.setOrganizationBranchIds(rows.map((branch) => branch.id));
      })
    );

    cleanup.push(pharmacyService.subscribePharmacySettings(settingsBranchId, (settings) => {
      setPharmacySettings(settings);
      setSettingsForm({
        name: settings.name || "",
        name_en: settings.name_en || "",
        phone: settings.phone || "",
        address: settings.address || "",
        currency: settings.currency || "ج.م",
        invoiceFooter: settings.invoiceFooter || "",
        subscriptionPlan: settings.subscriptionPlan || "monthly",
        subscriptionEndDate: settings.subscriptionEndDate || "",
        logoBase64: settings.logoBase64 || "",
        lowStockThreshold: getLowStockThreshold(settings),
        expiringSoonDays: getExpiringSoonDays(settings),
        expiryNotifyEnabled: settings.expiryNotifyEnabled !== false,
        expiryNotifyPhone: settings.expiryNotifyPhone || "",
        expiryNotifyEmail: settings.expiryNotifyEmail || "",
      });
    }));

    cleanup.push(pharmacyService.subscribeMedicines(setMedicines));
    cleanup.push(pharmacyService.subscribeInvoices(setInvoices));
    cleanup.push(pharmacyService.subscribeReturns(setReturns));
    cleanup.push(pharmacyService.subscribePurchases(setPurchases));
    cleanup.push(pharmacyService.subscribeCustomerPayments(setCustomerPayments));
    cleanup.push(pharmacyService.subscribePharmacyCosts(setPharmacyCosts));
    cleanup.push(pharmacyService.subscribeStockMovements(setStockMovements));
    cleanup.push(pharmacyService.subscribeActivityLogs(setActivityLogs));
    cleanup.push(pharmacyService.subscribeSubscriptionRequests(setSubscriptionRequests));
    cleanup.push(pharmacyService.subscribeHeldInvoices(setHeldInvoices, settingsBranchId));

    if (isPharmacyManager(currentAppUser)) {
      cleanup.push(pharmacyService.subscribeUsers(settingsBranchId, setSystemUsers));
    }

    return () => {
      cleanup.forEach((unsubscribe) => unsubscribe());
    };
  }, [appUser, activeBranchId]);

const lowStockThreshold = getLowStockThreshold(pharmacySettings);
const expiringSoonDays = getExpiringSoonDays(pharmacySettings);
const useBranchAwareInventoryAlerts = showOrgInventoryAlerts && orgAlertMedicines.length > 0;
const alertMedicineSource = useBranchAwareInventoryAlerts ? orgAlertMedicines : medicines;

   const filteredMedicines = useMemo(() => {
  const value = query.trim().toLowerCase();
  const todayValue = formatDateInput(new Date());

  return medicines.filter((medicine) => {
    const matchesSearch =
      !value ||
      medicine.name_ar.toLowerCase().includes(value) ||
      medicine.name_en.toLowerCase().includes(value) ||
      medicine.barcode.includes(value);

    const expiry = medicine.expiry || "";
    const branchLowThreshold = isViewingAllBranches
      ? getLowStockThresholdForBranch(medicine.pharmacyId, branches, pharmacySettings)
      : lowStockThreshold;
    const expiringLimitValue = isViewingAllBranches
      ? getExpiryLimitValue(
          getExpiringSoonDaysForBranch(medicine.pharmacyId, branches, pharmacySettings)
        )
      : getExpiryLimitValue(expiringSoonDays);

    const matchesStatus =
      inventoryStatusFilter === "all" ||
      (inventoryStatusFilter === "low" && medicine.qty <= branchLowThreshold) ||
      (inventoryStatusFilter === "expired" && expiry && expiry < todayValue) ||
      (inventoryStatusFilter === "expiring" &&
        expiry &&
        expiry >= todayValue &&
        expiry <= expiringLimitValue);

    return matchesSearch && matchesStatus;
  });
}, [
  query,
  medicines,
  inventoryStatusFilter,
  lowStockThreshold,
  expiringSoonDays,
  isViewingAllBranches,
  branches,
  pharmacySettings,
]); 


const todayValue = formatDateInput(new Date());

const lowStockMedicines = useBranchAwareInventoryAlerts
  ? filterLowStockMedicines(alertMedicineSource, branches, pharmacySettings)
  : alertMedicineSource.filter((m) => m.qty <= lowStockThreshold);

const expiredMedicines = filterExpiredMedicines(alertMedicineSource, todayValue);

const expiringSoonMedicines = useBranchAwareInventoryAlerts
  ? filterExpiringSoonMedicines(alertMedicineSource, branches, pharmacySettings, todayValue)
  : alertMedicineSource.filter((m) => {
      const expiryLimitValue = getExpiryLimitValue(expiringSoonDays);
      return m.expiry && m.expiry >= todayValue && m.expiry <= expiryLimitValue;
    });

const branchInventoryAlertRows = useMemo(
  () =>
    showOrgInventoryAlerts
      ? buildBranchInventoryAlertRows({
          medicines: alertMedicineSource,
          branches,
          fallbackSettings: pharmacySettings,
          isArabic,
        })
      : [],
  [showOrgInventoryAlerts, alertMedicineSource, branches, pharmacySettings, isArabic]
);

const lowStockCount = lowStockMedicines.length;
const expiringCount = expiringSoonMedicines.length;
const expiredCount = expiredMedicines.length;

const medicineName = (m: Medicine) => (isArabic ? m.name_ar : m.name_en) || m.name_ar || m.name_en;
const branchLabelForAlert = (medicine: Medicine) =>
  useBranchAwareInventoryAlerts || isViewingAllBranches
    ? resolveBranchLabel(medicine.pharmacyId)
    : "";
const alertItems = [
  ...expiredMedicines.slice(0, 6).map((m) => ({
    id: `expired-${m.id}`,
    kind: "expired" as const,
    name: medicineName(m),
    detail: [
      branchLabelForAlert(m),
      `${isArabic ? "انتهت في" : "Expired"}: ${m.expiry}`,
    ]
      .filter(Boolean)
      .join(" · "),
  })),
  ...lowStockMedicines.slice(0, 6).map((m) => ({
    id: `low-${m.id}`,
    kind: "low" as const,
    name: medicineName(m),
    detail: [
      branchLabelForAlert(m),
      `${isArabic ? "الكمية المتبقية" : "Remaining qty"}: ${m.qty}`,
    ]
      .filter(Boolean)
      .join(" · "),
  })),
  ...expiringSoonMedicines.slice(0, 6).map((m) => ({
    id: `expiring-${m.id}`,
    kind: "expiring" as const,
    name: medicineName(m),
    detail: [
      branchLabelForAlert(m),
      `${isArabic ? "تنتهي في" : "Expires"}: ${m.expiry}`,
    ]
      .filter(Boolean)
      .join(" · "),
  })),
];
const alertTotal = lowStockCount + expiringCount + expiredCount;
const subscriptionEndDate = pharmacySettings?.subscriptionEndDate || "";
const subscriptionEnd = subscriptionEndDate
  ? new Date(`${subscriptionEndDate}T23:59:59`)
  : null;

const todayDate = new Date();

const subscriptionDaysLeft = subscriptionEnd
  ? Math.ceil(
      (subscriptionEnd.getTime() - todayDate.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  : null;

const isSubscriptionExpired =
  subscriptionDaysLeft !== null && subscriptionDaysLeft < 0;

const isSubscriptionExpiringSoon =
  subscriptionDaysLeft !== null &&
  subscriptionDaysLeft >= 0 &&
  subscriptionDaysLeft <= 7;

const isTrialSubscription = isTrialSubscriptionStatus(pharmacySettings?.subscriptionStatus);

useEffect(() => {
  expiryNotifyRanRef.current = false;
}, [pharmacySettings?.id]);

useEffect(() => {
  if (expiryNotifyRanRef.current || userLoading || !appUser || !pharmacySettings) return;
  if (!isPharmacyManager(appUser) && !isOrgPharmacyAdmin(appUser)) return;
  if (isSubscriptionExpired) return;

  expiryNotifyRanRef.current = true;
  void notifyExpiryAlerts({
    pharmacyId: getPharmacyId(),
    pharmacyName: pharmacySettings.name || getPharmacyId(),
    medicines,
    branches,
    settings: pharmacySettings,
    isArabic,
    onOpenInventory: openInventoryExpiryView,
  });
}, [
  userLoading,
  appUser,
  pharmacySettings,
  medicines,
  branches,
  isArabic,
  isSubscriptionExpired,
]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.cartQty, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const total = Math.max(0, subtotal - safeDiscount);
  const cartItemsCount = cart.length;
  const cartTotalQty = cart.reduce((sum, item) => sum + item.cartQty, 0);
    function getDashboardDateRange() {
  const now = new Date();
  let from = new Date();
  let to = new Date();

  if (dashboardPeriod === "today") {
    from = new Date(`${formatDateInput(now)}T00:00:00`);
    to = new Date(`${formatDateInput(now)}T23:59:59`);
  }

  if (dashboardPeriod === "7days") {
    from = new Date();
    from.setDate(from.getDate() - 6);
    from = new Date(`${formatDateInput(from)}T00:00:00`);
    to = new Date(`${formatDateInput(now)}T23:59:59`);
  }

  if (dashboardPeriod === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  if (dashboardPeriod === "custom") {
    from = new Date(`${dashboardFromDate}T00:00:00`);
    to = new Date(`${dashboardToDate}T23:59:59`);
  }

  return { from, to };
}

const dashboardDateRange = getDashboardDateRange();

const dashboardInvoices = invoices.filter((invoice) => {
  const invoiceDate = new Date(invoice.createdAt || invoice.date);
  return (
    invoiceDate >= dashboardDateRange.from &&
    invoiceDate <= dashboardDateRange.to
  );
});
const dashboardSalesTotal = dashboardInvoices.reduce(
  (sum, invoice) => sum + safeNumber(invoice.total),
  0
);

const dashboardProfitTotal = dashboardInvoices.reduce(
  (sum, invoice) => sum + safeNumber(invoice.totalProfit),
  0
);

const dashboardInvoicesCount = dashboardInvoices.length;

const dashboardSalesTrend = (() => {
  const buckets = new Map<string, number>();
  const cursor = new Date(dashboardDateRange.from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(dashboardDateRange.to);
  let guard = 0;
  while (cursor <= end && guard < 120) {
    buckets.set(formatDateInput(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  dashboardInvoices.forEach((invoice) => {
    const key = formatDateInput(new Date(invoice.createdAt || invoice.date));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + safeNumber(invoice.total));
    }
  });
  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
})();

const dashboardPaymentBreakdown = (() => {
  const map = new Map<string, number>();
  dashboardInvoices.forEach((invoice) => {
    const method = invoice.paymentMethod || "cash";
    map.set(method, (map.get(method) || 0) + safeNumber(invoice.total));
  });
  return Array.from(map.entries())
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total);
})();

const dashboardTopSellingMedicines = Object.values(
  dashboardInvoices
    .flatMap((invoice) => invoice.items || [])
    .reduce((result, item) => {
      const key = item.medicineId;

      if (!result[key]) {
        result[key] = {
          medicineId: item.medicineId,
          name_ar: item.name_ar,
          name_en: item.name_en,
          quantity: 0,
          total: 0,
        };
      }

      result[key].quantity += item.quantity || 0;
      result[key].total += item.lineTotal || 0;

      return result;
    }, {} as Record<number, {
      medicineId: number;
      name_ar: string;
      name_en: string;
      quantity: number;
      total: number;
    }>)
)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 5);

const dashboardTopCashiers = Object.values(
  dashboardInvoices.reduce((result, invoice: any) => {
    const cashierName =
      invoice.cashierName || (isArabic ? "غير محدد" : "Unknown");

    if (!result[cashierName]) {
      result[cashierName] = {
        cashierName,
        totalSales: 0,
        invoicesCount: 0,
      };
    }

    result[cashierName].totalSales += safeNumber(invoice.total);
    result[cashierName].invoicesCount += 1;

    return result;
  }, {} as Record<string, {
    cashierName: string;
    totalSales: number;
    invoicesCount: number;
  }>)
)
  .sort((a, b) => b.totalSales - a.totalSales)
  .slice(0, 5);
  const today = new Date().toDateString();
  const todayInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.createdAt || invoice.date).toDateString();
    return invoiceDate === today;
  });

  const todaySalesTotal = todayInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  const todayInvoicesCount = todayInvoices.length;
  const totalInvoicesCount = invoices.length;
  const totalSalesAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  const todayProfitTotal = todayInvoices.reduce(
  (sum, invoice) => sum + safeNumber(invoice.totalProfit),
  0
);

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const monthInvoices = invoices.filter((invoice) => {
  const invoiceDate = new Date(invoice.createdAt || invoice.date);
  return (
    invoiceDate.getMonth() === currentMonth &&
    invoiceDate.getFullYear() === currentYear
  );
});

const monthSalesTotal = monthInvoices.reduce(
  (sum, invoice) => sum + safeNumber(invoice.total),
  0
);

const monthProfitTotal = monthInvoices.reduce(
  (sum, invoice) => sum + safeNumber(invoice.totalProfit),
  0
);

const totalCustomerPayments = customerPayments.reduce(
  (sum, payment) => sum + safeNumber(payment.amount),
  0
);

const topCashiers = Object.values(
  invoices.reduce((result, invoice: any) => {
    const cashierName = invoice.cashierName || (isArabic ? "غير محدد" : "Unknown");

    if (!result[cashierName]) {
      result[cashierName] = {
        cashierName,
        totalSales: 0,
        invoicesCount: 0,
      };
    }

    result[cashierName].totalSales += safeNumber(invoice.total);
    result[cashierName].invoicesCount += 1;

    return result;
  }, {} as Record<string, { cashierName: string; totalSales: number; invoicesCount: number }>)
)
  .sort((a, b) => b.totalSales - a.totalSales)
  .slice(0, 5);
  const filteredReportInvoices = invoices.filter((invoice) => {
    const date = new Date(invoice.createdAt || invoice.date);
    const from = new Date(`${reportFrom}T00:00:00`);
    const to = new Date(`${reportTo}T23:59:59`);
    return date >= from && date <= to;
  });

  const filteredReportTotal = filteredReportInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
 
  const customerDebts: CustomerDebt[] = Object.values(
  invoices
    .filter(
      (invoice) =>
        invoice.paymentMethod === "credit" &&
        invoice.customerName &&
        invoice.customerName.trim()
    )
    .reduce((result, invoice) => {
      const customerName = invoice.customerName?.trim() || "-";

      if (!result[customerName]) {
        result[customerName] = {
          customerName,
          totalDebt: 0,
          invoicesCount: 0,
          lastInvoiceDate: invoice.date || "-",
          invoices: [],
        };
      }

      result[customerName].totalDebt += safeNumber(invoice.total);
      result[customerName].invoicesCount += 1;
      result[customerName].lastInvoiceDate = invoice.date || "-";
      result[customerName].invoices.push(invoice);

      return result;
    }, {} as Record<string, CustomerDebt>)
).map((customer) => {
  const paidAmount = customerPayments
    .filter((payment) => payment.customerName === customer.customerName)
    .reduce((sum, payment) => sum + safeNumber(payment.amount), 0);

  return {
    ...customer,
    paidAmount,
    remainingDebt: Math.max(0, customer.totalDebt - paidAmount),
  };
}).sort((a: any, b: any) => b.remainingDebt - a.remainingDebt);
const totalCustomerRemainingDebt = customerDebts.reduce(
  (sum, customer) => sum + safeNumber(customer.remainingDebt),
  0
);

const subscriptionRenewLogs = activityLogs
  .filter((log) => log.type === "subscription_renew")
  .slice(0, 10);

const pharmacySubscriptionRequests = subscriptionRequests.filter(
  (request) => request.pharmacyId === getPharmacyId()
);

  const filteredReportProfitTotal = filteredReportInvoices.reduce(
  (sum, invoice) => sum + (invoice.totalProfit || 0),
  0
);
  const filteredReportDiscountTotal = filteredReportInvoices.reduce(
  (sum, invoice) => sum + (invoice.discount || 0),
  0
);

const reportPaymentTotals = filteredReportInvoices.reduce(
  (result, invoice) => {
    const method = invoice.paymentMethod || "cash";
    result[method] = (result[method] || 0) + (invoice.total || 0);
    return result;
  },
  {} as Record<string, number>
);

const reportCashierTotals = filteredReportInvoices.reduce(
  (result, invoice: any) => {
    const cashierName = invoice.cashierName || (isArabic ? "غير محدد" : "Unknown");
    result[cashierName] = (result[cashierName] || 0) + (invoice.total || 0);
    return result;
  },
  {} as Record<string, number>
);

const topSellingMedicines = Object.values(
  filteredReportInvoices
    .flatMap((invoice) => invoice.items || [])
    .reduce((result, item) => {
      const key = item.medicineId;

      if (!result[key]) {
        result[key] = {
          medicineId: item.medicineId,
          name_ar: item.name_ar,
          name_en: item.name_en,
          quantity: 0,
          total: 0,
        };
      }

      result[key].quantity += item.quantity || 0;
      result[key].total += item.lineTotal || 0;

      return result;
    }, {} as Record<number, {
      medicineId: number;
      name_ar: string;
      name_en: string;
      quantity: number;
      total: number;
    }>)
)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 5);

  const reportSalesTrend = (() => {
    const map = new Map<string, number>();
    for (const invoice of filteredReportInvoices) {
      const key = (invoice.createdAt || invoice.date || "").slice(0, 10);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (invoice.total || 0));
    }
    const from = new Date(`${reportFrom}T00:00:00`);
    const to = new Date(`${reportTo}T00:00:00`);
    const dayMs = 86400000;
    const span = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
    if (span > 0 && span <= 62) {
      const points: { date: string; total: number }[] = [];
      for (let i = 0; i < span; i++) {
        const key = formatDateInput(new Date(from.getTime() + i * dayMs));
        points.push({ date: key, total: map.get(key) || 0 });
      }
      return points;
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, total]) => ({ date, total }));
  })();

  const reportPaymentBreakdown = Object.entries(reportPaymentTotals)
    .map(([method, total]) => ({ method, total }))
    .filter((slice) => slice.total > 0)
    .sort((a, b) => b.total - a.total);

  const reportUnitsSold = filteredReportInvoices.reduce(
    (sum, invoice) =>
      sum + (invoice.items || []).reduce((s, item) => s + (item.quantity || 0), 0),
    0
  );

  const reportReturnsTotal = returns
    .filter((record: any) => {
      const key = (record.createdAt || record.date || "").slice(0, 10);
      return key && key >= reportFrom && key <= reportTo;
    })
    .reduce((sum, record: any) => sum + safeNumber(record.total), 0);

  const filteredReportCosts = pharmacyCosts.filter((cost) => {
    const date = new Date(cost.createdAt || cost.date || 0);
    const from = new Date(`${reportFrom}T00:00:00`);
    const to = new Date(`${reportTo}T23:59:59`);
    return date >= from && date <= to;
  });

  const reportCostsTotal = filteredReportCosts.reduce(
    (sum, cost) => sum + safeNumber(cost.amount),
    0
  );

  const reportCostsCount = filteredReportCosts.length;

  const reportCostsByCategory = Object.entries(
    filteredReportCosts.reduce(
      (result, cost) => {
        const key = cost.category || "other";
        result[key] = (result[key] || 0) + safeNumber(cost.amount);
        return result;
      },
      {} as Record<string, number>
    )
  )
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const netProfitAfterCosts = filteredReportProfitTotal - reportCostsTotal;

  const showBranchBreakdown = canViewBranchBreakdownWithTier(
    appUser,
    orgSubscriptionTier,
    branches.length
  );
  const reportBranchRows = useMemo(
    () =>
      showBranchBreakdown
        ? buildBranchReportRows({
            branches,
            invoices,
            returns,
            costs: pharmacyCosts,
            reportFrom,
            reportTo,
            isArabic,
            fallbackBranchId: appUser?.pharmacyId,
          })
        : [],
    [
      showBranchBreakdown,
      branches,
      invoices,
      returns,
      pharmacyCosts,
      reportFrom,
      reportTo,
      isArabic,
      appUser?.pharmacyId,
    ]
  );

  const dashboardBranchRows = useMemo(
    () =>
      showBranchBreakdown
        ? buildBranchReportRows({
            branches,
            invoices,
            returns,
            costs: pharmacyCosts,
            reportFrom: formatDateInput(dashboardDateRange.from),
            reportTo: formatDateInput(dashboardDateRange.to),
            isArabic,
            fallbackBranchId: appUser?.pharmacyId,
          })
        : [],
    [
      showBranchBreakdown,
      branches,
      invoices,
      returns,
      pharmacyCosts,
      dashboardDateRange.from,
      dashboardDateRange.to,
      isArabic,
      appUser?.pharmacyId,
    ]
  );

  function applyReportQuickRange(preset: "today" | "7days" | "month" | "year") {
    const today = new Date();
    let from = new Date();
    if (preset === "today") {
      from = today;
    } else if (preset === "7days") {
      from = new Date(today.getTime() - 6 * 86400000);
    } else if (preset === "month") {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      from = new Date(today.getFullYear(), 0, 1);
    }
    setReportFrom(formatDateInput(from));
    setReportTo(formatDateInput(today));
  }

  async function handleSubmitSubscriptionRequest(input: {
    plan: string;
    days: number;
    amount: number;
  }): Promise<SubscriptionRequest | null> {
    if (!canRequestSubscription(appUser)) {
      return null;
    }

    const pharmacyId = getPharmacyId();
    const hasPending = subscriptionRequests.some(
      (request) => request.pharmacyId === pharmacyId && request.status === "pending"
    );
    if (hasPending) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة بالفعل"
          : "You already have a pending subscription request"
      );
      return (
        subscriptionRequests.find(
          (request) => request.pharmacyId === pharmacyId && request.status === "pending"
        ) || null
      );
    }

    try {
      const created = await pharmacyService.createSubscriptionRequest({
        pharmacyId,
        pharmacyName: settingsForm.name || pharmacySettings?.name || pharmacyId,
        plan: input.plan,
        days: input.days,
        amount: input.amount,
        requestedBy: appUser?.uid,
        requestedByName: appUser?.name,
      });

      await addActivityLog({
        type: "subscription_request",
        title: isArabic ? "طلب تجديد اشتراك" : "Subscription renewal requested",
        description: isArabic
          ? `طلب تجديد ${input.days} يوم — ${created.requestNumber}`
          : `Renewal request for ${input.days} days — ${created.requestNumber}`,
        referenceType: "subscription_request",
        referenceId: String(created.id),
      });

      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      alert(
        isArabic
          ? "تم إرسال الطلب. اتبع تعليمات InstaPay لإتمام الدفع."
          : "Request submitted. Follow InstaPay instructions to complete payment."
      );
      return created;
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إرسال الطلب" : "Could not submit request");
      return null;
    }
  }

  async function handleSubmitTierUpgradeRequest(
    targetTier: SubscriptionTier
  ): Promise<SubscriptionRequest | null> {
    if (!isOrgPharmacyAdmin(appUser) && !isSuperAdmin(appUser)) {
      return null;
    }

    const pharmacyId = getPharmacyId();
    const hasPending = subscriptionRequests.some(
      (request) => request.pharmacyId === pharmacyId && request.status === "pending"
    );
    if (hasPending) {
      alert(
        isArabic
          ? "لديك طلب اشتراك قيد المراجعة بالفعل"
          : "You already have a pending subscription request"
      );
      return (
        subscriptionRequests.find(
          (request) => request.pharmacyId === pharmacyId && request.status === "pending"
        ) || null
      );
    }

    try {
      const created = await pharmacyService.createSubscriptionRequest({
        pharmacyId,
        pharmacyName: settingsForm.name || pharmacySettings?.name || pharmacyId,
        plan: buildTierUpgradePlan(targetTier),
        days: 0,
        amount: getTierUpgradeAmount(targetTier),
        requestedBy: appUser?.uid,
        requestedByName: appUser?.name,
      });

      await addActivityLog({
        type: "subscription_request",
        title: isArabic ? "طلب ترقية باقة" : "Package upgrade requested",
        description: isArabic
          ? `طلب ترقية إلى ${getSubscriptionTierLabel(targetTier, true)} — ${created.requestNumber} — ${getTierUpgradeAmount(targetTier)} ج.م`
          : `Upgrade request to ${getSubscriptionTierLabel(targetTier, false)} — ${created.requestNumber} — ${getTierUpgradeAmount(targetTier)} EGP`,
        referenceType: "subscription_request",
        referenceId: String(created.id),
      });

      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      return created;
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إرسال طلب الترقية" : "Could not submit upgrade request");
      return null;
    }
  }

  async function handleApproveSubscriptionRequest(requestId: number): Promise<boolean> {
    if (!isSuperAdmin(appUser)) return false;

    const request = subscriptionRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") return false;

    try {
      const pharmacy =
        branches.find((item) => item.id === request.pharmacyId) ||
        (await pharmacyService.getPharmacySettings(request.pharmacyId));

      const targetTier = parseTierUpgradePlan(request.plan);
      if (targetTier) {
        const organizationId = pharmacy?.organizationId || `org-${request.pharmacyId}`;
        await pharmacyService.updateOrganizationSubscriptionTier(organizationId, targetTier, appUser);

        await pharmacyService.updateSubscriptionRequestStatus(requestId, {
          status: "approved",
          reviewedBy: appUser?.uid,
          reviewedByName: appUser?.name,
        });

        await addActivityLog({
          type: "subscription_renew",
          title: isArabic ? "اعتماد ترقية الباقة" : "Package upgrade approved",
          description: isArabic
            ? `تم اعتماد ${request.requestNumber} وترقية الباقة إلى ${getSubscriptionTierLabel(targetTier, true)}`
            : `Approved ${request.requestNumber}, upgraded to ${getSubscriptionTierLabel(targetTier, false)}`,
          referenceType: "subscription_request",
          referenceId: String(requestId),
          pharmacyId: request.pharmacyId,
        });

        setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
        setBranches(await pharmacyService.getPharmacies());
        alert(
          isArabic
            ? `تم اعتماد ترقية الباقة إلى ${getSubscriptionTierLabel(targetTier, true)}`
            : `Package upgraded to ${getSubscriptionTierLabel(targetTier, false)}`
        );
        return true;
      }

      const newEndDate = computeSubscriptionEndDate(pharmacy?.subscriptionEndDate, request.days);
      const newPlan = planToSubscriptionPlan(request.days);

      await pharmacyService.updatePharmacySettings(request.pharmacyId, {
        subscriptionEndDate: newEndDate,
        subscriptionPlan: newPlan,
        isActive: true,
        subscriptionStatus: "active",
      });

      await pharmacyService.updateSubscriptionRequestStatus(requestId, {
        status: "approved",
        reviewedBy: appUser?.uid,
        reviewedByName: appUser?.name,
      });

      await addActivityLog({
        type: "subscription_renew",
        title: isArabic ? "اعتماد تجديد الاشتراك" : "Subscription renewal approved",
        description: isArabic
          ? `تم اعتماد ${request.requestNumber} وتمديد الاشتراك ${request.days} يوم حتى ${newEndDate}`
          : `Approved ${request.requestNumber}, extended ${request.days} days until ${newEndDate}`,
        referenceType: "subscription_request",
        referenceId: String(requestId),
        pharmacyId: request.pharmacyId,
      });

      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      setBranches((prev) =>
        prev.map((item) =>
          item.id === request.pharmacyId
            ? {
                ...item,
                subscriptionEndDate: newEndDate,
                subscriptionPlan: newPlan,
                isActive: true,
                subscriptionStatus: "active",
              }
            : item
        )
      );
      setBranches(await pharmacyService.getPharmacies());
      if (request.pharmacyId === getPharmacyId()) {
        setSettingsForm((prev) => ({
          ...prev,
          subscriptionEndDate: newEndDate,
          subscriptionPlan: newPlan,
        }));
      }
      alert(
        isArabic
          ? `تم اعتماد الطلب وتمديد الاشتراك حتى ${newEndDate}`
          : `Request approved. Subscription extended until ${newEndDate}`
      );
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      alert(
        isArabic
          ? `تعذر اعتماد الطلب${message ? `: ${message}` : ""}`
          : `Could not approve request${message ? `: ${message}` : ""}`
      );
      return false;
    }
  }

  async function handleApprovePharmacyLoginAccount(accountId: string): Promise<boolean> {
    if (!isSuperAdmin(appUser)) return false;

    const account = await pharmacyService.getPharmacyLoginAccountById(accountId);
    const requestKind = account?.linkRequestPending
      ? "link"
      : account?.editPending
        ? "edit"
        : account?.status === "pending"
          ? "new"
          : null;
    if (!account || !requestKind) {
      alert(isArabic ? "الحساب غير موجود أو تمت معالجته" : "Account not found or already processed");
      return false;
    }

    const confirmed = window.confirm(
      requestKind === "link"
        ? isArabic
          ? `ربط حساب ${account.email} بالنظام؟\n\nتأكد من وجود الحساب في Supabase Auth بنفس الإيميل.`
          : `Link account ${account.email} to the system?\n\nEnsure the Auth user exists with the same email.`
        : requestKind === "edit"
          ? isArabic
            ? `اعتماد تعديل حساب ${account.email}؟\n\nالإيميل الجديد: ${account.pendingEmail || account.email}\n\nتأكد من تحديث الحساب في Supabase إن تغيّر الإيميل.`
            : `Approve changes to ${account.email}?\n\nNew email: ${account.pendingEmail || account.email}\n\nUpdate Supabase Auth if the email changed.`
          : isArabic
            ? `اعتماد حساب ${account.email}؟\n\nتأكد من إنشاء الحساب في Supabase إن لزم.`
            : `Approve account ${account.email}?\n\nEnsure the account exists in Supabase if needed.`
    );
    if (!confirmed) return false;

    try {
      if (requestKind === "link") {
        await pharmacyService.approvePharmacyLoginAccountLink(accountId, appUser?.uid, appUser?.name);
      } else if (requestKind === "edit") {
        await pharmacyService.approvePharmacyLoginAccountEdit(accountId, appUser?.uid, appUser?.name);
      } else {
        await pharmacyService.approvePharmacyLoginAccount(accountId, appUser?.uid, appUser?.name);
      }

      await addActivityLog({
        type: "login_account_request_approved",
        title:
          requestKind === "link"
            ? isArabic
              ? "اعتماد ربط حساب دخول"
              : "Login account link approved"
            : requestKind === "edit"
              ? isArabic
                ? "اعتماد تعديل حساب دخول"
                : "Login account edit approved"
              : isArabic
                ? "اعتماد حساب دخول"
                : "Login account approved",
        description:
          requestKind === "link"
            ? isArabic
              ? `تم ربط ${account.email}`
              : `Linked ${account.email}`
            : requestKind === "edit"
              ? isArabic
                ? `تم اعتماد تعديل ${account.email}`
                : `Approved edit for ${account.email}`
              : isArabic
                ? `تم اعتماد ${account.email}`
                : `Approved ${account.email}`,
        referenceType: "pharmacy_login_account",
        referenceId: accountId,
        pharmacyId: account.pharmacyId,
      });

      setPendingPharmacyLoginAccounts(
        await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true })
      );
      alert(
        requestKind === "link"
          ? isArabic
            ? "تم ربط الحساب"
            : "Account linked"
          : requestKind === "edit"
            ? isArabic
              ? "تم اعتماد التعديل"
              : "Changes approved"
            : isArabic
              ? "تم اعتماد الحساب"
              : "Account approved"
      );
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      alert(
        isArabic
          ? `تعذر الاعتماد${message ? `: ${message}` : ""}`
          : `Could not approve${message ? `: ${message}` : ""}`
      );
      return false;
    }
  }

  async function handleRejectPharmacyLoginAccount(
    accountId: string,
    note?: string
  ): Promise<boolean> {
    if (!isSuperAdmin(appUser)) return false;

    const account =
      pendingPharmacyLoginAccounts.find((item) => item.id === accountId) ||
      (await pharmacyService.getPharmacyLoginAccountById(accountId));
    const requestKind = account?.linkRequestPending
      ? "link"
      : account?.editPending
        ? "edit"
        : account?.status === "pending"
          ? "new"
          : null;
    if (!account || !requestKind) return false;

    try {
      if (requestKind === "link") {
        await pharmacyService.rejectPharmacyLoginAccountLink(
          accountId,
          appUser?.uid,
          appUser?.name,
          note
        );
      } else if (requestKind === "edit") {
        await pharmacyService.rejectPharmacyLoginAccountEdit(
          accountId,
          appUser?.uid,
          appUser?.name,
          note
        );
      } else {
        await pharmacyService.rejectPharmacyLoginAccount(
          accountId,
          appUser?.uid,
          appUser?.name,
          note
        );
      }

      await addActivityLog({
        type: "login_account_request_rejected",
        title:
          requestKind === "link"
            ? isArabic
              ? "رفض طلب ربط حساب"
              : "Login link request rejected"
            : requestKind === "edit"
              ? isArabic
                ? "رفض تعديل حساب دخول"
                : "Login account edit rejected"
              : isArabic
                ? "رفض حساب دخول"
                : "Login account rejected",
        description:
          requestKind === "link"
            ? isArabic
              ? `تم رفض ربط ${account.email} — الحساب يبقى غير مربوط`
              : `Rejected link for ${account.email} — account stays unlinked`
            : requestKind === "edit"
              ? isArabic
                ? `تم رفض تعديل ${account.email} — الحساب يبقى معتمداً`
                : `Rejected edit for ${account.email} — account stays approved`
              : isArabic
                ? `تم رفض ${account.email}`
                : `Rejected ${account.email}`,
        referenceType: "pharmacy_login_account",
        referenceId: accountId,
        pharmacyId: account.pharmacyId,
      });

      setPendingPharmacyLoginAccounts(
        await pharmacyService.getAllPharmacyLoginAccounts({ pendingApproval: true })
      );
      alert(
        requestKind === "link"
          ? isArabic
            ? "تم رفض طلب الربط"
            : "Link request rejected"
          : requestKind === "edit"
            ? isArabic
              ? "تم رفض التعديل — الحساب ما زال معتمداً"
              : "Edit rejected — account remains approved"
            : isArabic
              ? "تم رفض الحساب"
              : "Account rejected"
      );
      return true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      alert(
        isArabic
          ? `تعذر الرفض${message ? `: ${message}` : ""}`
          : `Could not reject${message ? `: ${message}` : ""}`
      );
      return false;
    }
  }

  async function handleRejectSubscriptionRequest(
    requestId: number,
    note?: string
  ): Promise<boolean> {
    if (!isSuperAdmin(appUser)) return false;

    const request = subscriptionRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") return false;

    try {
      await pharmacyService.updateSubscriptionRequestStatus(requestId, {
        status: "rejected",
        reviewedBy: appUser?.uid,
        reviewedByName: appUser?.name,
        reviewNote: note,
      });

      await addActivityLog({
        type: "subscription_request",
        title: isArabic ? "رفض طلب تجديد" : "Subscription renewal rejected",
        description: isArabic
          ? `تم رفض الطلب ${request.requestNumber}${note ? ` — ${note}` : ""}`
          : `Rejected request ${request.requestNumber}${note ? ` — ${note}` : ""}`,
        referenceType: "subscription_request",
        referenceId: String(requestId),
        pharmacyId: request.pharmacyId,
      });

      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      alert(isArabic ? "تم رفض الطلب" : "Request rejected");
      return true;
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر رفض الطلب" : "Could not reject request");
      return false;
    }
  }
 
function handleLogoUpload(file: File | null) {
  if (!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    alert(
      isArabic
        ? "يرجى اختيار صورة PNG أو JPG أو WebP"
        : "Please choose a PNG, JPG, or WebP image"
    );
    return;
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert(
      isArabic
        ? "حجم الصورة كبير. الحد الأقصى 2 ميجابايت"
        : "Image is too large. Maximum size is 2 MB"
    );
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    setSettingsForm((current) => ({
      ...current,
      logoBase64: String(reader.result || ""),
    }));
  };

  reader.onerror = () => {
    alert(isArabic ? "تعذر قراءة الصورة" : "Could not read the image");
  };

  reader.readAsDataURL(file);
}

  async function savePharmacySettings() {
  if (!canEditOrgWideSettings(appUser) && !isBranchManager(appUser)) {
    alert(isArabic ? "ليس لديك صلاحية لتعديل الإعدادات" : "You do not have permission to edit settings");
    return;
  }

  if (!settingsForm.name || !settingsForm.phone) {
    alert(isArabic ? "اسم الصيدلية ورقم الهاتف مطلوبان" : "Pharmacy name and phone are required");
    return;
  }

  const settingsUpdates: Partial<PharmacySettings> & { id: string } = {
    id: getPharmacyId(),
    name: settingsForm.name,
    name_en: settingsForm.name_en,
    phone: settingsForm.phone,
    address: settingsForm.address,
    isActive: true,
  };

  if (isBranchManager(appUser) && !canEditOrgWideSettings(appUser)) {
    settingsUpdates.invoiceFooter = settingsForm.invoiceFooter;
    settingsUpdates.logoBase64 = settingsForm.logoBase64;
  } else {
    const lowStockThresholdValue = Number(settingsForm.lowStockThreshold);
    const expiringSoonDaysValue = Number(settingsForm.expiringSoonDays);

    if (!Number.isFinite(lowStockThresholdValue) || lowStockThresholdValue < 0) {
      alert(isArabic ? "حد الكمية الناقصة غير صالح" : "Invalid low stock threshold");
      return;
    }

    if (!Number.isFinite(expiringSoonDaysValue) || expiringSoonDaysValue <= 0) {
      alert(isArabic ? "عدد أيام قرب انتهاء الصلاحية غير صالح" : "Invalid expiring soon days");
      return;
    }

    Object.assign(settingsUpdates, {
      currency: settingsForm.currency,
      invoiceFooter: settingsForm.invoiceFooter,
      logoBase64: settingsForm.logoBase64,
      lowStockThreshold: lowStockThresholdValue,
      expiringSoonDays: expiringSoonDaysValue,
      expiryNotifyEnabled: settingsForm.expiryNotifyEnabled,
      expiryNotifyPhone: settingsForm.expiryNotifyPhone.trim(),
      expiryNotifyEmail: settingsForm.expiryNotifyEmail.trim(),
    });
  }

  if (isSuperAdmin(appUser)) {
    settingsUpdates.subscriptionPlan = settingsForm.subscriptionPlan;
    settingsUpdates.subscriptionEndDate = settingsForm.subscriptionEndDate;
  }

  await pharmacyService.upsertPharmacySettings(getPharmacyId(), settingsUpdates);
  const refreshedSettings = await pharmacyService.getPharmacySettings(getPharmacyId());
  if (refreshedSettings) {
    setPharmacySettings(refreshedSettings);
  }
  await addActivityLog({
  type: "settings_update",
  title: isArabic ? "تعديل الإعدادات" : "Settings Updated",
  description: isArabic
    ? `تم تعديل بيانات الصيدلية ${settingsForm.name}`
    : `Pharmacy settings were updated: ${settingsForm.name}`,
  referenceType: "pharmacy",
  referenceId: getPharmacyId(),
});
  alert(isArabic ? "تم حفظ الإعدادات" : "Settings saved");
}

function getExpiryNotifySettingsSnapshot(): PharmacySettings | null {
  if (!pharmacySettings) return null;
  return {
    ...pharmacySettings,
    name: settingsForm.name || pharmacySettings.name,
    phone: settingsForm.phone || pharmacySettings.phone,
    expiringSoonDays: settingsForm.expiringSoonDays,
    expiryNotifyEnabled: settingsForm.expiryNotifyEnabled,
    expiryNotifyPhone: settingsForm.expiryNotifyPhone,
    expiryNotifyEmail: settingsForm.expiryNotifyEmail,
  };
}

function buildCurrentExpirySummary() {
  const notifySettings = getExpiryNotifySettingsSnapshot();
  return buildExpiryAlertSummary({
    medicines,
    branches,
    fallbackSettings: notifySettings,
    isArabic,
  });
}

function openInventoryExpiryView() {
  setActivePage("inventory");
  setInventoryStatusFilter("expiring");
  setQuery("");
}

async function handleRequestExpiryNotificationPermission() {
  const granted = await requestExpiryNotificationPermission();
  alert(
    granted
      ? isArabic
        ? "تم تفعيل إشعارات المتصفح"
        : "Browser notifications enabled"
      : isArabic
        ? "لم يتم منح إذن الإشعارات"
        : "Notification permission was not granted"
  );
  return granted;
}

async function handleSendExpiryNotifyNow() {
  const notifySettings = getExpiryNotifySettingsSnapshot();
  if (!notifySettings) return;
  const summary = await notifyExpiryAlerts({
    pharmacyId: getPharmacyId(),
    pharmacyName: notifySettings.name || getPharmacyId(),
    medicines,
    branches,
    settings: notifySettings,
    isArabic,
    force: true,
    onOpenInventory: openInventoryExpiryView,
  });
  if (!summary?.hasAlerts) {
    alert(
      isArabic
        ? "لا توجد أدوية منتهية أو قرب انتهاء الصلاحية حالياً"
        : "No expired or expiring medicines right now"
    );
    return;
  }
  alert(
    isArabic
      ? `تم إرسال التنبيه: ${summary.expiredCount} منتهي، ${summary.expiringCount} قرب الانتهاء`
      : `Alert sent: ${summary.expiredCount} expired, ${summary.expiringCount} expiring soon`
  );
}

function handleOpenExpiryWhatsappDigest() {
  const notifySettings = getExpiryNotifySettingsSnapshot();
  if (!notifySettings) return;
  const summary = buildCurrentExpirySummary();
  const message = formatExpiryAlertMessage(summary, {
    pharmacyName: notifySettings.name || getPharmacyId(),
    expiringSoonDays: getExpiringSoonDays(notifySettings),
    isArabic,
  });
  const phone = resolveExpiryNotifyPhone(notifySettings);
  window.open(getExpiryWhatsappUrl(message, phone), "_blank", "noopener,noreferrer");
}

function handleOpenExpiryEmailDigest() {
  const notifySettings = getExpiryNotifySettingsSnapshot();
  if (!notifySettings) return;
  const email = resolveExpiryNotifyEmail(notifySettings);
  if (!email) {
    alert(isArabic ? "أدخل بريد التنبيهات أولاً" : "Enter an alert email first");
    return;
  }
  const summary = buildCurrentExpirySummary();
  const url = getExpiryMailtoUrl(summary, {
    pharmacyName: notifySettings.name || getPharmacyId(),
    expiringSoonDays: getExpiringSoonDays(notifySettings),
    email,
    isArabic,
  });
  if (url) window.location.href = url;
}

  function getPaymentLabel(method: string) {
    if (method === "cash") return isArabic ? "كاش" : "Cash";
    if (method === "visa") return isArabic ? "فيزا" : "Visa";
    if (method === "wallet") return isArabic ? "محفظة" : "Wallet";
    if (method === "credit") return isArabic ? "آجل" : "Credit";
    return method;
  }

  function getSubscriptionPlanLabel(plan: string) {
  const targetTier = parseTierUpgradePlan(plan);
  if (targetTier) {
    return isArabic
      ? `ترقية إلى ${getSubscriptionTierLabel(targetTier, true)}`
      : `Upgrade to ${getSubscriptionTierLabel(targetTier, false)}`;
  }
  if (plan === "trial") {
    return isArabic
      ? `تجريبي ${TRIAL_SUBSCRIPTION_DAYS} يوم`
      : `${TRIAL_SUBSCRIPTION_DAYS}-day trial`;
  }
  if (plan === "monthly") return isArabic ? "شهري" : "Monthly";
  if (plan === "quarterly") return isArabic ? "ربع سنوي" : "Quarterly";
  if (plan === "yearly") return isArabic ? "سنوي" : "Yearly";
  if (plan === "lifetime") return isArabic ? "مدى الحياة" : "Lifetime";
  return plan || "-";
}
  
function hasRole(roles: UserRole[]) {
  return checkUserRole(appUser, roles);
}

function canUseSystemActions() {
  return !isSubscriptionExpired;
}

function showSubscriptionExpiredAlert() {
  alert(
    isArabic
      ? "الاشتراك منتهي، يرجى التجديد لاستمرار استخدام النظام"
      : "Subscription expired. Please renew to continue using the system"
  );
}

function canManageInventory() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory"]);
}

function canUsePurchases() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory"]);
}

function canManageCosts() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "accountant"]);
}

function canViewReports() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "accountant"]);
}

function canViewStockMovements() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "inventory", "accountant"]);
}

function canViewActivityLogs() {
  return canViewOrgActivityLogs(appUser);
}

function canManageUsers() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin"]);
}

function canDeleteMedicine() {
  return canDeleteMedicines(appUser);
}

function canViewInvoices() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier", "accountant"]);
}

function canViewCustomers() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier", "accountant"]);
}

function canUsePOS() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier"]);
}
function canUseReturns() {
  return hasRole(["pharmacy_admin", "branch_manager", "super_admin", "cashier"]);
}

function canDeleteReturn() {
  return canDeleteReturns(appUser);
}

function canDeletePurchase() {
  return canDeletePurchases(appUser);
}

function findMedicineForReturnItem(
  item: NonNullable<ReturnRecord["items"]>[number],
  medicinesList: Medicine[]
) {
  const medicineId = item.medicineId;
  let found = medicinesList.find((medicine) => String(medicine.id) === String(medicineId));
  if (found) return found;

  if (item.barcode) {
    found = medicinesList.find((medicine) => medicine.barcode === item.barcode);
  }

  return found;
}
function canOpenPage(page: Page) {
  if (!appUser) return false;
  return getAllowedPages(appUser).includes(page);
}
function getPharmacyId() {
  if (activeBranchId && !isAllBranchesMode(activeBranchId)) {
    return activeBranchId;
  }
  return appUser?.pharmacyId || "default-pharmacy";
}

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
}, [appUser?.uid, appUser?.pharmacyId, activeBranchId]);

useEffect(() => {
  void refreshActiveCashierShift();
}, [refreshActiveCashierShift]);

const refreshOfflinePosMeta = useCallback(async () => {
  const pharmacyId = getPharmacyId();
  if (!pharmacyId || isAllBranchesMode(pharmacyId)) {
    setPendingOfflineSalesCount(0);
    setOfflineMedicinesCacheAt(null);
    return;
  }
  try {
    const [pendingCount, cached] = await Promise.all([
      countPendingOfflineSales(pharmacyId),
      loadCachedMedicines(pharmacyId),
    ]);
    setPendingOfflineSalesCount(pendingCount);
    setOfflineMedicinesCacheAt(cached.updatedAt);
  } catch (error) {
    console.warn("refreshOfflinePosMeta:", error);
  }
}, [appUser?.pharmacyId, activeBranchId]);

useEffect(() => {
  if (!appUser) return;
  void refreshOfflinePosMeta();
}, [appUser?.uid, activeBranchId, refreshOfflinePosMeta]);

useEffect(() => {
  if (!isOnline) {
    wasOfflineRef.current = true;
    return;
  }
  if (!wasOfflineRef.current || !appUser) return;
  wasOfflineRef.current = false;

  const pharmacyId = getPharmacyId();
  if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

  setIsSyncingOfflineSales(true);
  void syncPendingOfflineSales(pharmacyId)
    .then(async (result) => {
      if (result.synced > 0) {
        await refreshMedicinesFromDb();
        if (activeCashierShift) {
          await refreshActiveCashierShift();
        }
      }
      if (result.synced > 0 || result.failed > 0) {
        await refreshOfflinePosMeta();
      }
      if (result.synced > 0) {
        alert(
          isArabic
            ? `تمت مزامنة ${result.synced} فاتورة محفوظة محلياً`
            : `Synced ${result.synced} locally saved invoice(s)`
        );
      }
      if (result.failed > 0) {
        const firstError = result.errors[0]?.message || "";
        alert(
          isArabic
            ? `تعذرت مزامنة ${result.failed} فاتورة. ${firstError}`
            : `Could not sync ${result.failed} invoice(s). ${firstError}`
        );
      }
    })
    .catch((error) => {
      console.error("Offline sync error:", error);
    })
    .finally(() => {
      setIsSyncingOfflineSales(false);
    });
}, [isOnline, appUser?.uid, activeBranchId]);

useEffect(() => {
  if (isOnline || !appUser) return;
  const pharmacyId = getPharmacyId();
  if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

  void loadCachedMedicines(pharmacyId).then(({ medicines: cached, updatedAt }) => {
    if (cached.length > 0) {
      setMedicines(cached);
    }
    setOfflineMedicinesCacheAt(updatedAt);
  });
}, [isOnline, appUser?.uid, activeBranchId]);

useEffect(() => {
  if (!isOnline || medicines.length === 0 || !appUser) return;
  const pharmacyId = getPharmacyId();
  if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

  void cacheMedicinesSnapshot(pharmacyId, medicines).then(() => {
    setOfflineMedicinesCacheAt(new Date().toISOString());
  });
}, [isOnline, medicines, appUser?.uid, activeBranchId]);

useEffect(() => {
  if (isOnline || paymentMethod !== "credit") return;
  setPaymentMethod("cash");
  setCustomerName("");
}, [isOnline, paymentMethod]);

  function addToCart(medicine: Medicine) {
    if (isViewingAllBranches) {
      alert(
        isArabic
          ? "اختر فرعاً محدداً من القائمة العلوية قبل البيع"
          : "Select a specific branch from the top menu before selling"
      );
      return false;
    }

    if (medicine.qty <= 0) {
      alert(isArabic ? "هذا الدواء غير متوفر في المخزون" : "This medicine is out of stock");
      return false;
    }

    const found = cart.find((item) => item.id === medicine.id);
    if (found && found.cartQty >= medicine.qty) {
      alert(isArabic ? "لا توجد كمية كافية في المخزون" : "Not enough stock");
      return false;
    }

    setCart((oldCart) => {
      const existing = oldCart.find((item) => item.id === medicine.id);

      if (existing) {
        return oldCart.map((item) =>
          item.id === medicine.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      }

      return [...oldCart, { ...medicine, cartQty: 1 }];
    });
    return true;
  }

  function changeQty(id: number, delta: number) {
    setCart((oldCart) =>
      oldCart.map((item) => {
        if (item.id !== id) return item;
        const medicineInStock = medicines.find((m) => m.id === id);
        const maxQty = medicineInStock ? medicineInStock.qty : item.cartQty;
        const newQty = Math.max(1, item.cartQty + delta);

        if (newQty > maxQty) {
          alert(isArabic ? "لا توجد كمية كافية في المخزون" : "Not enough stock");
          return item;
        }

        return { ...item, cartQty: newQty };
      })
    );
  }

  function removeItem(id: number) {
    setCart((oldCart) => oldCart.filter((item) => item.id !== id));
  }

async function addActivityLog(data: {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
}) {
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
}

  async function saveMedicine(): Promise<boolean> {
    if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return false;
  }
    if (!canManageInventory()) {
  alert(isArabic ? "ليس لديك صلاحية لإدارة المخزون" : "You do not have permission to manage inventory");
  return false;
}
    if (!newMedicine.name_ar || !newMedicine.name_en || !newMedicine.barcode || !newMedicine.expiry) {
      alert(isArabic ? "من فضلك أكمل بيانات الدواء" : "Please complete medicine data");
      return false;
    }

    if (newMedicine.qty < 0 || (newMedicine.buyPrice ?? -1) < 0 || newMedicine.price <= 0) {
      alert(isArabic ? "تأكد من الكمية وسعر الشراء وسعر البيع" : "Check quantity, buy price and sell price");
      return false;
    }

    const barcodeExists = medicines.find(
      (medicine) => medicine.barcode === newMedicine.barcode && medicine.id !== editingMedicineId
    );

    if (barcodeExists) {
      alert(isArabic ? "الباركود موجود بالفعل" : "Barcode already exists");
      return false;
    }

    const wasEditing = Boolean(editingMedicineId);
    const medicineId = editingMedicineId || Date.now();
    const medicine: Medicine = {
  id: medicineId,
  name_ar: newMedicine.name_ar,
  name_en: newMedicine.name_en,
  barcode: newMedicine.barcode,
  qty: Number(newMedicine.qty),
  buyPrice: Number(newMedicine.buyPrice),
  price: Number(newMedicine.price),
  expiry: newMedicine.expiry,
};

    try {
      const oldMedicine = medicines.find((m) => m.id === medicineId);
      if (editingMedicineId) {
        await pharmacyService.updateMedicine(medicineId, medicine);
      } else {
        await pharmacyService.addMedicine(medicine);
      }

      try {
        await pharmacyService.addStockMovement({
          id: Date.now(),
          type: wasEditing ? "medicine_update" : "medicine_create",
          medicineId,
          medicineName_ar: medicine.name_ar,
          medicineName_en: medicine.name_en,
          barcode: medicine.barcode,
          quantityChange: oldMedicine ? medicine.qty - oldMedicine.qty : medicine.qty,
          qtyBefore: oldMedicine ? oldMedicine.qty : 0,
          qtyAfter: medicine.qty,
          pharmacyId: getPharmacyId(),
          userId: user?.uid || "",
          userName: appUser?.name || "",
          createdAt: new Date().toISOString(),
        });
      } catch (movementError) {
        console.error("Stock movement log failed:", movementError);
      }

      await addActivityLog({
        type: wasEditing ? "medicine_update" : "medicine_create",
        title: wasEditing
          ? isArabic
            ? "تعديل دواء"
            : "Medicine Updated"
          : isArabic
          ? "إضافة دواء"
          : "Medicine Created",
        description: wasEditing
          ? isArabic
            ? `تم تعديل بيانات الدواء ${medicine.name_ar}`
            : `Medicine ${medicine.name_en} was updated`
          : isArabic
          ? `تمت إضافة الدواء ${medicine.name_ar} بكمية ${medicine.qty}`
          : `Medicine ${medicine.name_en} was created with quantity ${medicine.qty}`,
        referenceType: "medicine",
        referenceId: String(medicineId),
      });

      setMedicines(await pharmacyService.getMedicines());
      setNewMedicine(emptyMedicineForm);
      setEditingMedicineId(null);
      alert(
        wasEditing
          ? isArabic
            ? "تم تعديل الدواء بنجاح"
            : "Medicine updated successfully"
          : isArabic
          ? "تمت إضافة الدواء بنجاح"
          : "Medicine added successfully"
      );
      return true;
    } catch (error) {
      console.error("saveMedicine error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
          ? "حدث خطأ أثناء حفظ الدواء"
          : "Failed to save medicine"
      );
      return false;
    }
  }

  async function handleApplyStockCount(session: StockCountSession) {
    const varianceLines = getVarianceLines(session);
    const result = await pharmacyService.applyStockCountAdjustments({
      pharmacyId: getPharmacyId(),
      userId: user?.uid,
      userName: appUser?.name,
      notes: session.notes,
      lines: varianceLines.map((line) => ({
        medicineId: line.medicineId,
        medicineName_ar: line.name_ar,
        medicineName_en: line.name_en,
        barcode: line.barcode,
        systemQty: line.systemQty,
        countedQty: line.countedQty,
      })),
    });

    await addActivityLog({
      type: "stock_count",
      title: isArabic ? "تسوية جرد مخزون" : "Stock count adjustment",
      description: isArabic
        ? `تم تسوية ${result.adjustedCount} صنف — فرق الكمية ${result.totalVariance > 0 ? "+" : ""}${result.totalVariance}`
        : `Adjusted ${result.adjustedCount} items — qty diff ${result.totalVariance > 0 ? "+" : ""}${result.totalVariance}`,
      referenceType: "stock_count",
      referenceId: session.id,
    });

    setMedicines(await pharmacyService.getMedicines());
    setStockMovements(await pharmacyService.getStockMovements());
    alert(
      isArabic
        ? `تمت تسوية الجرد بنجاح (${result.adjustedCount} صنف)`
        : `Stock count applied (${result.adjustedCount} items)`
    );
  }

  function startEditMedicine(medicine: Medicine) {
    setEditingMedicineId(medicine.id);
    setNewMedicine({
  name_ar: medicine.name_ar,
  name_en: medicine.name_en,
  barcode: medicine.barcode,
  qty: medicine.qty,
  buyPrice: medicine.buyPrice || 0,
  price: medicine.price,
  expiry: medicine.expiry,
});
    setActivePage("inventory");
  }

  function cancelEditMedicine() {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
  }

  function openAddMedicineForm() {
    setEditingMedicineId(null);
    setNewMedicine(emptyMedicineForm);
  }

  async function deleteMedicine(medicine: Medicine) {
    if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }
    if (!canDeleteMedicine()) {
  alert(isArabic ? "ليس لديك صلاحية لحذف الأدوية" : "You do not have permission to delete medicines");
  return;
}
    const confirmDelete = window.confirm(
      isArabic ? `هل أنت متأكد من حذف ${medicine.name_ar}؟` : `Are you sure you want to delete ${medicine.name_en}?`
    );

    if (!confirmDelete) return;
    await pharmacyService.addStockMovement({
      type: "medicine_delete",
      medicineId: medicine.id,
      medicineName_ar: medicine.name_ar,
      medicineName_en: medicine.name_en,
      barcode: medicine.barcode,
      quantityChange: -medicine.qty,
      qtyBefore: medicine.qty,
      qtyAfter: 0,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      createdAt: new Date().toISOString(),
    });
    await pharmacyService.deleteMedicine(medicine.id);

await addActivityLog({
  type: "medicine_delete",
  title: isArabic ? "حذف دواء" : "Medicine Deleted",
  description: isArabic
    ? `تم حذف الدواء ${medicine.name_ar} وكانت الكمية ${medicine.qty}`
    : `Medicine ${medicine.name_en} was deleted with quantity ${medicine.qty}`,
  referenceType: "medicine",
  referenceId: String(medicine.id),
});

alert(isArabic ? "تم حذف الدواء" : "Medicine deleted");
  }

  function printSavedInvoice(invoice: Invoice) {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;

  let y = addPdfHeader(
    docPdf,
    isArabic ? "فاتورة بيع" : "Sales Invoice",
    `${invoice.invoiceNumber || `#${invoice.id}`} - ${invoice.date || ""}`
  );

    docPdf.setFontSize(10);
docPdf.setFillColor(248, 250, 252);
docPdf.rect(margin, y, pageWidth - margin * 2, 32, "F");
docPdf.rect(margin, y, pageWidth - margin * 2, 32);

docPdf.text(
  `${pdfLabel("رقم الفاتورة", "Invoice No")}: ${invoice.invoiceNumber || `#${invoice.id}`}`,
  margin + 4,
  y + 9
);

docPdf.text(
  `${pdfLabel("التاريخ", "Date")}: ${invoice.date || ""}`,
  margin + 4,
  y + 18
);

docPdf.text(
  `${pdfLabel("طريقة الدفع", "Payment")}: ${getPaymentLabel(invoice.paymentMethod || "cash")}`,
  margin + 4,
  y + 27
);

if ((invoice as any).customerName) {
  docPdf.text(
    `${pdfLabel("العميل", "Customer")}: ${(invoice as any).customerName}`,
    pageWidth / 2,
    y + 9
  );
}

if ((invoice as any).cashierName) {
  docPdf.text(
    `${pdfLabel("الكاشير", "Cashier")}: ${(invoice as any).cashierName}`,
    pageWidth / 2,
    y + 18
  );
}

y += 42;

    const colX = {
      item: margin,
      barcode: margin + 65,
      qty: margin + 115,
      unit: margin + 135,
      total: margin + 165,
    };

    docPdf.setFontSize(10);
docPdf.setFillColor(229, 244, 238);
docPdf.rect(margin, y, pageWidth - margin * 2, 10, "F");
docPdf.rect(margin, y, pageWidth - margin * 2, 10);

docPdf.text(pdfLabel("الصنف", "Item"), colX.item + 2, y + 7);
docPdf.text(pdfLabel("الباركود", "Barcode"), colX.barcode + 2, y + 7);
docPdf.text(pdfLabel("الكمية", "Qty"), colX.qty + 2, y + 7);
docPdf.text(pdfLabel("السعر", "Unit"), colX.unit + 2, y + 7);
docPdf.text(pdfLabel("الإجمالي", "Total"), colX.total + 2, y + 7);

y += 11;

    invoice.items?.forEach((item, index) => {
      const name = isArabic ? item.name_ar : item.name_en;
      const shortName = name.length > 28 ? `${name.slice(0, 28)}...` : name;

      if (y > 270) {
        docPdf.addPage();
        y = 15;
      }

      if (index % 2 === 0) {
  docPdf.setFillColor(252, 252, 253);
  docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10, "F");
}

      docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10);

      docPdf.text(`${index + 1}. ${shortName}`, colX.item + 2, y + 5);
      docPdf.text(String(item.barcode || ""), colX.barcode + 2, y + 5);
      docPdf.text(String(item.quantity || 0), colX.qty + 2, y + 5);
      docPdf.text(safeNumber(item.unitPrice).toFixed(2), colX.unit + 2, y + 5);
      docPdf.text(safeNumber(item.lineTotal).toFixed(2), colX.total + 2, y + 5);

      y += 10;
    });

    y += 8;
    const totalsX = pageWidth - 78;
    docPdf.setFontSize(11);
    docPdf.setFillColor(248, 250, 252);
    docPdf.rect(totalsX, y, 68, 36, "F");
    docPdf.rect(totalsX, y, 68, 36);
    docPdf.text(
  `${pdfLabel("قبل الخصم", "Subtotal")}:`,
  totalsX + 4,
  y + 8
);

docPdf.text(
  `${(invoice.subtotal || invoice.total || 0).toFixed(2)} ${t.currency}`,
  totalsX + 36,
  y + 8
);

docPdf.text(
  `${pdfLabel("الخصم", "Discount")}:`,
  totalsX + 4,
  y + 18
);

docPdf.text(
  `${(invoice.discount || 0).toFixed(2)} ${t.currency}`,
  totalsX + 34,
  y + 18
);

docPdf.setFontSize(12);

docPdf.text(
  `${pdfLabel("الإجمالي", "Total")}:`,
  totalsX + 4,
  y + 29
);

docPdf.text(
  `${(invoice.total || 0).toFixed(2)} ${t.currency}`,
  totalsX + 34,
  y + 29
);
    addPdfFooter(docPdf, y);

    docPdf.save(`${invoice.invoiceNumber || invoice.id}.pdf`);
  }

  async function completeSale() {
    if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }
  if (!canUsePOS()) {
    alert(
      isArabic
        ? "ليس لديك صلاحية للبيع"
        : "You do not have permission to sell"
    );
    return;
  }

  if (cart.length === 0) {
    alert(t.emptyCart);
    return;
  }

  if (discount > subtotal) {
  alert(isArabic ? "الخصم لا يمكن أن يكون أكبر من إجمالي السلة" : "Discount cannot be greater than subtotal");
  return;
}

if (paymentMethod === "credit" && !customerName.trim()) {
  alert(isArabic ? "من فضلك أدخل اسم العميل في حالة البيع الآجل" : "Please enter customer name for credit sale");
  return;
}

if (!navigator.onLine && paymentMethod === "credit") {
  alert(
    isArabic
      ? "البيع الآجل غير متاح بدون اتصال بالإنترنت"
      : "Credit sales are not available while offline"
  );
  return;
}

  if (isSelling) return;

  if (
    appUser?.role === "cashier" &&
    !activeCashierShift &&
    !window.confirm(
      isArabic
        ? "لم تفتح وردية كاشير. هل تريد إتمام البيع بدون وردية؟"
        : "No cashier shift is open. Complete sale without a shift?"
    )
  ) {
    return;
  }

  try {
    setIsSelling(true);

    const invoiceId = Date.now();
    const invoiceNumber = `INV-${invoiceId}`;

    const invoiceItems: InvoiceItem[] = cart.map((item) => {
  const buyPrice = item.buyPrice || 0;
  const unitPrice = item.price || 0;
  const lineTotal = unitPrice * item.cartQty;
  const costTotal = buyPrice * item.cartQty;

  return {
    invoiceId,
    medicineId: item.id,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.cartQty,
    buyPrice,
    unitPrice,
    lineTotal,
    costTotal,
    profit: lineTotal - costTotal,
  };
});
const totalCost = invoiceItems.reduce(
  (sum, item) => sum + item.costTotal,
  0
);

const totalProfit = total - totalCost;
    const invoice = {
  id: invoiceId,
  invoiceNumber,
  pharmacyId: getPharmacyId(),
  cashierId: user?.uid || "",
  cashierName: appUser?.name || "",
  shiftId: currentWorkShiftId || undefined,
  cashierShiftId: activeCashierShift?.id,
  customerName: customerName.trim(),
  date: new Date().toLocaleString(),
  createdAt: new Date().toISOString(),
  items: invoiceItems,
  subtotal,
  discount: safeDiscount,
  total,
  totalCost,
  totalProfit,
  paymentMethod,
};

    const stockMovements = cart.map((item) => ({
      id: Date.now() + item.id,
      type: "sale",
      medicineId: item.id,
      medicineName_ar: item.name_ar,
      medicineName_en: item.name_en,
      barcode: item.barcode,
      quantityChange: -item.cartQty,
      qtyBefore: item.qty,
      qtyAfter: item.qty - item.cartQty,
      invoiceNumber,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      createdAt: new Date().toISOString(),
    }));

    if (!navigator.onLine) {
      const shortItem = cart.find((item) => item.cartQty > item.qty);
      if (shortItem) {
        alert(
          isArabic
            ? `الكمية غير كافية في النسخة المحلية: ${shortItem.name_ar || shortItem.name_en}`
            : `Insufficient cached stock: ${shortItem.name_en || shortItem.name_ar}`
        );
        return;
      }

      const pharmacyId = getPharmacyId();
      await queueOfflineSale({
        pharmacyId,
        cart: cart.map((item) => ({ ...item })),
        invoice: invoice as Invoice,
      });

      const updatedMedicines = applyOptimisticStockDeduction(medicines, cart);
      setMedicines(updatedMedicines);
      await cacheMedicinesSnapshot(pharmacyId, updatedMedicines);
      setOfflineMedicinesCacheAt(new Date().toISOString());
      setPendingOfflineSalesCount(await countPendingOfflineSales(pharmacyId));

      printSavedInvoice(invoice as Invoice);
      setCart([]);
      setDiscount(0);
      setPaymentMethod("cash");
      setCustomerName("");

      alert(
        isArabic
          ? `تم حفظ البيع محلياً (${invoiceNumber}). سيتم رفعه تلقائياً عند عودة الاتصال.`
          : `Sale saved locally (${invoiceNumber}). It will upload automatically when you are back online.`
      );
      return;
    }

    await pharmacyService.completeSaleWithStockDeduction(cart, invoice as Invoice, stockMovements);
    await refreshMedicinesFromDb();
    if (activeCashierShift) {
      await refreshActiveCashierShift();
    }
    if (user?.uid) {
      void pharmacyService
        .syncCashierPayrollCommissionAfterSale({
          cashierUserId: user.uid,
          cashierName: appUser?.name || "",
          pharmacyId: getPharmacyId(),
        })
        .catch((commissionError) => {
          console.warn("Cashier commission sync skipped:", commissionError);
        });
    }

    await addActivityLog({
  type: "sale",
  title: isArabic ? "تسجيل بيع" : "Sale Created",
  description: isArabic
    ? `تم تسجيل فاتورة بيع رقم ${invoiceNumber} بإجمالي ${total.toFixed(2)} ${t.currency}`
    : `Sale invoice ${invoiceNumber} created with total ${total.toFixed(2)} ${t.currency}`,
  referenceType: "invoice",
  referenceId: invoiceNumber,
});

printSavedInvoice(invoice as Invoice);

setCart([]);
setDiscount(0);
setPaymentMethod("cash");
setCustomerName("");

    alert(
      isArabic
        ? `تم تسجيل البيع برقم ${invoiceNumber}`
        : `Sale ${invoiceNumber} completed`
    );
  } catch (error) {
    console.error("Complete sale error:", error);

    alert(
      error instanceof Error
        ? error.message === "cashier_shift_invalid"
          ? isArabic
            ? "الوردية غير صالحة أو مغلقة. افتح وردية جديدة من نقطة البيع."
            : "Cashier shift is invalid or closed. Open a new shift from POS."
          : error.message
        : isArabic
        ? "حصل خطأ أثناء تسجيل البيع"
        : "An error occurred while completing the sale"
    );
  } finally {
    setIsSelling(false);
  }
}

async function refreshHeldInvoices() {
  try {
    const rows = await pharmacyService.getHeldInvoices(getPharmacyId());
    setHeldInvoices(rows);
    return rows;
  } catch (error) {
    console.error("Refresh held invoices error:", error);
    throw error;
  }
}

function getHeldInvoiceErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "held_invoices_table_missing") {
    return isArabic
      ? "جدول الفواتير المعلقة غير موجود في Supabase. شغّل الملف: supabase/held-invoices-and-instant-return.sql"
      : "Held invoices table is missing. Run supabase/held-invoices-and-instant-return.sql";
  }
  if (message === "held_invoice_not_found") {
    return isArabic
      ? "الفاتورة المعلقة غير موجودة أو لا يمكن الوصول إليها"
      : "Held invoice not found or not accessible";
  }
  if (message === "held_invoice_not_active") {
    return isArabic
      ? "هذه الفاتورة لم تعد معلقة (تم استرجاعها أو حذفها مسبقاً)"
      : "This invoice is no longer held";
  }
  if (message === "held_invoice_id_missing") {
    return isArabic ? "معرّف الفاتورة المعلقة غير صالح" : "Invalid held invoice id";
  }
  return message || (isArabic ? "تعذر تحميل الفواتير المعلقة" : "Could not load held invoices");
}

async function openHeldInvoicesModal() {
  try {
    await refreshHeldInvoices();
    setShowHeldInvoicesModal(true);
  } catch (error) {
    alert(getHeldInvoiceErrorMessage(error));
  }
}

async function handleHoldInvoice() {
  if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }
  if (!canUsePOS()) {
    alert(isArabic ? "ليس لديك صلاحية للبيع" : "You do not have permission to sell");
    return;
  }
  if (!navigator.onLine) {
    alert(
      isArabic
        ? "تعليق الفاتورة يتطلب اتصالاً بالإنترنت"
        : "Holding invoices requires an internet connection"
    );
    return;
  }
  if (cart.length === 0 || isHolding) return;

  try {
    setIsHolding(true);
    const holdNumber = `HOLD-${Date.now()}`;
    const held = await pharmacyService.holdInvoice({
      holdNumber,
      customerName: customerName.trim(),
      cartItems: cart,
      subtotal,
      discount: safeDiscount,
      total,
      paymentMethod,
      createdBy: user?.uid,
      createdByName: appUser?.name,
    });

    await addActivityLog({
      type: "hold_invoice",
      title: isArabic ? "تعليق فاتورة" : "Hold Invoice",
      description: isArabic
        ? `تم تعليق فاتورة مؤقتة بإجمالي ${total.toFixed(2)} ${t.currency}`
        : `Held temporary invoice with total ${total.toFixed(2)} ${t.currency}`,
      referenceType: "held_invoice",
      referenceId: held.id,
    });

    setCart([]);
    setDiscount(0);
    setPaymentMethod("cash");
    setCustomerName("");
    setHeldInvoices((prev) => [held, ...prev.filter((item) => item.id !== held.id)]);
    try {
      await refreshHeldInvoices();
    } catch (refreshError) {
      console.error("Held invoices refresh after hold:", refreshError);
    }
    alert(isArabic ? "تم تعليق الفاتورة بنجاح" : "Invoice held successfully");
  } catch (error) {
    console.error("Hold invoice error:", error);
    alert(getHeldInvoiceErrorMessage(error));
  } finally {
    setIsHolding(false);
  }
}

async function handleResumeHeldInvoice(held: HeldInvoice) {
  if (!canUsePOS()) {
    alert(isArabic ? "ليس لديك صلاحية للبيع" : "You do not have permission to sell");
    return;
  }
  if (isHeldInvoiceProcessing) return;

  if (cart.length > 0) {
    const confirmReplace = window.confirm(
      isArabic
        ? "السلة الحالية تحتوي على أصناف. هل تريد استبدالها بالفاتورة المعلقة؟"
        : "Current cart has items. Replace with held invoice?"
    );
    if (!confirmReplace) return;
  }

  try {
    setIsHeldInvoiceProcessing(true);
    const resumed = await pharmacyService.resumeHeldInvoice(held.id, held);

    const restoredCart = (resumed.cartItems || []).map((item) => {
      const medicineId = item.id ?? (item as { medicineId?: number }).medicineId;
      const cartQty = item.cartQty ?? (item as { quantity?: number }).quantity ?? 1;
      const currentMedicine = medicines.find(
        (medicine) => medicine.id === medicineId || medicine.id === Number(medicineId)
      );
      if (currentMedicine) {
        return { ...currentMedicine, cartQty: Number(cartQty) };
      }
      return { ...item, id: Number(medicineId), cartQty: Number(cartQty) };
    });

    setCart(restoredCart);
    setDiscount(Number(resumed.discount) || 0);
    setPaymentMethod(resumed.paymentMethod || "cash");
    setCustomerName(resumed.customerName || "");
    setHeldInvoices((prev) => prev.filter((row) => row.id !== resumed.id));
    setShowHeldInvoicesModal(false);

    await addActivityLog({
      type: "resume_held_invoice",
      title: isArabic ? "استرجاع فاتورة معلقة" : "Resume Held Invoice",
      description: isArabic
        ? `تم استرجاع الفاتورة المعلقة ${resumed.holdNumber} بإجمالي ${(resumed.total || 0).toFixed(2)} ${t.currency}`
        : `Resumed held invoice ${resumed.holdNumber} with total ${(resumed.total || 0).toFixed(2)} ${t.currency}`,
      referenceType: "held_invoice",
      referenceId: resumed.id,
    });
  } catch (error) {
    console.error("Resume held invoice error:", error);
    alert(getHeldInvoiceErrorMessage(error));
  } finally {
    setIsHeldInvoiceProcessing(false);
  }
}

async function handleDeleteHeldInvoice(held: HeldInvoice) {
  if (isHeldInvoiceProcessing) return;

  const confirmDelete = window.confirm(
    isArabic
      ? `هل أنت متأكد من حذف الفاتورة المعلقة ${held.holdNumber}؟`
      : `Delete held invoice ${held.holdNumber}?`
  );
  if (!confirmDelete) return;

  try {
    setIsHeldInvoiceProcessing(true);
    const invoiceId = String(held.id || "").trim();
    if (!invoiceId) {
      throw new Error("held_invoice_id_missing");
    }

    await pharmacyService.deleteHeldInvoice(invoiceId);
    setHeldInvoices((prev) => prev.filter((row) => row.id !== invoiceId));

    await addActivityLog({
      type: "delete_held_invoice",
      title: isArabic ? "حذف فاتورة معلقة" : "Delete Held Invoice",
      description: isArabic
        ? `تم حذف الفاتورة المعلقة ${held.holdNumber}`
        : `Deleted held invoice ${held.holdNumber}`,
      referenceType: "held_invoice",
      referenceId: invoiceId,
    });

    try {
      await refreshHeldInvoices();
    } catch (refreshError) {
      console.error("Held invoices refresh after delete:", refreshError);
    }

    alert(isArabic ? "تم حذف الفاتورة المعلقة" : "Held invoice deleted");
  } catch (error) {
    console.error("Delete held invoice error:", error);
    alert(getHeldInvoiceErrorMessage(error));
  } finally {
    setIsHeldInvoiceProcessing(false);
  }
}

async function refreshMedicinesFromDb() {
  setMedicines(await pharmacyService.getMedicines());
}

async function refreshBranchTransfers() {
  setBranchTransfers(await pharmacyService.getBranchStockTransfers());
}

async function handleBranchTransferComplete() {
  await refreshMedicinesFromDb();
  setStockMovements(await pharmacyService.getStockMovements());
  await refreshBranchTransfers();
}

function formatBranchTransferActionError(message: string): string {
  const map: Record<string, [string, string]> = {
    transfer_not_found: ["طلب النقل غير موجود", "Transfer request not found"],
    not_pending: ["هذا الطلب ليس بانتظار الاعتماد", "This request is not pending approval"],
    medicine_not_found: ["الدواء غير موجود في الفرع المصدر", "Medicine not found in source branch"],
    insufficient_stock: ["الكمية غير متوفرة في الفرع المصدر", "Insufficient stock in source branch"],
    target_medicine_missing: ["تعذر إنشاء الدواء في الفرع الهدف", "Could not create medicine in target branch"],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  return message;
}

async function handleApproveBranchTransfer(transferNumber: string) {
  const confirmed = window.confirm(
    isArabic
      ? `اعتماد طلب النقل ${transferNumber} وتنفيذ حركة المخزون؟`
      : `Approve transfer ${transferNumber} and move stock?`
  );
  if (!confirmed) return;
  try {
    const results = await pharmacyService.approveBranchStockTransferBatch({
      transferNumber,
      userId: user?.uid,
      userName: appUser?.name,
    });
    await handleBranchTransferComplete();
    alert(
      isArabic
        ? `تم اعتماد النقل (${results.length} صنف)`
        : `Transfer approved (${results.length} item(s))`
    );
    const shouldPrint = window.confirm(
      isArabic ? "هل تريد طباعة سند النقل؟" : "Print the transfer document?"
    );
    if (shouldPrint) printBranchTransferRecords(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "approve_failed";
    alert(formatBranchTransferActionError(message));
  }
}

async function handleRejectBranchTransfer(transferNumber: string) {
  const rejectionReason = window.prompt(
    isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):"
  );
  if (rejectionReason === null) return;
  try {
    await pharmacyService.rejectBranchStockTransferBatch({
      transferNumber,
      userId: user?.uid,
      userName: appUser?.name,
      rejectionReason,
    });
    await refreshBranchTransfers();
    alert(isArabic ? "تم رفض طلب النقل" : "Transfer request rejected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "reject_failed";
    alert(formatBranchTransferActionError(message));
  }
}

function printBranchTransferRecords(records: BranchStockTransfer[]) {
  const params = buildBranchTransferPrintParams({
    records,
    branches,
    isArabic,
    pharmacySettings,
    logoBase64: appLogo,
  });
  if (!params) return;
  printBranchTransferPDF(params);
}

async function refreshPurchasesFromDb() {
  setPurchases(await pharmacyService.getPurchases());
}

async function refreshActivityLogsFromDb() {
  if (
    isViewingAllBranches &&
    branches.length > 0 &&
    canViewOrgActivityLogs(appUser)
  ) {
    setActivityLogs(
      await pharmacyService.getActivityLogsForPharmacies(
        branches.map((branch) => branch.id),
        500
      )
    );
    return;
  }
  setActivityLogs(await pharmacyService.getActivityLogs());
}

async function refreshPharmacyCostsFromDb() {
  try {
    setPharmacyCosts(await pharmacyService.getPharmacyCosts());
  } catch (error) {
    console.error("Refresh pharmacy costs error:", error);
    setPharmacyCosts([]);
  }
}

async function handleInstantReturnSuccess(result: {
  returnTotal: number;
  refundMethod: "cash" | "deduct_from_cart";
  returnNumber: string;
  invoiceNumber: string;
}) {
  if (result.refundMethod === "deduct_from_cart") {
    setDiscount(pharmacyService.applyReturnToCurrentCart(discount, result.returnTotal));
  }

  await refreshMedicinesFromDb();
  setReturns(await pharmacyService.getReturns());
  setStockMovements(await pharmacyService.getStockMovements());

  await addActivityLog({
    type: "instant_sale_return",
    title: isArabic ? "مرتجع بيع لحظي" : "Instant Sale Return",
    description: isArabic
      ? `تم تنفيذ مرتجع لحظي رقم ${result.returnNumber} على الفاتورة ${result.invoiceNumber} بقيمة ${result.returnTotal.toFixed(2)} ${t.currency}`
      : `Instant return ${result.returnNumber} on invoice ${result.invoiceNumber} for ${result.returnTotal.toFixed(2)} ${t.currency}`,
    referenceType: "return",
    referenceId: result.returnNumber,
  });

  setShowInstantReturnModal(false);

  if (result.refundMethod === "cash") {
    alert(
      isArabic
        ? `تم تنفيذ المرتجع. المبلغ المسترد نقدًا: ${result.returnTotal.toFixed(2)} ${t.currency}`
        : `Return completed. Cash refund: ${result.returnTotal.toFixed(2)} ${t.currency}`
    );
  } else {
    alert(
      isArabic
        ? `تم تنفيذ المرتجع وخصم ${result.returnTotal.toFixed(2)} ${t.currency} من السلة الحالية`
        : `Return completed. ${result.returnTotal.toFixed(2)} ${t.currency} deducted from current cart`
    );
  }
}

function getReturnItemMedicineId(item: {
  medicineId?: number | string;
  medicine_id?: number | string;
}) {
  const raw = item.medicineId ?? item.medicine_id ?? 0;
  if (typeof raw === "string" && raw.includes("-")) {
    return raw;
  }
  return Number(raw);
}

function getReturnItemQuantity(item: { quantity?: number; qty?: number }) {
  return Number(item.quantity ?? item.qty ?? 0);
}

function getReturnedQtyForInvoice(invoiceNumber: string, medicineId: number | string) {
  const targetId = getReturnItemMedicineId({ medicineId });
  return returns
    .filter((returnRecord) => returnRecord.invoiceNumber === invoiceNumber)
    .flatMap((returnRecord) => returnRecord.items || [])
    .filter((item) => String(getReturnItemMedicineId(item)) === String(targetId))
    .reduce((sum, item) => sum + getReturnItemQuantity(item), 0);
}

function getReturnTypeLabel(returnRecord: ReturnRecord) {
  if (returnRecord.isInstant) {
    return isArabic ? "مرتجع لحظي" : "Instant Return";
  }
  return isArabic ? "مرتجع فاتورة" : "Invoice Return";
}

function getRefundMethodLabel(returnRecord: ReturnRecord) {
  if (returnRecord.refundMethod === "cash") {
    return isArabic ? "استرداد نقدي" : "Cash refund";
  }
  if (returnRecord.refundMethod === "deduct_from_cart") {
    return isArabic ? "خصم من السلة" : "Deduct from cart";
  }
  return isArabic ? "إرجاع للمخزون" : "Stock restore";
}

function getReturnItemsSummary(returnRecord: ReturnRecord) {
  const items = returnRecord.items || [];
  if (items.length === 0) return "-";

  const totalQty = items.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
  const firstName = isArabic ? items[0].name_ar : items[0].name_en;

  if (items.length === 1) {
    return `${firstName || "-"} × ${safeNumber(items[0].quantity)}`;
  }

  return isArabic
    ? `${items.length} أصناف (${totalQty} وحدة) — ${firstName || "-"}...`
    : `${items.length} items (${totalQty} units) — ${firstName || "-"}...`;
}

function openInvoiceByNumber(invoiceNumber: string) {
  const invoice = invoices.find((row) => row.invoiceNumber === invoiceNumber);
  if (!invoice) {
    alert(isArabic ? "لم يتم العثور على الفاتورة الأصلية" : "Original invoice not found");
    return;
  }
  setSelectedReturn(null);
  setSelectedInvoice(invoice);
}

function getAvailableReturnQty(invoice: Invoice, item: InvoiceItem) {
  const alreadyReturnedQty = getReturnedQtyForInvoice(
    invoice.invoiceNumber,
    item.medicineId
  );

  return Math.max(0, item.quantity - alreadyReturnedQty);
}
async function completeReturn() {
  if (!returnInvoice) return;

  if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }

  if (!canUseReturns()) {
    alert(isArabic ? "ليس لديك صلاحية للمرتجعات" : "You do not have permission for returns");
    return;
  }

  if (isReturning) return;

  const selectedReturnItems = (returnInvoice.items || [])
    .map((item) => {
      const medicineId = Number(
        item.medicineId ?? (item as { medicine_id?: number }).medicine_id ?? 0
      );
      const quantity = Number(
        returnQuantities[medicineId] ?? returnQuantities[item.medicineId] ?? 0
      );
      const unitPrice = Number(item.unitPrice ?? (item as { unit_price?: number }).unit_price ?? 0);
      const buyPrice = Number(item.buyPrice ?? (item as { buy_price?: number }).buy_price ?? 0);

      if (quantity <= 0 || medicineId <= 0) {
        return null;
      }

      return {
        medicineId,
        name_ar: item.name_ar || (item as { medicine_name?: string }).medicine_name || "",
        name_en: item.name_en || "",
        barcode: item.barcode || "",
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        buyPrice,
        costTotal: buyPrice * quantity,
        profit: unitPrice * quantity - buyPrice * quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (selectedReturnItems.length === 0) {
    alert(isArabic ? "اختر كمية مرتجعة أولًا" : "Choose return quantity first");
    return;
  }

  for (const item of selectedReturnItems) {
  const originalItem = returnInvoice.items.find(
    (invoiceItem) => invoiceItem.medicineId === item.medicineId
  );

  if (!originalItem) {
    alert(isArabic ? "الصنف غير موجود في الفاتورة" : "Item not found in invoice");
    return;
  }

  const availableQty = getAvailableReturnQty(returnInvoice, originalItem);

  if (item.quantity > availableQty) {
    alert(
      isArabic
        ? `كمية المرتجع أكبر من المتاح. المتاح للصنف ${originalItem.name_ar}: ${availableQty}`
        : `Return quantity is greater than available. Available for ${originalItem.name_en}: ${availableQty}`
    );
    return;
  }
}

  try {
    setIsReturning(true);

    const returnId = Date.now();
    const returnNumber = `RET-${returnId}`;
    const returnTotal = selectedReturnItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    const returnRecord: ReturnRecord = {
      id: returnId,
      returnNumber,
      invoiceNumber: returnInvoice.invoiceNumber,
      originalInvoiceId: returnInvoice.id,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      date: new Date().toLocaleString(),
      createdAt: new Date().toISOString(),
      items: selectedReturnItems,
      total: returnTotal,
      isInstant: false,
    };

    const currentMedicines = await pharmacyService.getMedicines();
    const stockMovements = selectedReturnItems.map((item) => {
      const currentMedicine = currentMedicines.find((m) => m.id === item.medicineId);
      const oldQty = currentMedicine?.qty || 0;
      const newQty = oldQty + item.quantity;

      return {
        id: Date.now() + item.medicineId,
        type: "return",
        medicineId: item.medicineId,
        medicineName_ar: item.name_ar,
        medicineName_en: item.name_en,
        barcode: item.barcode,
        quantityChange: item.quantity,
        qtyBefore: oldQty,
        qtyAfter: newQty,
        invoiceNumber: returnInvoice.invoiceNumber,
        returnNumber,
        pharmacyId: getPharmacyId(),
        userId: user?.uid || "",
        userName: appUser?.name || "",
        createdAt: new Date().toISOString(),
      };
    });

    for (const item of selectedReturnItems) {
      const currentMedicine = currentMedicines.find((m) => m.id === item.medicineId);
      if (!currentMedicine) {
        throw new Error(isArabic ? "دواء غير موجود في المخزون" : "Medicine not found");
      }
      await pharmacyService.updateMedicineStock(item.medicineId, currentMedicine.qty + item.quantity);
    }

    for (const movement of stockMovements) {
      await pharmacyService.addStockMovement(movement);
    }

    await pharmacyService.createReturn(returnRecord);
    await refreshMedicinesFromDb();
    setReturns(await pharmacyService.getReturns());

    await addActivityLog({
  type: "return",
  title: isArabic ? "تسجيل مرتجع" : "Return Created",
  description: isArabic
    ? `تم تسجيل مرتجع رقم ${returnNumber} على الفاتورة ${returnInvoice.invoiceNumber} بإجمالي ${returnTotal.toFixed(2)} ${t.currency}`
    : `Return ${returnNumber} created for invoice ${returnInvoice.invoiceNumber} with total ${returnTotal.toFixed(2)} ${t.currency}`,
  referenceType: "return",
  referenceId: returnNumber,
});
    alert(isArabic ? `تم تسجيل المرتجع رقم ${returnNumber}` : `Return ${returnNumber} completed`);

    setReturnInvoice(null);
    setReturnQuantities({});
  } catch (error) {
    console.error("Complete return error:", error);

    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "حصل خطأ أثناء تسجيل المرتجع"
        : "An error occurred while completing the return"
    );
  } finally {
    setIsReturning(false);
  }
}

async function handleDeleteReturn(returnRecord: ReturnRecord) {
  if (!canDeleteReturn()) {
    alert(isArabic ? "ليس لديك صلاحية لحذف المرتجعات" : "You do not have permission to delete returns");
    return;
  }

  const confirmDelete = window.confirm(
    isArabic
      ? `هل أنت متأكد من حذف المرتجع ${returnRecord.returnNumber}؟\nسيتم خصم الكميات المرجعة من المخزون.`
      : `Delete return ${returnRecord.returnNumber}?\nReturned quantities will be deducted from stock.`
  );

  if (!confirmDelete) return;

  try {
    setDeletingReturnId(returnRecord.id);

    const currentMedicines = await pharmacyService.getMedicines();

    for (const item of returnRecord.items || []) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const currentMedicine = findMedicineForReturnItem(item, currentMedicines);
      if (!currentMedicine) continue;

      const newQty = Math.max(0, currentMedicine.qty - quantity);
      await pharmacyService.updateMedicineStock(currentMedicine.id, newQty);

      await pharmacyService.addStockMovement({
        id: Date.now() + Number(currentMedicine.id),
        type: "return_delete",
        medicineId: currentMedicine.id,
        medicineName_ar: item.name_ar || currentMedicine.name_ar,
        medicineName_en: item.name_en || currentMedicine.name_en,
        barcode: item.barcode || currentMedicine.barcode,
        quantityChange: -quantity,
        qtyBefore: currentMedicine.qty,
        qtyAfter: newQty,
        invoiceNumber: returnRecord.invoiceNumber,
        returnNumber: returnRecord.returnNumber,
        pharmacyId: getPharmacyId(),
        userId: user?.uid || "",
        userName: appUser?.name || "",
        notes: isArabic ? "حذف مرتجع" : "Return deleted",
        createdAt: new Date().toISOString(),
      });
    }

    await pharmacyService.deleteReturn(returnRecord.id);
    await refreshMedicinesFromDb();
    setReturns(await pharmacyService.getReturns());

    if (selectedReturn?.id === returnRecord.id) {
      setSelectedReturn(null);
    }

    await addActivityLog({
      type: "return_delete",
      title: isArabic ? "حذف مرتجع" : "Return Deleted",
      description: isArabic
        ? `تم حذف المرتجع ${returnRecord.returnNumber} المرتبط بالفاتورة ${returnRecord.invoiceNumber}`
        : `Deleted return ${returnRecord.returnNumber} linked to invoice ${returnRecord.invoiceNumber}`,
      referenceType: "return",
      referenceId: returnRecord.returnNumber,
    });

    alert(isArabic ? "تم حذف المرتجع" : "Return deleted");
  } catch (error) {
    console.error("Delete return error:", error);
    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "حدث خطأ أثناء حذف المرتجع"
        : "Failed to delete return"
    );
  } finally {
    setDeletingReturnId(null);
  }
}

async function updateSystemUser(
  uid: string,
  updates: Partial<Pick<SystemUser, "role" | "isActive" | "name">>
) {
  if (!canManageUsers()) {
    alert(isArabic ? "ليس لديك صلاحية لإدارة المستخدمين" : "You do not have permission to manage users");
    return;
  }

  if (uid === user?.uid && updates.isActive === false) {
    alert(isArabic ? "لا يمكنك إيقاف حسابك الحالي" : "You cannot deactivate your own account");
    return;
  }

  await pharmacyService.updateSystemUser(uid, updates as Partial<SystemUser>);

  const updatedUser = systemUsers.find((systemUser) => systemUser.uid === uid);

  await addActivityLog({
    type: "user_update",
    title: isArabic ? "تعديل مستخدم" : "User Updated",
    description: isArabic
      ? `تم تعديل المستخدم ${updates.name || updatedUser?.name || uid}`
      : `User ${updates.name || updatedUser?.name || uid} was updated`,
    referenceType: "user",
    referenceId: uid,
  });

  setSystemUsers((prev) =>
    prev.map((u) => (u.uid === uid ? { ...u, ...updates } : u))
  );
  await refreshSystemUsersList();

  if (userModal !== "edit") {
    alert(isArabic ? "تم تحديث المستخدم" : "User updated");
  }
}

function getRoleLabel(role: UserRole) {
  return getRoleLabelUtil(role, isArabic);
}

function defaultPharmacyIdForUserForm() {
  return selectedTenantId || activeBranchId || appUser?.pharmacyId || branches[0]?.id || "main";
}

async function refreshSystemUsersList() {
  if (isSuperAdmin(appUser)) {
    setSystemUsers(await pharmacyService.getAllSystemUsers());
    return;
  }
  const pharmacyId = appUser?.pharmacyId;
  if (pharmacyId) {
    setSystemUsers(await pharmacyService.getSystemUsers(pharmacyId));
  }
}

function formatUserCreationError(message: string) {
  if (message === "name_required") {
    return isArabic ? "أدخل الاسم الكامل" : "Enter your full name";
  }
  if (message === "pharmacy_name_required") {
    return isArabic ? "أدخل اسم الصيدلية (حرفان على الأقل)" : "Enter pharmacy name (at least 2 characters)";
  }
  if (message === "trial_already_provisioned") {
    return isArabic ? "تم إنشاء صيدليتك مسبقاً" : "Your pharmacy was already created";
  }
  if (message === "password_too_short") {
    return isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters";
  }
  if (message === "email_address_invalid_format") {
    return isArabic ? "صيغة الإيميل غير صحيحة" : "Invalid email format";
  }
  if (message === "email_domain_rejected" || message === "email_address_invalid") {
    return isArabic
      ? "Supabase يرفض هذا الدومين. استخدم بريداً حقيقياً (Gmail، Outlook، Yahoo...) وليس دومين وهمي مثل pharmacy.com"
      : "This email domain was rejected. Use a real mailbox (Gmail, Outlook, Yahoo...) not a fake domain like pharmacy.com";
  }
  if (message === "email_not_authorized" || message === "email_address_not_authorized") {
    return isArabic
      ? "لا يمكن إرسال بريد لهذا العنوان. فعّل SMTP مخصص في Supabase → Authentication → SMTP Settings"
      : "Email cannot be sent to this address. Set up custom SMTP in Supabase → Authentication → SMTP Settings";
  }
  if (message === "over_email_send_rate_limit") {
    return isArabic
      ? "تم إرسال عدد كبير من الطلبات. انتظر دقائق ثم حاول مرة أخرى."
      : "Too many requests. Please wait a few minutes and try again.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return isArabic ? "هذا الإيميل مسجل بالفعل" : "This email is already registered";
  }
  if (message === "auth_pending_confirmation") {
    return isArabic
      ? "تم إنشاء الحساب. قد يحتاج المستخدم لتأكيد البريد قبل أول تسجيل دخول."
      : "Account created. The user may need to confirm their email before signing in.";
  }
  return message;
}

async function addSystemUser() {
  if (!canManageUsers()) {
    alert(isArabic ? "ليس لديك صلاحية لإدارة المستخدمين" : "You do not have permission to manage users");
    return;
  }

  const targetPharmacyId = isSuperAdmin(appUser)
    ? newUserForm.pharmacyId || defaultPharmacyIdForUserForm()
    : appUser?.pharmacyId;

  if (!targetPharmacyId) {
    alert(isArabic ? "اختر الصيدلية أولاً" : "Select a pharmacy first");
    return;
  }

  const name = newUserForm.name.trim();
  const email = newUserForm.email.trim().toLowerCase();
  const password = newUserForm.password;

  if (!name || !email) {
    alert(isArabic ? "أكمل الاسم والإيميل" : "Please fill name and email");
    return;
  }

  if (systemUsers.some((u) => u.email.toLowerCase() === email)) {
    alert(isArabic ? "هذا الإيميل مستخدم بالفعل" : "This email is already in use");
    return;
  }

  if (!password) {
    alert(isArabic ? "أدخل كلمة المرور" : "Enter a password");
    return;
  }
  if (password.length < 6) {
    alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
    return;
  }

  setAddingUser(true);
  try {
    const newUid = await pharmacyService.createSystemUser({
      name,
      email,
      password,
      role: newUserForm.role,
      pharmacyId: targetPharmacyId,
    });

    await addActivityLog({
      type: "user_update",
      title: isArabic ? "إضافة مستخدم" : "User Added",
      description: isArabic ? `تم إضافة المستخدم ${name}` : `User ${name} was added`,
      referenceType: "user",
      referenceId: newUid,
    });

    setNewUserForm({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      pharmacyId: defaultPharmacyIdForUserForm(),
    });
    setUserModal(null);
    await refreshSystemUsersList();
    alert(isArabic ? "تم إضافة المستخدم بنجاح" : "User added successfully");
  } catch (error) {
    console.error(error);
    const raw = error instanceof Error ? error.message : "";
    alert(formatUserCreationError(raw) || (isArabic ? "تعذر إضافة المستخدم" : "Could not add user"));
  } finally {
    setAddingUser(false);
  }
}

function openAddUserModal() {
  setNewUserForm({
    name: "",
    email: "",
    password: "",
    role: "cashier",
    pharmacyId: defaultPharmacyIdForUserForm(),
  });
  setUserModal("add");
}

function openEditUserModal(systemUser: SystemUser) {
  setEditUserDraft({
    uid: systemUser.uid,
    name: systemUser.name,
    role: systemUser.role,
    email: systemUser.email,
  });
  setUserModal("edit");
}

function closeUserModal() {
  setUserModal(null);
  setEditUserDraft(null);
}

function switchBranch(id: string) {
  const current = activeBranchId || appUser?.pharmacyId;
  if (id === current) return;
  setActiveBranchId(id);
  pharmacyService.setActivePharmacy(id);
  if (appUser?.uid) {
    localStorage.setItem(branchPreferenceStorageKey(appUser.uid), id);
  }
  setCart([]);
  setIsMenuOpen(false);
}

function goToCustomerPaymentForm() {
  setActivePage("customers");
  setCustomerPaymentModalRequest((count) => count + 1);
}

async function openAvailability(medicine: Medicine) {
  setAvailabilityLoading(true);
  setAvailabilityModal({ medicine, rows: [] });
  try {
    const rows = await pharmacyService.getBranchAvailability(medicine);
    setAvailabilityModal({ medicine, rows });
  } catch (error) {
    console.error("openAvailability error:", error);
    setAvailabilityModal({ medicine, rows: [] });
  } finally {
    setAvailabilityLoading(false);
  }
}

function branchLabel(pharmacyId: string) {
  const branch = branches.find((b) => b.id === pharmacyId);
  if (!branch) return pharmacyId;
  return (isArabic ? branch.name : branch.name_en) || branch.name || pharmacyId;
}

async function saveEditUser() {
  if (!editUserDraft) return;
  setSavingUserEdit(true);
  try {
    await updateSystemUser(editUserDraft.uid, {
      name: editUserDraft.name.trim(),
      role: editUserDraft.role,
    });
    closeUserModal();
    alert(isArabic ? "تم حفظ التعديل" : "Changes saved");
  } finally {
    setSavingUserEdit(false);
  }
}

async function sendUserPasswordReset(email: string) {
  try {
    await pharmacyService.sendPasswordResetEmail(email);
    alert(
      isArabic
        ? "تم إرسال رابط تغيير كلمة المرور إلى بريد المستخدم"
        : "A password reset link was sent to the user's email"
    );
  } catch (error) {
    console.error(error);
    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "تعذر إرسال رابط تغيير كلمة المرور"
        : "Could not send password reset link"
    );
  }
}

async function removeSystemUser(uid: string, userName: string) {
  if (!canManageUsers()) {
    alert(isArabic ? "ليس لديك صلاحية لإدارة المستخدمين" : "You do not have permission to manage users");
    return;
  }
  if (uid === user?.uid) {
    alert(isArabic ? "لا يمكنك حذف حسابك الحالي" : "You cannot delete your own account");
    return;
  }
  const confirmed = window.confirm(
    isArabic
      ? `حذف المستخدم "${userName}" من النظام؟ لن يستطيع تسجيل الدخول بعد ذلك.`
      : `Delete user "${userName}"? They will no longer be able to sign in.`
  );
  if (!confirmed) return;

  try {
    await pharmacyService.deleteSystemUser(uid);
    await addActivityLog({
      type: "user_update",
      title: isArabic ? "حذف مستخدم" : "User Deleted",
      description: isArabic ? `تم حذف المستخدم ${userName}` : `User ${userName} was deleted`,
      referenceType: "user",
      referenceId: uid,
    });
    if (appUser?.pharmacyId) {
      setSystemUsers(await pharmacyService.getSystemUsers(appUser.pharmacyId));
    }
    alert(isArabic ? "تم حذف المستخدم" : "User deleted");
  } catch (error) {
    console.error(error);
    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "تعذر حذف المستخدم"
        : "Could not delete user"
    );
  }
}

function handleSearchChange(value: string) {
  setQuery(value);

  const cleanValue = value.trim();

  if (!cleanValue) return;

  const foundMedicine = medicines.find(
    (medicine) => medicine.barcode === cleanValue
  );

  if (foundMedicine && activePage === "pos") {
    addToCart(foundMedicine);
    setQuery("");

    setPosMessage(
      isArabic
        ? `تمت إضافة ${foundMedicine.name_ar} للسلة`
        : `${foundMedicine.name_en} added to cart`
    );

    setTimeout(() => {
      setPosMessage("");
    }, 1800);
  }
}

function renderInventoryTable(showManagementActions = false) {
  return (
    <>
      <input
        className="searchInput"
        placeholder={
          activePage === "pos"
            ? isArabic
              ? "ابحث أو اسكان الباركود لإضافة الصنف"
              : "Search or scan barcode to add item"
            : t.search
        }
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        onKeyDown={(e) => {
  if (e.key === "Enter" && activePage === "pos") {
    const cleanValue = query.trim();

    if (!cleanValue) return;

    const foundMedicine = medicines.find(
      (medicine) => medicine.barcode === cleanValue
    );

    if (foundMedicine) {
      addToCart(foundMedicine);
      setQuery("");

      setPosMessage(
        isArabic
          ? `تمت إضافة ${foundMedicine.name_ar} للسلة`
          : `${foundMedicine.name_en} added to cart`
      );

      setTimeout(() => {
        setPosMessage("");
      }, 1800);

      return;
    }

    setPosMessage(
      isArabic
        ? "الباركود غير موجود في المخزون"
        : "Barcode not found in inventory"
    );

    setTimeout(() => {
      setPosMessage("");
    }, 2200);
  }
}}
      />

{activePage === "pos" && posMessage && (
  <div
    className={
      posMessage.includes("غير موجود") || posMessage.includes("not found")
        ? "posMessage error"
        : "posMessage"
    }
  >
    {posMessage}
  </div>
)}

{activePage !== "pos" && (
  <div className="filtersBar">
    <select
      value={inventoryStatusFilter}
      onChange={(e) =>
        setInventoryStatusFilter(
          e.target.value as "all" | "low" | "expiring" | "expired"
        )
      }
    >
      <option value="all">{isArabic ? "كل الأدوية" : "All medicines"}</option>
      <option value="low">{isArabic ? "نواقص المخزون" : "Low stock"}</option>
      <option value="expiring">
        {isArabic ? "قرب انتهاء الصلاحية" : "Expiring soon"}
      </option>
      <option value="expired">{isArabic ? "منتهي الصلاحية" : "Expired"}</option>
    </select>

    <button
      className="clearCartBtn"
      onClick={() => {
        setQuery("");
        setInventoryStatusFilter("all");
      }}
    >
      {isArabic ? "مسح الفلاتر" : "Clear filters"}
    </button>
  </div>
)}

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{t.medicine}</th>
              <th>{t.barcode}</th>
              <th>{t.qty}</th>
              <th>{t.expiry}</th>
              <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
              <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
              <th>{isArabic ? "الربح" : "Profit"}</th>
              <th>{t.action}</th>
            </tr>
          </thead>

          <tbody>
            {filteredMedicines.map((medicine) => (
              <tr key={medicine.id}>
                <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
                <td>{medicine.barcode}</td>
                <td>
                  <span
                    className={medicine.qty <= lowStockThreshold ? "badge danger" : "badge ok"}
                  >
                    {medicine.qty}
                  </span>
                </td>
                <td>{medicine.expiry}</td>
                <td>
  {(medicine.buyPrice || 0).toFixed(2)} {t.currency}
</td>
<td>
  {(medicine.price || 0).toFixed(2)} {t.currency}
</td>
<td>
              {((medicine.price || 0) - (medicine.buyPrice || 0)).toFixed(2)} {t.currency}
                </td>

                <td>
                  <div className="actionButtons">
                    {canUsePOS() && (
                      <button
                        className="smallBtn"
                        onClick={() => addToCart(medicine)}
                      >
                        {t.add}
                      </button>
                    )}

                    {orgTierFeatures.multiBranchSwitch && branches.length > 1 && (
                      <button
                        className="branchAvailBtn"
                        type="button"
                        title={isArabic ? "التوافر في الفروع" : "Availability across branches"}
                        onClick={() => void openAvailability(medicine)}
                      >
                        🏢 {isArabic ? "الفروع" : "Branches"}
                      </button>
                    )}

                    {showManagementActions && canManageInventory() && (
                      <button
                        className="editBtn"
                        onClick={() => startEditMedicine(medicine)}
                      >
                        {isArabic ? "تعديل" : "Edit"}
                      </button>
                    )}

                    {showManagementActions && canDeleteMedicine() && (
                      <button
                        className="deleteSmallBtn"
                        onClick={() => deleteMedicine(medicine)}
                      >
                        {isArabic ? "حذف" : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function exportBackupCSV() {
  const rows = [
    [isArabic ? "نسخة احتياطية" : "Backup"],
    [isArabic ? "الصيدلية" : "Pharmacy", pharmacySettings?.name || "-"],
    [isArabic ? "خطة الاشتراك" : "Subscription Plan", pharmacySettings?.subscriptionPlan || "-"],
    [isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription End Date", pharmacySettings?.subscriptionEndDate || "-"],
    [isArabic ? "تاريخ التصدير" : "Export Date", new Date().toLocaleString()],
    [],

    [isArabic ? "المخزون" : "Inventory"],
    [
      isArabic ? "اسم عربي" : "Arabic Name",
      isArabic ? "اسم إنجليزي" : "English Name",
      isArabic ? "باركود" : "Barcode",
      isArabic ? "كمية" : "Qty",
      isArabic ? "سعر شراء" : "Buy Price",
      isArabic ? "سعر بيع" : "Sell Price",
      isArabic ? "صلاحية" : "Expiry",
    ],
    ...medicines.map((medicine) => [
      medicine.name_ar,
      medicine.name_en,
      barcodeCSV(medicine.barcode),
      medicine.qty,
      safeNumber(medicine.buyPrice).toFixed(2),
      safeNumber(medicine.price).toFixed(2),
      medicine.expiry,
    ]),
    [],

    [isArabic ? "الفواتير" : "Invoices"],
    [
      isArabic ? "رقم الفاتورة" : "Invoice No.",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "طريقة الدفع" : "Payment",
      isArabic ? "العميل" : "Customer",
      isArabic ? "الكاشير" : "Cashier",
      isArabic ? "الإجمالي" : "Total",
      isArabic ? "الربح" : "Profit",
    ],
    ...invoices.map((invoice: any) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      getPaymentLabel(invoice.paymentMethod || "cash"),
      invoice.customerName || "-",
      invoice.cashierName || "-",
      safeNumber(invoice.total).toFixed(2),
      safeNumber(invoice.totalProfit).toFixed(2),
    ]),
    [],

    [isArabic ? "المرتجعات" : "Returns"],
    [
      isArabic ? "رقم المرتجع" : "Return No.",
      isArabic ? "رقم الفاتورة" : "Invoice No.",
      isArabic ? "الإجمالي" : "Total",
      isArabic ? "المستخدم" : "User",
      isArabic ? "التاريخ" : "Date",
    ],
    ...returns.map((item) => [
      item.returnNumber,
      item.invoiceNumber,
      safeNumber(item.total).toFixed(2),
      item.userName || "-",
      item.date || "-",
    ]),
    [],

    [isArabic ? "المشتريات" : "Purchases"],
    [
      isArabic ? "رقم التوريد" : "Purchase No.",
      isArabic ? "الصنف" : "Item",
      isArabic ? "باركود" : "Barcode",
      isArabic ? "كمية" : "Qty",
      isArabic ? "تكلفة" : "Cost",
      isArabic ? "مورد" : "Supplier",
      isArabic ? "التاريخ" : "Date",
    ],
    ...purchases.map((purchase) => [
      purchase.purchaseNumber,
      isArabic ? purchase.medicineName_ar : purchase.medicineName_en,
      barcodeCSV(purchase.barcode),
      purchase.quantity,
      safeNumber(purchase.totalCost).toFixed(2),
      purchase.supplierName || "-",
      purchase.date || "-",
    ]),
    [],

    [isArabic ? "تحصيلات العملاء" : "Customer Payments"],
    [
      isArabic ? "رقم التحصيل" : "Payment No.",
      isArabic ? "العميل" : "Customer",
      isArabic ? "المبلغ" : "Amount",
      isArabic ? "طريقة الدفع" : "Payment Method",
      isArabic ? "المستخدم" : "User",
      isArabic ? "التاريخ" : "Date",
    ],
    ...customerPayments.map((payment) => [
      payment.paymentNumber,
      payment.customerName,
      safeNumber(payment.amount).toFixed(2),
      getPaymentLabel(payment.paymentMethod),
      payment.userName || "-",
      payment.date || "-",
    ]),
  ];

  downloadCSV(`pharmacy-backup-${formatDateInput(new Date())}.csv`, rows);
}

function exportDashboardSummaryCSV() {
  const rows = [
    [isArabic ? "ملخص الداشبورد" : "Dashboard Summary"],
    [
      isArabic ? "الفترة" : "Period",
      dashboardPeriod === "today"
        ? isArabic
          ? "اليوم"
          : "Today"
        : dashboardPeriod === "7days"
        ? isArabic
          ? "آخر 7 أيام"
          : "Last 7 days"
        : dashboardPeriod === "month"
        ? isArabic
          ? "الشهر الحالي"
          : "Current month"
        : isArabic
        ? "فترة مخصصة"
        : "Custom period",
    ],
    [
      isArabic ? "من" : "From",
      formatDateInput(dashboardDateRange.from),
    ],
    [
      isArabic ? "إلى" : "To",
      formatDateInput(dashboardDateRange.to),
    ],
    [],
    [isArabic ? "المؤشر" : "Metric", isArabic ? "القيمة" : "Value"],
    [isArabic ? "مبيعات الفترة" : "Period Sales", dashboardSalesTotal.toFixed(2)],
    [isArabic ? "ربح الفترة" : "Period Profit", dashboardProfitTotal.toFixed(2)],
    [isArabic ? "عدد الفواتير" : "Invoices Count", dashboardInvoicesCount],
    [isArabic ? "إجمالي الآجل المتبقي" : "Remaining Credit", totalCustomerRemainingDebt.toFixed(2)],
    [isArabic ? "إجمالي التحصيلات" : "Total Payments", totalCustomerPayments.toFixed(2)],
    [],
    [isArabic ? "أفضل الأصناف بيعًا" : "Top Selling Items"],
    [
      isArabic ? "الصنف" : "Item",
      isArabic ? "الكمية" : "Qty",
      isArabic ? "الإجمالي" : "Total",
    ],
    ...dashboardTopSellingMedicines.map((item) => [
      isArabic ? item.name_ar : item.name_en,
      item.quantity,
      safeNumber(item.total).toFixed(2),
    ]),
    [],
    [isArabic ? "أفضل الكاشيرين" : "Top Cashiers"],
    [
      isArabic ? "الكاشير" : "Cashier",
      isArabic ? "عدد الفواتير" : "Invoices",
      isArabic ? "إجمالي المبيعات" : "Total Sales",
    ],
    ...dashboardTopCashiers.map((cashier) => [
      cashier.cashierName,
      cashier.invoicesCount,
      safeNumber(cashier.totalSales).toFixed(2),
    ]),
  ];

  downloadCSV(`dashboard-summary-${formatDateInput(new Date())}.csv`, rows);
}

function setupArabicPdfFont(docPdf: jsPDF) {
  try {
    docPdf.addFileToVFS("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_BASE64);
    docPdf.addFont(
      "NotoNaskhArabic-Regular.ttf",
      "NotoNaskhArabic",
      "normal"
    );

    if (isArabic) {
      docPdf.setFont("NotoNaskhArabic", "normal");

      // مهم: ما نفعلش R2L عام لأنه بيعكس الإنجليزي والأرقام
      docPdf.setR2L(false);
    } else {
      docPdf.setFont("helvetica", "normal");
      docPdf.setR2L(false);
    }
  } catch (error) {
    console.error("Arabic PDF font error:", error);
  }
}

function pdfLabel(ar: string, en: string) {
  return isArabic ? ar : en;
}

function addPdfHeader(
  docPdf: jsPDF,
  title: string,
  subtitle?: string
) {
  setupArabicPdfFont(docPdf);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  let y = 15;

  try {
  docPdf.addImage(LOGO_BASE64, "PNG", pageWidth / 2 - 10, y - 8, 20, 20);
  y += 15;
} catch (error) {
  console.error("PDF logo error:", error);
}

  docPdf.setFontSize(18);
  docPdf.text(
    isArabic
      ? pharmacySettings?.name || "صيدلية Focus"
      : pharmacySettings?.name_en || "Focus Pharmacy",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 7;

  docPdf.setFontSize(9);
  docPdf.text(
    `${pdfLabel("الهاتف", "Phone")}: ${pharmacySettings?.phone || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 6;

  docPdf.text(
    `${pdfLabel("العنوان", "Address")}: ${pharmacySettings?.address || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 8;

  docPdf.setFontSize(13);
  docPdf.text(title, pageWidth / 2, y, { align: "center" });

  if (subtitle) {
    y += 6;
    docPdf.setFontSize(9);
    docPdf.text(subtitle, pageWidth / 2, y, { align: "center" });
  }

  return y + 12;
}

function addPdfFooter(docPdf: jsPDF, y: number) {
  setupArabicPdfFont(docPdf);
  const pageWidth = docPdf.internal.pageSize.getWidth();

  if (y > 280) {
    docPdf.addPage();
    y = 15;
  }

  const pharmacyName = isArabic
    ? pharmacySettings?.name || "صيدلية Focus"
    : pharmacySettings?.name_en || "Focus Pharmacy";

  docPdf.setFontSize(9);
  docPdf.text(
    pharmacySettings?.invoiceFooter || pharmacyName,
    pageWidth / 2,
    y,
    { align: "center" }
  );
}

function addPdfSimpleRow(
  docPdf: jsPDF,
  columns: string[],
  xPositions: number[],
  y: number
) {
  columns.forEach((text, index) => {
    docPdf.text(String(text || "-"), xPositions[index], y);
  });
}

function printDashboardSummaryPDF() {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;
  

  const periodLabel =
    dashboardPeriod === "today"
      ? isArabic
        ? "اليوم"
        : "Today"
      : dashboardPeriod === "7days"
      ? isArabic
        ? "آخر 7 أيام"
        : "Last 7 days"
      : dashboardPeriod === "month"
      ? isArabic
        ? "الشهر الحالي"
        : "Current month"
      : isArabic
      ? "فترة مخصصة"
      : "Custom period";

  
  let y = addPdfHeader(
  docPdf,
  isArabic ? "تقرير ملخص الداشبورد" : "Dashboard Summary Report",
  `${periodLabel} - ${formatDateInput(dashboardDateRange.from)} / ${formatDateInput(dashboardDateRange.to)}`
);

  
  docPdf.setFontSize(10);
  docPdf.text(`${pdfLabel("الفترة", "Period")}: ${periodLabel}`, margin, y);
  y += 7;
  docPdf.text(`${pdfLabel("من", "From")}: ${formatDateInput(dashboardDateRange.from)}`, margin, y);
  y += 7;
  docPdf.text(`${pdfLabel("إلى", "To")}: ${formatDateInput(dashboardDateRange.to)}`, margin, y);
  y += 10;

  docPdf.rect(margin, y, pageWidth - margin * 2, 42);

  docPdf.text(
  `${pdfLabel("المبيعات", "Sales")}: ${dashboardSalesTotal.toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 8
);

  docPdf.text(
  `${pdfLabel("الربح", "Profit")}: ${dashboardProfitTotal.toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 16
);

  docPdf.text(
  `${pdfLabel("عدد الفواتير", "Invoices")}: ${dashboardInvoicesCount}`,
  margin + 4,
  y + 24
);

  docPdf.text(
  `${pdfLabel("الآجل المتبقي", "Remaining Credit")}: ${totalCustomerRemainingDebt.toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 32
);

  docPdf.text(
  `${pdfLabel("التحصيلات", "Total Payments")}: ${totalCustomerPayments.toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 40
);

  y += 55;

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel("أفضل الأصناف بيعًا", "Top Selling Items"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel("الصنف", "Item"), margin, y);
  docPdf.text(pdfLabel("الكمية", "Qty"), margin + 95, y);
  docPdf.text(pdfLabel("الإجمالي", "Total"), margin + 125, y);
  y += 6;

  dashboardTopSellingMedicines.forEach((item) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }

    const name = isArabic ? item.name_ar : item.name_en;
    const shortName = name.length > 38 ? `${name.slice(0, 38)}...` : name;

    docPdf.text(shortName, margin, y);
    docPdf.text(String(item.quantity), margin + 95, y);
    docPdf.text(`${safeNumber(item.total).toFixed(2)} ${t.currency}`, margin + 125, y);

    y += 7;
  });

  y += 8;

  if (y > 250) {
    docPdf.addPage();
    y = 15;
  }

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel("أفضل الكاشيرين", "Top Cashiers"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel("الكاشير", "Cashier"), margin, y);
  docPdf.text(pdfLabel("الفواتير", "Invoices"), margin + 95, y);
  docPdf.text(pdfLabel("المبيعات", "Sales"), margin + 125, y);
  y += 6;

  dashboardTopCashiers.forEach((cashier) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }

    const cashierName =
      cashier.cashierName.length > 38
        ? `${cashier.cashierName.slice(0, 38)}...`
        : cashier.cashierName;

    docPdf.text(cashierName, margin, y);
    docPdf.text(String(cashier.invoicesCount), margin + 95, y);
    docPdf.text(`${safeNumber(cashier.totalSales).toFixed(2)} ${t.currency}`, margin + 125, y);

    y += 7;
  });

  y += 12;

  if (y > 275) {
    docPdf.addPage();
    y = 15;
  }

  addPdfFooter(docPdf, y);

  docPdf.save(`dashboard-summary-${formatDateInput(new Date())}.pdf`);
}

function exportInventoryCSV() {
  const rows = [
    [
      isArabic ? "اسم الدواء عربي" : "Arabic Name",
      isArabic ? "اسم الدواء إنجليزي" : "English Name",
      isArabic ? "الباركود" : "Barcode",
      isArabic ? "الكمية" : "Qty",
      isArabic ? "سعر الشراء" : "Buy Price",
      isArabic ? "سعر البيع" : "Sell Price",
      isArabic ? "ربح الوحدة" : "Unit Profit",
      isArabic ? "الصلاحية" : "Expiry",
    ],
    ...filteredMedicines.map((medicine) => [
      medicine.name_ar,
      medicine.name_en,
      barcodeCSV(medicine.barcode),
      medicine.qty,
      safeNumber(medicine.buyPrice).toFixed(2),
      safeNumber(medicine.price).toFixed(2),
      (safeNumber(medicine.price) - safeNumber(medicine.buyPrice)).toFixed(2),
      medicine.expiry,
    ]),
  ];

  downloadCSV(`inventory-${formatDateInput(new Date())}.csv`, rows);
}

function exportInvoicesCSV() {
  const rows = [
    [
      isArabic ? "رقم الفاتورة" : "Invoice No.",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "طريقة الدفع" : "Payment Method",
      isArabic ? "العميل" : "Customer",
      isArabic ? "الكاشير" : "Cashier",
      isArabic ? "عدد الأصناف" : "Items Count",
      isArabic ? "قبل الخصم" : "Subtotal",
      isArabic ? "الخصم" : "Discount",
      isArabic ? "الإجمالي" : "Total",
      isArabic ? "التكلفة" : "Cost",
      isArabic ? "صافي الربح" : "Net Profit",
    ],
    ...filteredInvoicesList.map((invoice: any) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      getPaymentLabel(invoice.paymentMethod || "cash"),
      invoice.customerName || "-",
      invoice.cashierName || "-",
      Array.isArray(invoice.items) ? invoice.items.length : 0,
      safeNumber(invoice.subtotal || invoice.total).toFixed(2),
      safeNumber(invoice.discount).toFixed(2),
      safeNumber(invoice.total).toFixed(2),
      safeNumber(invoice.totalCost).toFixed(2),
      safeNumber(invoice.totalProfit).toFixed(2),
    ]),
  ];

  downloadCSV(`invoices-${formatDateInput(new Date())}.csv`, rows);
}

function exportReturnsCSV() {
  const rows = [
    [
      ...(isViewingAllBranches ? [isArabic ? "الفرع" : "Branch"] : []),
      isArabic ? "نوع المرتجع" : "Return Type",
      isArabic ? "رقم المرتجع" : "Return No.",
      isArabic ? "الفاتورة الأصلية" : "Original Invoice",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "الموظف" : "Employee",
      isArabic ? "طريقة الاسترداد" : "Refund Method",
      isArabic ? "الأصناف" : "Items Summary",
      isArabic ? "المبلغ المسترد" : "Refunded Amount",
      isArabic ? "السبب" : "Reason",
    ],
    ...returns.map((record) => [
      ...(isViewingAllBranches ? [resolveBranchLabel(record.pharmacyId)] : []),
      getReturnTypeLabel(record),
      record.returnNumber,
      record.invoiceNumber,
      record.date || "-",
      record.userName || "-",
      getRefundMethodLabel(record),
      getReturnItemsSummary(record),
      safeNumber(record.total).toFixed(2),
      record.reason || "-",
    ]),
  ];

  downloadCSV(`returns-${formatDateInput(new Date())}.csv`, rows);
}

function renderMedicineForm() {
    return (
      <div className="medicineForm">
        <h3>{editingMedicineId ? t.editMedicine : t.addMedicine}</h3>
        <div className="formGrid">
          <input value={newMedicine.name_ar} onChange={(e) => setNewMedicine({ ...newMedicine, name_ar: e.target.value })} placeholder={isArabic ? "اسم الدواء بالعربي" : "Arabic name"} />
          <input value={newMedicine.name_en} onChange={(e) => setNewMedicine({ ...newMedicine, name_en: e.target.value })} placeholder={isArabic ? "اسم الدواء بالإنجليزي" : "English name"} />
          <input value={newMedicine.barcode} onChange={(e) => setNewMedicine({ ...newMedicine, barcode: e.target.value })} placeholder={t.barcode} />
          <input
  type="number"
  value={newMedicine.qty || ""}
  onChange={(e) =>
    setNewMedicine({
      ...newMedicine,
      qty: e.target.value === "" ? 0 : Number(e.target.value),
    })
  }
  placeholder={t.qty}
/>
  <input
  type="number"
  value={newMedicine.buyPrice || ""}
  onChange={(e) =>
    setNewMedicine({
      ...newMedicine,
      buyPrice: e.target.value === "" ? 0 : Number(e.target.value),
    })
  }
  placeholder={isArabic ? "سعر الشراء" : "Buy price"}
/>

<input
  type="number"
  value={newMedicine.price || ""}
  onChange={(e) =>
    setNewMedicine({
      ...newMedicine,
      price: e.target.value === "" ? 0 : Number(e.target.value),
    })
  }
  placeholder={isArabic ? "سعر البيع" : "Sell price"}
/>

          <input type="date" value={newMedicine.expiry} onChange={(e) => setNewMedicine({ ...newMedicine, expiry: e.target.value })} />
        </div>
        <div className="medicineFormActions">
          <button
            className="addMedicineBtn"
            onClick={saveMedicine}
            disabled={isSubscriptionExpired}
          >{editingMedicineId ? t.saveChanges : t.addMedicineBtn}</button>
          {editingMedicineId && <button className="cancelMedicineBtn" onClick={cancelEditMedicine}>{t.cancelEdit}</button>}
        </div>
      </div>
    );
  }

function clearCart() {
  if (cart.length === 0) return;

  const confirmClear = window.confirm(
    isArabic
      ? "هل أنت متأكد من تفريغ السلة؟"
      : "Are you sure you want to clear the cart?"
  );

  if (!confirmClear) return;

  setCart([]);
  setDiscount(0);
  setPaymentMethod("cash");
  setCustomerName("");
}

  function renderCartPanel() {
    return (
    <div className="posPanel">
      <div className="cartHeader">
        <div>
          <h3>{t.cart}</h3>

          <div className="cartMiniStats">
            <span>
              {isArabic ? "الأصناف" : "Items"}: {cartItemsCount}
            </span>
            <span>
              {isArabic ? "الكمية" : "Qty"}: {cartTotalQty}
            </span>
          </div>
        </div>

        {cart.length > 0 && (
          <button className="clearCartBtn" onClick={clearCart}>
            {isArabic ? "تفريغ السلة" : "Clear Cart"}
          </button>
        )}
      </div>
        {cart.length === 0 ? (
          <p className="empty">{t.emptyCart}</p>
        ) : (
          <div className="cartList">
            {cart.map((item) => (
              <div className="cartItem" key={item.id}>
                <div>
                  <strong>{isArabic ? item.name_ar : item.name_en}</strong>
                  <p>{item.price} {t.currency} × {item.cartQty}</p>
                </div>
                <div className="qtyControls">
                  <button onClick={() => changeQty(item.id, -1)}>-</button>
                  <span>{item.cartQty}</span>
                  <button onClick={() => changeQty(item.id, 1)}>+</button>
                </div>
                <button className="deleteBtn" onClick={() => removeItem(item.id)}>{t.remove}</button>
              </div>
            ))}
          </div>
        )}
        <div className="paymentBox">
          <label>{t.discount}</label>
          <input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} placeholder={isArabic ? "قيمة الخصم" : "Discount amount"} />
          <label>{t.paymentMethod}</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                const value = e.target.value as PaymentMethod;
                setPaymentMethod(value);

                if (value !== "credit") {
                  setCustomerName("");
                }
              }}
            >
              <option value="cash">{getPaymentLabel("cash")}</option>
              <option value="visa">{getPaymentLabel("visa")}</option>
              <option value="wallet">{getPaymentLabel("wallet")}</option>
              <option value="credit">{getPaymentLabel("credit")}</option>
            </select>

            {paymentMethod === "credit" && (
              <>
                <label>{isArabic ? "اسم العميل" : "Customer Name"}</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={isArabic ? "اكتب اسم العميل" : "Enter customer name"}
                />
              </>
            )}
          <div className="subtotalLine"><span>{t.subtotal}</span><strong>{subtotal.toFixed(2)} {t.currency}</strong></div>
        </div>
        <div className="totalBox"><span>{t.total}</span><strong>{total.toFixed(2)} {t.currency}</strong></div>
        <button
          className="completeBtn"
          onClick={completeSale}
          disabled={isSelling || isSubscriptionExpired}
        >
          {isSubscriptionExpired
            ? isArabic
              ? "الاشتراك منتهي"
              : "Subscription Expired"
            : isSelling
            ? isArabic
              ? "جاري تسجيل البيع..."
              : "Completing sale..."
            : t.completeSale}
        </button>
      </div>
    );
  }
  function openReturnModal(invoice: Invoice) {
  setReturnInvoice(invoice);

  const initialQuantities: Record<number, number> = {};

  invoice.items?.forEach((item) => {
    const medicineId = Number(
      item.medicineId ?? (item as { medicine_id?: number }).medicine_id ?? 0
    );
    if (medicineId > 0) {
      initialQuantities[medicineId] = 0;
    }
  });

  setReturnQuantities(initialQuantities);
}
function safeNumber(value: any) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
  
const filteredInvoicesList = invoices.filter((invoice: any) => {
  const searchValue = invoiceSearch.trim().toLowerCase();

  const matchesSearch =
    !searchValue ||
    String(invoice.invoiceNumber || invoice.id || "").toLowerCase().includes(searchValue) ||
    String(invoice.customerName || "").toLowerCase().includes(searchValue) ||
    String(invoice.cashierName || "").toLowerCase().includes(searchValue);

  const matchesPayment =
    invoicePaymentFilter === "all" ||
    invoice.paymentMethod === invoicePaymentFilter;

  const invoiceDate = new Date(invoice.createdAt || invoice.date);
  const fromDate = invoiceFromDate ? new Date(`${invoiceFromDate}T00:00:00`) : null;
  const toDate = invoiceToDate ? new Date(`${invoiceToDate}T23:59:59`) : null;

  const matchesFrom = !fromDate || invoiceDate >= fromDate;
  const matchesTo = !toDate || invoiceDate <= toDate;

  return matchesSearch && matchesPayment && matchesFrom && matchesTo;
});

function renderInvoicesTable() {
    return (
      <section className="card invoicesPage">
  <div className="cardHeader">
    <h2>{t.allInvoices}</h2>

    <button className="printBtn" onClick={exportInvoicesCSV}>
      <span aria-hidden="true">⬇️</span>
      <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
    </button>
  </div>
  <div className="filtersBar">
  <input
    value={invoiceSearch}
    onChange={(e) => setInvoiceSearch(e.target.value)}
    placeholder={
      isArabic
        ? "بحث برقم الفاتورة أو العميل أو الكاشير"
        : "Search invoice, customer, or cashier"
    }
  />

  <select
    value={invoicePaymentFilter}
    onChange={(e) =>
      setInvoicePaymentFilter(e.target.value as "all" | PaymentMethod)
    }
  >
    <option value="all">{isArabic ? "كل طرق الدفع" : "All payments"}</option>
    <option value="cash">{getPaymentLabel("cash")}</option>
    <option value="visa">{getPaymentLabel("visa")}</option>
    <option value="wallet">{getPaymentLabel("wallet")}</option>
    <option value="credit">{getPaymentLabel("credit")}</option>
  </select>

  <input
    type="date"
    value={invoiceFromDate}
    onChange={(e) => setInvoiceFromDate(e.target.value)}
  />

  <input
    type="date"
    value={invoiceToDate}
    onChange={(e) => setInvoiceToDate(e.target.value)}
  />

  <button
    className="clearCartBtn"
    onClick={() => {
      setInvoiceSearch("");
      setInvoicePaymentFilter("all");
      setInvoiceFromDate("");
      setInvoiceToDate("");
    }}
  >
    {isArabic ? "مسح الفلاتر" : "Clear filters"}
  </button>
</div>
        {filteredInvoicesList.length === 0 ? <p className="empty">{t.noInvoices}</p> : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{t.invoiceNo}</th><th>{t.date}</th><th>{t.paymentMethod}</th><th>{isArabic ? "العميل" : "Customer"}</th><th>{t.subtotal}</th><th>{t.discount}</th><th>{t.total}</th><th>{t.items}</th><th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoicesList.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber || `#${invoice.id}`}</td>
                    <td>{invoice.date}</td>
                    <td>{getPaymentLabel(invoice.paymentMethod || "cash")}</td>
                    <td>{invoice.customerName || "-"}</td>
                    <td>{(invoice.subtotal || invoice.total || 0).toFixed(2)} {t.currency}</td>
                    <td>{(invoice.discount || 0).toFixed(2)} {t.currency}</td>
                    <td>{(invoice.total || 0).toFixed(2)} {t.currency}</td>
                    <td>{invoice.items?.length || 0}</td>
                    <td>
                      <div className="actionButtons">
                        <button className="smallBtn" onClick={() => setSelectedInvoice(invoice)}>{t.view}</button>
                        {canUseReturns() && (
  <button className="editBtn" onClick={() => openReturnModal(invoice)}>
    {isArabic ? "مرتجع" : "Return"}
  </button>
)}
                        <button className="printBtn" onClick={() => printSavedInvoice(invoice)}><span aria-hidden="true">🖨️</span><span>{t.print}</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
  
  function renderUserModal() {
    const roleOptions: UserRole[] = pharmacyAdminRoleOptions;
    if (!userModal) return null;

    const isAdd = userModal === "add";

    return (
      <div className="modalOverlay" onClick={closeUserModal}>
        <div
          className="invoiceModal userModal"
          onClick={(e) => e.stopPropagation()}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="modalHeader">
            <div>
              <h2>
                {isAdd
                  ? isArabic
                    ? "إضافة مستخدم جديد"
                    : "Add New User"
                  : isArabic
                  ? "تعديل مستخدم"
                  : "Edit User"}
              </h2>
              <p>
                {isAdd
                  ? isArabic
                    ? "أدخل بيانات الموظف ليتمكن من تسجيل الدخول للنظام"
                    : "Enter employee details so they can sign in to the system"
                  : isArabic
                  ? "تعديل الاسم والدور — الإيميل للعرض فقط"
                  : "Edit name and role — email is read-only"}
              </p>
            </div>
            <button type="button" className="deleteSmallBtn" onClick={closeUserModal}>
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>

          {isAdd ? (
            <>
              <div className="userFormGrid">
                <label>
                  {isArabic ? "الاسم" : "Name"}
                  <input
                    className="searchInput"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder={isArabic ? "اسم الموظف" : "Employee name"}
                  />
                </label>
                <label>
                  {isArabic ? "الإيميل" : "Email"}
                  <input
                    className="searchInput"
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder={isArabic ? "cashier@focus-pharmacy.eg" : "user@your-domain.com"}
                  />
                </label>
                <label>
                  {isArabic ? "كلمة المرور" : "Password"}
                  <input
                    className="searchInput"
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder={isArabic ? "6 أحرف على الأقل" : "Min. 6 characters"}
                  />
                </label>
                <label>
                  {isArabic ? "الدور" : "Role"}
                  <select
                    className="tableSelect"
                    value={newUserForm.role}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        role: e.target.value as AppUser["role"],
                      })
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
                {isSuperAdmin(appUser) && (
                  <label>
                    {isArabic ? "الصيدلية" : "Pharmacy"}
                    <select
                      className="tableSelect"
                      value={newUserForm.pharmacyId || defaultPharmacyIdForUserForm()}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          pharmacyId: e.target.value,
                        })
                      }
                    >
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {(isArabic ? branch.name : branch.name_en) || branch.name} ({branch.id})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="modalActions">
                <button type="button" className="editBtn" onClick={closeUserModal}>
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="printBtn"
                  disabled={addingUser}
                  onClick={() => void addSystemUser()}
                >
                  {addingUser
                    ? isArabic
                      ? "جاري الإضافة..."
                      : "Adding..."
                    : isArabic
                    ? "إضافة المستخدم"
                    : "Add User"}
                </button>
              </div>
            </>
          ) : (
            editUserDraft && (
              <>
                <div className="userFormGrid">
                  <label>
                    {isArabic ? "الاسم" : "Name"}
                    <input
                      className="searchInput"
                      value={editUserDraft.name}
                      onChange={(e) =>
                        setEditUserDraft({ ...editUserDraft, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    {isArabic ? "الإيميل" : "Email"}
                    <input className="searchInput" value={editUserDraft.email} disabled />
                  </label>
                  <label>
                    {isArabic ? "الدور" : "Role"}
                    <select
                      className="tableSelect"
                      value={editUserDraft.role}
                      onChange={(e) =>
                        setEditUserDraft({
                          ...editUserDraft,
                          role: e.target.value as AppUser["role"],
                        })
                      }
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="editBtn userPasswordResetBtn"
                  onClick={() => void sendUserPasswordReset(editUserDraft.email)}
                >
                  {isArabic ? "إرسال رابط تغيير كلمة المرور" : "Send password reset link"}
                </button>
                <div className="modalActions">
                  <button type="button" className="editBtn" onClick={closeUserModal}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="printBtn"
                    disabled={savingUserEdit}
                    onClick={() => void saveEditUser()}
                  >
                    {savingUserEdit
                      ? isArabic
                        ? "جاري الحفظ..."
                        : "Saving..."
                      : isArabic
                      ? "حفظ التعديل"
                      : "Save Changes"}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </div>
    );
  }

  function renderUsersPage() {
    const roleOptions: UserRole[] = pharmacyAdminRoleOptions;

    return (
      <section className="card usersPage">
        {renderUserModal()}

        <div className="cardHeader">
          <h2>{isArabic ? "إدارة المستخدمين" : "Users Management"}</h2>
          <button className="printBtn" type="button" onClick={openAddUserModal}>
            {isArabic ? "+ إضافة مستخدم" : "+ Add User"}
          </button>
        </div>

        <p className="hintText">
          {isArabic
            ? "إدارة كاملة: إضافة، تعديل، إيقاف/تفعيل، حذف، وتغيير كلمة المرور عبر البريد."
            : "Full control: add, edit, activate/deactivate, delete, and reset password via email."}
        </p>

        {systemUsers.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا يوجد مستخدمون — اضغط إضافة مستخدم" : "No users — click Add User"}
          </p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الاسم" : "Name"}</th>
                  <th>{isArabic ? "الإيميل" : "Email"}</th>
                  {isSuperAdmin(appUser) && (
                    <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                  )}
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>

              <tbody>
                {systemUsers.map((systemUser) => (
                  <tr key={systemUser.uid}>
                    <td>{systemUser.name}</td>
                    <td>{systemUser.email}</td>
                    {isSuperAdmin(appUser) && (
                      <td>{branchLabel(systemUser.pharmacyId)}</td>
                    )}
                    <td>{getRoleLabel(systemUser.role)}</td>
                    <td>
                      <span
                        className={systemUser.isActive ? "badge ok" : "badge danger"}
                      >
                        {systemUser.isActive
                          ? isArabic
                            ? "مفعل"
                            : "Active"
                          : isArabic
                          ? "موقوف"
                          : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => openEditUserModal(systemUser)}
                        >
                          {isArabic ? "تعديل" : "Edit"}
                        </button>

                        <button
                          type="button"
                          className={
                            systemUser.isActive ? "deleteSmallBtn" : "smallBtn"
                          }
                          onClick={() =>
                            updateSystemUser(systemUser.uid, {
                              isActive: !systemUser.isActive,
                            })
                          }
                        >
                          {systemUser.isActive
                            ? isArabic
                              ? "إيقاف"
                              : "Deactivate"
                            : isArabic
                            ? "تفعيل"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={systemUser.uid === user?.uid}
                          onClick={() =>
                            void removeSystemUser(systemUser.uid, systemUser.name)
                          }
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

function resetTenantForm() {
  setTenantForm({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    subscriptionTier: "basic",
    maxBranches: 1,
  });
}

function resetTenantUserForm() {
  setTenantUserForm({
    name: "",
    email: "",
    password: "",
    role: "pharmacy_admin",
    uid: "",
    pharmacyId: selectedTenantId || defaultPharmacyIdForUserForm(),
  });
}

async function handleCreateTenant(): Promise<boolean> {
  if (!isSuperAdmin(appUser)) return false;
  const id = tenantForm.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const name = tenantForm.name.trim();
  if (!id || !name) {
    alert(isArabic ? "أدخل المعرف واسم الصيدلية" : "Enter pharmacy ID and name");
    return false;
  }
  setCreatingTenant(true);
  try {
    await pharmacyService.createPharmacy({
      id,
      name,
      name_en: tenantForm.name_en.trim() || name,
      phone: tenantForm.phone.trim(),
      address: tenantForm.address.trim(),
      subscriptionTier: tenantForm.subscriptionTier,
      subscriptionPlan: "monthly",
      subscriptionStatus: "active",
      maxBranches: tenantForm.maxBranches,
    });
    setBranches(await pharmacyService.getPharmacies());
    setSelectedTenantId(id);
    resetTenantForm();
    alert(isArabic ? "تم إنشاء الصيدلية بنجاح" : "Pharmacy created successfully");
    return true;
  } catch (error) {
    console.error(error);
    alert(isArabic ? "تعذر إنشاء الصيدلية" : "Could not create pharmacy");
    return false;
  } finally {
    setCreatingTenant(false);
  }
}

async function handleCreateTenantUser(): Promise<boolean> {
  const targetPharmacyId = tenantUserForm.pharmacyId || selectedTenantId;
  if (!isSuperAdmin(appUser) || !targetPharmacyId) return false;
  if (!tenantUserForm.name.trim() || !tenantUserForm.email.trim()) {
    alert(isArabic ? "أكمل الاسم والإيميل" : "Fill name and email");
    return false;
  }
  if (!tenantUserForm.uid.trim() && !tenantUserForm.password) {
    alert(
      isArabic
        ? "أدخل UID لمستخدم Auth موجود أو كلمة مرور لحساب جديد"
        : "Enter UID for existing Auth user or password for new account"
    );
    return false;
  }
  setCreatingTenantUser(true);
  try {
    await pharmacyService.createPharmacyUser({
      uid: tenantUserForm.uid.trim() || undefined,
      name: tenantUserForm.name.trim(),
      email: tenantUserForm.email.trim(),
      password: tenantUserForm.password || undefined,
      role: tenantUserForm.role,
      pharmacyId: targetPharmacyId,
    });
    setSystemUsers(await pharmacyService.getAllSystemUsers());
    resetTenantUserForm();
    alert(isArabic ? "تم إضافة المستخدم بنجاح" : "User added successfully");
    return true;
  } catch (error) {
    console.error(error);
    const raw = error instanceof Error ? error.message : "";
    alert(formatUserCreationError(raw) || (isArabic ? "تعذر إضافة المستخدم" : "Could not add user"));
    return false;
  } finally {
    setCreatingTenantUser(false);
  }
}

function formatBranchLimitError(message: string): string {
  const map: Record<string, [string, string]> = {
    forbidden: ["ليس لديك صلاحية لهذا الإجراء", "You do not have permission for this action"],
    invalid_max_branches: ["أدخل عدداً صحيحاً أكبر من صفر", "Enter a whole number greater than zero"],
    below_current_branches: [
      "لا يمكن تقليل الحد عن عدد الفروع الحالية",
      "Cannot set limit below current branch count",
    ],
    organization_not_found: ["المجموعة غير موجودة في قاعدة البيانات", "Organization not found in database"],
    update_blocked_or_not_found: [
      "تعذر التحديث — شغّل organization-branch-limit.sql في Supabase",
      "Update blocked — run organization-branch-limit.sql in Supabase",
    ],
    sql_migration_required: [
      "شغّل ملف supabase/organization-branch-limit.sql في Supabase SQL Editor ثم أعد المحاولة",
      "Run supabase/organization-branch-limit.sql in Supabase SQL Editor, then try again",
    ],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  for (const [key, labels] of Object.entries(map)) {
    if (message.includes(key)) return isArabic ? labels[0] : labels[1];
  }
  return message;
}

async function handleUpdateSubscriptionTier(
  organizationId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  if (!isSuperAdmin(appUser)) return false;
  try {
    await pharmacyService.updateOrganizationSubscriptionTier(organizationId, tier, appUser);
    setBranches(await pharmacyService.getPharmacies());
    alert(isArabic ? "تم تحديث الباقة" : "Package updated");
    return true;
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    alert(
      formatBranchLimitError(message) ||
        (isArabic ? "تعذر تحديث الباقة" : "Could not update package")
    );
    return false;
  }
}

async function handleUpdateOrganizationMaxBranches(
  organizationId: string,
  maxBranches: number
): Promise<boolean> {
  if (!isSuperAdmin(appUser)) return false;
  const used = branches.filter(
    (branch) => (branch.organizationId || `org-${branch.id}`) === organizationId
  ).length;
  if (maxBranches < used) {
    alert(
      isArabic
        ? `لا يمكن تقليل الحد عن الفروع الحالية (${used})`
        : `Cannot set limit below current branches (${used})`
    );
    return false;
  }
  try {
    await pharmacyService.updateOrganizationMaxBranches(organizationId, maxBranches, appUser);
    setBranches(await pharmacyService.getPharmacies());
    alert(isArabic ? "تم تحديث حد الفروع" : "Branch limit updated");
    return true;
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    alert(
      formatBranchLimitError(message) ||
        (isArabic ? "تعذر تحديث حد الفروع" : "Could not update branch limit")
    );
    return false;
  }
}

async function handleUpdateTenantStatus(
  pharmacyId: string,
  status: "active" | "suspended"
): Promise<boolean> {
  if (!isSuperAdmin(appUser)) return false;
  try {
    await pharmacyService.updatePharmacyStatus(pharmacyId, {
      subscriptionStatus: status === "active" ? "active" : "suspended",
      isActive: status === "active",
    });
    setBranches(await pharmacyService.getPharmacies());
    alert(
      status === "active"
        ? isArabic
          ? "تم تفعيل الصيدلية"
          : "Pharmacy activated"
        : isArabic
          ? "تم إيقاف الصيدلية"
          : "Pharmacy suspended"
    );
    return true;
  } catch (error) {
    console.error(error);
    alert(isArabic ? "تعذر تحديث الحالة" : "Could not update status");
    return false;
  }
}

function handleSwitchTenantView(pharmacyId: string) {
  if (!isSuperAdmin(appUser)) return;
  setActiveBranchId(pharmacyId);
  setSelectedTenantId(pharmacyId);
  pharmacyService.setActivePharmacy(pharmacyId);
  setActivePage("dashboard");
}

async function handleGoogleSignIn() {
  setLoginError("");
  setRegisterSuccess("");
  setGoogleLoading(true);

  try {
    const { error } = await pharmacyService.signInWithGoogle();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(error);
    setGoogleLoading(false);
    setLoginError(
      isArabic
        ? "تعذر الدخول عبر Google. تأكد من تفعيل Google في Supabase → Authentication → Providers."
        : "Google sign-in failed. Enable Google in Supabase → Authentication → Providers."
    );
  }
}

async function handleLogin(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  try {
    setLoginError("");
    setRegisterSuccess("");
    const { error } = await pharmacyService.signInWithUsernameOrEmail(loginEmail, loginPassword);
    if (error) {
      if (error.message === "username_login_not_configured") {
        setLoginError(
          isArabic
            ? "نظام اسم المستخدم غير مفعّل. شغّل supabase/username-login.sql في Supabase."
            : "Username login not configured. Run supabase/username-login.sql in Supabase."
        );
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    setLoginError(
      isArabic ? "بيانات الدخول غير صحيحة" : "Invalid login credentials"
    );
  }
}

async function handleRegister(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoginError("");
  setRegisterSuccess("");
  setRegistering(true);

  try {
    const result = await pharmacyService.registerPublicUser({
      name: registerName,
      pharmacyName: registerPharmacyName,
      email: loginEmail,
      password: loginPassword,
    });

    if (result.needsEmailConfirmation) {
      setRegisterSuccess(
        isArabic
          ? `تم إنشاء الحساب. أكّد بريدك ثم سجّل الدخول لتفعيل التجربة المجانية ${TRIAL_SUBSCRIPTION_DAYS} يوماً.`
          : `Account created. Confirm your email, then sign in to start your ${TRIAL_SUBSCRIPTION_DAYS}-day free trial.`
      );
      setAuthMode("login");
      setLoginPassword("");
      return;
    }

    setRegisterSuccess(
      isArabic
        ? `تم إنشاء الصيدلية والتجربة ${TRIAL_SUBSCRIPTION_DAYS} يوماً — جاري الدخول...`
        : `Pharmacy and ${TRIAL_SUBSCRIPTION_DAYS}-day trial created — signing in...`
    );
  } catch (error) {
    console.error(error);
    const raw = error instanceof Error ? error.message : "";
    setLoginError(
      formatUserCreationError(raw) ||
        (isArabic ? "تعذر إنشاء الحساب" : "Could not create account")
    );
  } finally {
    setRegistering(false);
  }
}

function switchAuthMode(mode: "login" | "register") {
  setAuthMode(mode);
  setLoginError("");
  setRegisterSuccess("");
}

async function handleLogout() {
  clearSessionNavigationState();
  await pharmacyService.signOutUser();
}
if (authLoading || userLoading) {
  return (
    <LoginPage
      status="loading"
      authMode={authMode}
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      registerName={registerName}
      registerPharmacyName={registerPharmacyName}
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
      onRegisterPharmacyNameChange={setRegisterPharmacyName}
      onAuthModeChange={switchAuthMode}
      onSubmit={handleLogin}
      onRegisterSubmit={handleRegister}
      onGoogleSignIn={() => void handleGoogleSignIn()}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
    />
  );
}

if (!user) {
  return (
    <LoginPage
      status="login"
      authMode={authMode}
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      registerName={registerName}
      registerPharmacyName={registerPharmacyName}
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
      onRegisterPharmacyNameChange={setRegisterPharmacyName}
      onAuthModeChange={switchAuthMode}
      onSubmit={handleLogin}
      onRegisterSubmit={handleRegister}
      onGoogleSignIn={() => void handleGoogleSignIn()}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
    />
  );
}
if (!appUser) {
  return (
    <LoginPage
      status="denied"
      authMode={authMode}
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      registerName={registerName}
      registerPharmacyName={registerPharmacyName}
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
      onRegisterPharmacyNameChange={setRegisterPharmacyName}
      onAuthModeChange={switchAuthMode}
      onSubmit={handleLogin}
      onRegisterSubmit={handleRegister}
      onGoogleSignIn={() => void handleGoogleSignIn()}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
      onLogout={handleLogout}
    />
  );
}

  return (
    <div className="app" dir={isArabic ? "rtl" : "ltr"}>
      <main className="content">
        <div className="appStickyHeader">
          <Topbar
            title={topbarPharmacyTitle}
            subtitle={
              isViewingAllBranches
                ? isArabic
                  ? `عرض مجمّع لـ ${branches.length} فروع — التسجيل على فرع: ${writeBranchLabel}`
                  : `Combined view of ${branches.length} branches — writes go to: ${writeBranchLabel}`
                : ""
            }
            pharmacyPhone={pharmacySettings?.phone || ""}
            pharmacyAddress={pharmacySettings?.address || ""}
            pharmacyLogo={appLogo}
            appUser={appUser}
            isArabic={isArabic}
            t={t}
            lang={lang}
            onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
            onLogout={handleLogout}
            onToggleMenu={() => setIsMenuOpen((value) => !value)}
            isMenuOpen={isMenuOpen}
            branches={branches}
            activeBranchId={activeBranchId}
            onSwitchBranch={switchBranch}
            allowBranchSwitch={canSwitchBranchesWithTier(
              appUser,
              orgSubscriptionTier,
              branches.length
            )}
            alertItems={alertItems}
            alertTotal={alertTotal}
            onAlertNavigate={(filter) => {
              setActivePage("inventory");
              setInventoryStatusFilter(filter);
              setIsMenuOpen(false);
            }}
          />

          <AppNavBar
            activePage={displayPage}
            allowedPages={allowedPages}
            isArabic={isArabic}
            t={t}
            pageBadges={adminNavBadges}
            onSelectPage={setActivePage}
          />
        </div>

        <BranchScopeBanner
          isArabic={isArabic}
          appUser={appUser}
          branchLabel={resolveBranchLabel(appUser?.pharmacyId)}
        />

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
            tierUpgradePrompt={tierUpgradePrompt}
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
            onOpenPaymentModalRequestConsumed={() =>
              setCustomerPaymentModalRequest(0)
            }
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
            currency={settingsForm.currency || "ج.م"}
            currentUid={user?.uid}
            onActivityLog={addActivityLog}
            onOpenSubscriptionSettings={openSubscriptionSettings}
          />
        )}
        {displayPage === "employeePortal" && canOpenPage("employeePortal") && (
          <EmployeePortalPage
            isArabic={isArabic}
            appUser={appUser}
            pharmacyId={getPharmacyId()}
          />
        )}
        {displayPage === "tenants" && canOpenPage("tenants") && (
          <SuperAdminPage
            isArabic={isArabic}
            pharmacies={branches}
            systemUsers={systemUsers}
            selectedPharmacyId={selectedTenantId}
            onSelectPharmacy={(id) => {
              setSelectedTenantId(id);
              setTenantUserForm((prev) => ({ ...prev, pharmacyId: id }));
            }}
            onSwitchTenant={handleSwitchTenantView}
            tenantForm={tenantForm}
            onTenantFormChange={(updates) => setTenantForm({ ...tenantForm, ...updates })}
            onResetTenantForm={resetTenantForm}
            onCreateTenant={handleCreateTenant}
            creatingTenant={creatingTenant}
            userForm={tenantUserForm}
            onUserFormChange={(updates) => setTenantUserForm({ ...tenantUserForm, ...updates })}
            onResetUserForm={resetTenantUserForm}
            onCreateTenantUser={handleCreateTenantUser}
            creatingTenantUser={creatingTenantUser}
            onUpdateTenantStatus={handleUpdateTenantStatus}
            onUpdateMaxBranches={handleUpdateOrganizationMaxBranches}
            onUpdateSubscriptionTier={handleUpdateSubscriptionTier}
            subscriptionRequests={subscriptionRequests}
            onApproveSubscriptionRequest={handleApproveSubscriptionRequest}
            onRejectSubscriptionRequest={handleRejectSubscriptionRequest}
            pendingPharmacyLoginAccounts={pendingPharmacyLoginAccounts}
            onApprovePharmacyLoginAccount={handleApprovePharmacyLoginAccount}
            onRejectPharmacyLoginAccount={handleRejectPharmacyLoginAccount}
            onRefreshAdminRequests={refreshAdminRequestsStable}
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
          />
        )}
      </main>

      <Sidebar
        activePage={displayPage}
        allowedPages={allowedPages}
        isArabic={isArabic}
        t={t}
        pharmacyName={
          isArabic
            ? pharmacySettings?.name || "صيدلية Focus"
            : pharmacySettings?.name_en || "Focus Pharmacy"
        }
        pharmacyPhone={
          pharmacySettings?.phone || (isArabic ? "نظام إدارة" : "Management System")
        }
        pharmacyLogo={appLogo}
        isOpen={isMenuOpen}
        onCloseMenu={() => setIsMenuOpen(false)}
        pageBadges={adminNavBadges}
        onSelectPage={(page) => {
          setActivePage(page);
          setIsMenuOpen(false);
        }}
      />

      {availabilityModal && (
        <div className="modalOverlay" onClick={() => setAvailabilityModal(null)}>
          <div className="availabilityModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "توافر الدواء في الفروع" : "Availability across branches"}</h2>
                <p>
                  {(isArabic
                    ? availabilityModal.medicine.name_ar
                    : availabilityModal.medicine.name_en) || availabilityModal.medicine.name_ar}
                </p>
              </div>
              <button className="closeBtn" type="button" onClick={() => setAvailabilityModal(null)}>
                ×
              </button>
            </div>

            {availabilityLoading ? (
              <p className="empty">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{isArabic ? "الفرع" : "Branch"}</th>
                      <th>{isArabic ? "المتوفر" : "Available"}</th>
                      <th>{isArabic ? "أقرب صلاحية" : "Expiry"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const row = availabilityModal.rows.find((r) => r.pharmacyId === branch.id);
                      const qty = row?.qty ?? 0;
                      const isCurrent = branch.id === (activeBranchId || appUser?.pharmacyId);
                      return (
                        <tr key={branch.id} className={isCurrent ? "branchActiveRow" : ""}>
                          <td>
                            <strong>{(isArabic ? branch.name : branch.name_en) || branch.name}</strong>
                            {isCurrent && (
                              <span className="badge ok branchCurrentTag">
                                {isArabic ? "فرعك" : "Yours"}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={qty <= 0 ? "badge danger" : qty <= lowStockThreshold ? "badge warn" : "badge ok"}>
                              {qty}
                            </span>
                          </td>
                          <td>{row?.expiry || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="hintText">
              {isArabic
                ? "الأرقام تعكس مخزون كل فرع لنفس الدواء (بالباركود أو الاسم)."
                : "Quantities reflect each branch's stock for the same medicine (matched by barcode or name)."}
            </p>
          </div>
        </div>
      )}

      {selectedReturn && (
        <ReturnModal
          selectedReturn={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onViewOriginalInvoice={openInvoiceByNumber}
          onDelete={(record) => void handleDeleteReturn(record)}
          canDelete={canDeleteReturn()}
          isDeleting={deletingReturnId === selectedReturn.id}
          isArabic={isArabic}
          t={t}
          currency={t.currency}
          safeNumber={safeNumber}
          getReturnTypeLabel={getReturnTypeLabel}
          getRefundMethodLabel={getRefundMethodLabel}
        />
      )}

      {selectedInvoice && (
  <div className="modalOverlay" onClick={() => setSelectedInvoice(null)}>
    <div className="invoiceModal" onClick={(e) => e.stopPropagation()}>
      <div className="modalHeader">
        <div>
          <h2>{t.invoiceDetails}</h2>
          <p>{selectedInvoice.invoiceNumber || `#${selectedInvoice.id}`}</p>
        </div>

        <button className="closeBtn" onClick={() => setSelectedInvoice(null)}>
          ×
        </button>
      </div>

      <div className="invoiceInfo">
        <div>
          <span>{t.date}</span>
          <strong>{selectedInvoice.date || "-"}</strong>
        </div>

        <div>
          <span>{t.paymentMethod}</span>
          <strong>{getPaymentLabel(selectedInvoice.paymentMethod || "cash")}</strong>
        </div>

        <div>
          <span>{t.subtotal}</span>
          <strong>
            {safeNumber(selectedInvoice.subtotal || selectedInvoice.total).toFixed(2)} {t.currency}
          </strong>
        </div>

        <div>
          <span>{t.discount}</span>
          <strong>
            {safeNumber(selectedInvoice.discount).toFixed(2)} {t.currency}
          </strong>
        </div>

        <div>
          <span>{t.total}</span>
          <strong>
            {safeNumber(selectedInvoice.total).toFixed(2)} {t.currency}
          </strong>
        </div>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{t.item}</th>
              <th>{t.barcode}</th>
              <th>{t.qty}</th>
              <th>{t.unitPrice}</th>
              <th>{t.lineTotal}</th>
            </tr>
          </thead>

          <tbody>
            {(Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []).map((item: any, index: number) => {
              const quantity = safeNumber(item.quantity || item.cartQty);
              const unitPrice = safeNumber(item.unitPrice || item.price);
              const lineTotal = safeNumber(item.lineTotal || unitPrice * quantity);

              return (
                <tr key={`${item.medicineId || index}-${index}`}>
                  <td>{isArabic ? item.name_ar || "-" : item.name_en || "-"}</td>
                  <td>{item.barcode || "-"}</td>
                  <td>{quantity}</td>
                  <td>
                    {unitPrice.toFixed(2)} {t.currency}
                  </td>
                  <td>
                    {lineTotal.toFixed(2)} {t.currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="modalActions">
        <button className="printFullBtn" onClick={() => printSavedInvoice(selectedInvoice)}>
          <span aria-hidden="true">🖨️</span>
          <span>{t.printInvoice}</span>
        </button>

        <button className="completeBtn" onClick={() => setSelectedInvoice(null)}>
          {t.close}
        </button>
      </div>
    </div>
  </div>
)}
      
      {returnInvoice && (
        <div className="modalOverlay" onClick={() => setReturnInvoice(null)}>
          <div className="invoiceModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "تسجيل مرتجع" : "Create Return"}</h2>
                <p>{returnInvoice.invoiceNumber}</p>
              </div>

              <button className="closeBtn" onClick={() => setReturnInvoice(null)}>
                ×
              </button>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.item}</th>
                    <th>{isArabic ? "الكمية المباعة" : "Sold Qty"}</th>
                    <th>{isArabic ? "كمية المرتجع" : "Return Qty"}</th>
                    <th>{t.unitPrice}</th>
                    <th>{t.total}</th>
                  </tr>
                </thead>

                <tbody>
                  {returnInvoice.items?.map((item) => {
  const returnQty = returnQuantities[item.medicineId] || 0;
  const alreadyReturnedQty = getReturnedQtyForInvoice(
    returnInvoice.invoiceNumber,
    item.medicineId
  );
  const availableQty = getAvailableReturnQty(returnInvoice, item);

                    return (
                      <tr key={item.medicineId}>
                        <td>{isArabic ? item.name_ar : item.name_en}</td>
                        <td>
                          <div className="returnQtyCell">
                            <strong>{item.quantity}</strong>
                            {alreadyReturnedQty > 0 && (
                              <small className="returnQtyReturned">
                                {isArabic
                                  ? `تم إرجاع: ${alreadyReturnedQty}`
                                  : `Returned: ${alreadyReturnedQty}`}
                              </small>
                            )}
                            <small className="returnQtyRemaining">
                              {isArabic
                                ? `متبقي للمرتجع: ${availableQty}`
                                : `Remaining: ${availableQty}`}
                            </small>
                          </div>
                        </td>
                        <td>
                          <input
                            className="tableInput"
                            type="number"
                            min="0"
                            max={availableQty}
                            disabled={availableQty <= 0}
                            value={returnQty}
                            onChange={(e) => {
                              const value = Math.min(
  Math.max(Number(e.target.value), 0),
  availableQty
);

                              setReturnQuantities({
                                ...returnQuantities,
                                [item.medicineId]: value,
                              });
                            }}
                          />
                        </td>
                        <td>
                          {(item.unitPrice || 0).toFixed(2)} {t.currency}
                        </td>
                        <td>
                          {((item.unitPrice || 0) * returnQty).toFixed(2)}{" "}
                          {t.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modalActions">
              <button
                className="printFullBtn"
                onClick={completeReturn}
                disabled={isReturning}
              >
                {isReturning
                  ? isArabic
                    ? "جاري تسجيل المرتجع..."
                    : "Creating return..."
                  : isArabic
                  ? "تسجيل المرتجع"
                  : "Create Return"}
              </button>

              <button className="completeBtn" onClick={() => setReturnInvoice(null)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldInvoicesModal && (
        <HeldInvoicesModal
          heldInvoices={heldInvoices}
          isArabic={isArabic}
          currency={t.currency}
          isProcessing={isHeldInvoiceProcessing}
          onClose={() => setShowHeldInvoicesModal(false)}
          onResume={(held) => void handleResumeHeldInvoice(held)}
          onDelete={(held) => void handleDeleteHeldInvoice(held)}
        />
      )}

      {showInstantReturnModal && (
        <InstantReturnModal
          isArabic={isArabic}
          currency={t.currency}
          hasOpenCart={cart.length > 0}
          userId={user?.uid}
          userName={appUser?.name}
          getAvailableReturnQty={getAvailableReturnQty}
          onClose={() => setShowInstantReturnModal(false)}
          onSuccess={(result) => void handleInstantReturnSuccess(result)}
        />
      )}
    </div>
  );
}

export default App;
