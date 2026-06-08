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
import SettingsPage from "./pages/SettingsPage";
import EmployeesUsersPage from "./pages/EmployeesUsersPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import PurchasesPage from "./pages/PurchasesPage";
import CostsPage from "./pages/CostsPage";
import EmployeePortalPage from "./pages/EmployeePortalPage";
import {
  getAllowedPages,
  getRoleLabel as getRoleLabelUtil,
  hasRole as checkUserRole,
  isPharmacyAdmin,
  isSuperAdmin,
  pharmacyAdminRoleOptions,
} from "./utils/roles";
import {
  DEFAULT_EXPIRING_SOON_DAYS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  getExpiringSoonDays,
  getExpiryLimitValue,
  getLowStockThreshold,
} from "./utils/inventoryAlerts";
import { computeSubscriptionEndDate, planToSubscriptionPlan } from "./config/subscription";
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
  SystemUser,
  UserRole,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const [query, setQuery] = useState("");
  const [posMessage, setPosMessage] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>(medicinesSeed);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isSelling, setIsSelling] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [movementFromDate, setMovementFromDate] = useState("");
  const [movementToDate, setMovementToDate] = useState("");
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
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);
  const t = translations[lang];
  const isArabic = lang === "ar";
  const [user, setUser] = useState<{ uid: string; email?: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDebtFilter, setCustomerDebtFilter] = useState<"all" | "debt" | "paid">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [currentWorkShiftId, setCurrentWorkShiftId] = useState<string>("");
  const [currentWorkShiftLabel, setCurrentWorkShiftLabel] = useState<string>("");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [branches, setBranches] = useState<PharmacySettings[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branchModal, setBranchModal] = useState<"add" | "edit" | null>(null);
  const [savingBranch, setSavingBranch] = useState(false);
  const [availabilityModal, setAvailabilityModal] = useState<{
    medicine: Medicine;
    rows: Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [branchForm, setBranchForm] = useState({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    currency: "ج.م",
    isActive: true,
  });
  const [userLoading, setUserLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerName, setRegisterName] = useState("");
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
    subscriptionPlan: "basic",
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
  const [activitySearch, setActivitySearch] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activityFromDate, setActivityFromDate] = useState("");
  const [activityToDate, setActivityToDate] = useState("");
  const [pharmacySettings, setPharmacySettings] = useState<PharmacySettings | null>(null);
  const appLogo = pharmacySettings?.logoBase64 || LOGO_BASE64;
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      setAvailabilityModal(null);
      setSelectedInvoice(null);
      setSelectedReturn(null);
      setSelectedCustomer(null);
      setReturnInvoice(null);
      setShowCustomerPaymentModal(false);
      setUserModal(null);
      setEditUserDraft(null);
      setBranchModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allowedPages = useMemo(
    () => (appUser ? getAllowedPages(appUser) : []),
    [appUser]
  );

  const displayPage = useMemo((): Page => {
    if (!appUser) return activePage;
    if (activePage === "hr") return "users";
    if (allowedPages.includes(activePage)) return activePage;
    return allowedPages[0] || "dashboard";
  }, [appUser, activePage, allowedPages]);

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
      await pharmacyService.getAllPharmacyLoginAccounts({ status: "pending" })
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
            ? "الصيدلية غير نشطة أو الاشتراك منتهي. تواصل مع الدعم."
            : "Pharmacy is inactive or subscription is not active. Contact support.";
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
    const currentAppUser = appUser;
    if (!currentAppUser) return;

    const branchId = activeBranchId || currentAppUser.pharmacyId;
    pharmacyService.setActivePharmacy(branchId);

    const cleanup: Array<() => void> = [];

    async function loadData(user: AppUser) {
      const pharmacySettings = await pharmacyService.getPharmacySettings(branchId);
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
        });
      }

      if (isPharmacyAdmin(user) && branchId === "main") {
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
      setActivityLogs(await pharmacyService.getActivityLogs());
      setSubscriptionRequests(await pharmacyService.getAllSubscriptionRequests());
      if (isSuperAdmin(user)) {
        setPendingPharmacyLoginAccounts(
          await pharmacyService.getAllPharmacyLoginAccounts({ status: "pending" })
        );
      }
      try {
        setHeldInvoices(await pharmacyService.getHeldInvoices(branchId));
      } catch (heldError) {
        console.error("Load held invoices error:", heldError);
        setHeldInvoices([]);
      }

      setBranches(await pharmacyService.getPharmacies());

      if (isSuperAdmin(user)) {
        setSystemUsers(await pharmacyService.getAllSystemUsers());
      } else if (isPharmacyAdmin(user)) {
        setSystemUsers(await pharmacyService.getSystemUsers(branchId));
      }
    }

    loadData(currentAppUser).catch((error) => {
      console.error("Initial data load error:", error);
    });

    cleanup.push(pharmacyService.subscribePharmacies(setBranches));

    cleanup.push(pharmacyService.subscribePharmacySettings(branchId, (settings) => {
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
    cleanup.push(pharmacyService.subscribeHeldInvoices(setHeldInvoices, branchId));

    if (isPharmacyAdmin(currentAppUser)) {
      cleanup.push(pharmacyService.subscribeUsers(branchId, setSystemUsers));
    }

    return () => {
      cleanup.forEach((unsubscribe) => unsubscribe());
    };
  }, [appUser, activeBranchId]);

const lowStockThreshold = getLowStockThreshold(pharmacySettings);
const expiringSoonDays = getExpiringSoonDays(pharmacySettings);

   const filteredMedicines = useMemo(() => {
  const value = query.trim().toLowerCase();
  const todayValue = formatDateInput(new Date());
  const expiringLimitValue = getExpiryLimitValue(expiringSoonDays);

  return medicines.filter((medicine) => {
    const matchesSearch =
      !value ||
      medicine.name_ar.toLowerCase().includes(value) ||
      medicine.name_en.toLowerCase().includes(value) ||
      medicine.barcode.includes(value);

    const expiry = medicine.expiry || "";

    const matchesStatus =
      inventoryStatusFilter === "all" ||
      (inventoryStatusFilter === "low" && medicine.qty <= lowStockThreshold) ||
      (inventoryStatusFilter === "expired" && expiry && expiry < todayValue) ||
      (inventoryStatusFilter === "expiring" &&
        expiry &&
        expiry >= todayValue &&
        expiry <= expiringLimitValue);

    return matchesSearch && matchesStatus;
  });
}, [query, medicines, inventoryStatusFilter, lowStockThreshold, expiringSoonDays]); 


const todayValue = formatDateInput(new Date());
const expiryLimitValue = getExpiryLimitValue(expiringSoonDays);

const lowStockMedicines = medicines.filter((m) => m.qty <= lowStockThreshold);

const expiredMedicines = medicines.filter(
  (m) => m.expiry && m.expiry < todayValue
);

const expiringSoonMedicines = medicines.filter(
  (m) => m.expiry && m.expiry >= todayValue && m.expiry <= expiryLimitValue
);

const lowStockCount = lowStockMedicines.length;
const expiringCount = expiringSoonMedicines.length;
const expiredCount = expiredMedicines.length;

const medicineName = (m: Medicine) => (isArabic ? m.name_ar : m.name_en) || m.name_ar || m.name_en;
const alertItems = [
  ...expiredMedicines.slice(0, 6).map((m) => ({
    id: `expired-${m.id}`,
    kind: "expired" as const,
    name: medicineName(m),
    detail: `${isArabic ? "انتهت في" : "Expired"}: ${m.expiry}`,
  })),
  ...lowStockMedicines.slice(0, 6).map((m) => ({
    id: `low-${m.id}`,
    kind: "low" as const,
    name: medicineName(m),
    detail: `${isArabic ? "الكمية المتبقية" : "Remaining qty"}: ${m.qty}`,
  })),
  ...expiringSoonMedicines.slice(0, 6).map((m) => ({
    id: `expiring-${m.id}`,
    kind: "expiring" as const,
    name: medicineName(m),
    detail: `${isArabic ? "تنتهي في" : "Expires"}: ${m.expiry}`,
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
 
const filteredCustomerDebts = customerDebts.filter((customer) => {
  const searchValue = customerSearch.trim().toLowerCase();

  const matchesSearch =
    !searchValue ||
    customer.customerName.toLowerCase().includes(searchValue);

  const remainingDebt = safeNumber(customer.remainingDebt);

  const matchesDebtFilter =
    customerDebtFilter === "all" ||
    (customerDebtFilter === "debt" && remainingDebt > 0) ||
    (customerDebtFilter === "paid" && remainingDebt <= 0);

  return matchesSearch && matchesDebtFilter;
});

const filteredCustomerPayments = customerPayments.filter((payment) => {
  const searchValue = paymentSearch.trim().toLowerCase();

  return (
    !searchValue ||
    payment.customerName.toLowerCase().includes(searchValue) ||
    (payment.paymentNumber || "").toLowerCase().includes(searchValue) ||
    String(payment.userName || "").toLowerCase().includes(searchValue)
  );
});

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
    if (!hasRole(["pharmacy_admin", "super_admin"])) {
      return null;
    }

    const pharmacyId = getPharmacyId();
    const hasPending = subscriptionRequests.some(
      (request) => request.pharmacyId === pharmacyId && request.status === "pending"
    );
    if (hasPending) {
      alert(
        isArabic
          ? "لديك طلب تجديد قيد المراجعة بالفعل"
          : "You already have a pending renewal request"
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

  async function handleApproveSubscriptionRequest(requestId: number): Promise<boolean> {
    if (!isSuperAdmin(appUser)) return false;

    const request = subscriptionRequests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") return false;

    try {
      const pharmacy =
        branches.find((item) => item.id === request.pharmacyId) ||
        (await pharmacyService.getPharmacySettings(request.pharmacyId));
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
    if (!account || account.status !== "pending") {
      alert(isArabic ? "الحساب غير موجود أو تمت معالجته" : "Account not found or already processed");
      return false;
    }

    const confirmed = window.confirm(
      isArabic
        ? `اعتماد حساب ${account.email}؟\n\nتأكد من إنشاء الحساب في Supabase إن لزم.`
        : `Approve account ${account.email}?\n\nEnsure the account exists in Supabase if needed.`
    );
    if (!confirmed) return false;

    try {
      await pharmacyService.approvePharmacyLoginAccount(accountId, appUser?.uid, appUser?.name);

      await addActivityLog({
        type: "login_account_request_approved",
        title: isArabic ? "اعتماد حساب دخول" : "Login account approved",
        description: isArabic ? `تم اعتماد ${account.email}` : `Approved ${account.email}`,
        referenceType: "pharmacy_login_account",
        referenceId: accountId,
        pharmacyId: account.pharmacyId,
      });

      setPendingPharmacyLoginAccounts(
        await pharmacyService.getAllPharmacyLoginAccounts({ status: "pending" })
      );
      alert(isArabic ? "تم اعتماد الحساب" : "Account approved");
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

    const account = pendingPharmacyLoginAccounts.find((item) => item.id === accountId);
    if (!account || account.status !== "pending") return false;

    try {
      await pharmacyService.rejectPharmacyLoginAccount(
        accountId,
        appUser?.uid,
        appUser?.name,
        note
      );

      await addActivityLog({
        type: "login_account_request_rejected",
        title: isArabic ? "رفض حساب دخول" : "Login account rejected",
        description: isArabic ? `تم رفض ${account.email}` : `Rejected ${account.email}`,
        referenceType: "pharmacy_login_account",
        referenceId: accountId,
        pharmacyId: account.pharmacyId,
      });

      setPendingPharmacyLoginAccounts(
        await pharmacyService.getAllPharmacyLoginAccounts({ status: "pending" })
      );
      alert(isArabic ? "تم رفض الحساب" : "Account rejected");
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
  if (!hasRole(["pharmacy_admin", "super_admin"])) {
    alert(isArabic ? "ليس لديك صلاحية لتعديل الإعدادات" : "You do not have permission to edit settings");
    return;
  }

  if (!settingsForm.name || !settingsForm.phone) {
    alert(isArabic ? "اسم الصيدلية ورقم الهاتف مطلوبان" : "Pharmacy name and phone are required");
    return;
  }

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

  const settingsUpdates: Partial<PharmacySettings> & { id: string } = {
    id: getPharmacyId(),
    name: settingsForm.name,
    name_en: settingsForm.name_en,
    phone: settingsForm.phone,
    address: settingsForm.address,
    currency: settingsForm.currency,
    invoiceFooter: settingsForm.invoiceFooter,
    logoBase64: settingsForm.logoBase64,
    lowStockThreshold: lowStockThresholdValue,
    expiringSoonDays: expiringSoonDaysValue,
    isActive: true,
  };

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
  function getPaymentLabel(method: string) {
    if (method === "cash") return isArabic ? "كاش" : "Cash";
    if (method === "visa") return isArabic ? "فيزا" : "Visa";
    if (method === "wallet") return isArabic ? "محفظة" : "Wallet";
    if (method === "credit") return isArabic ? "آجل" : "Credit";
    return method;
  }

  function getSubscriptionPlanLabel(plan: string) {
  if (plan === "monthly") return isArabic ? "شهري" : "Monthly";
  if (plan === "quarterly") return isArabic ? "ربع سنوي" : "Quarterly";
  if (plan === "yearly") return isArabic ? "سنوي" : "Yearly";
  if (plan === "lifetime") return isArabic ? "مدى الحياة" : "Lifetime";
  return plan || "-";
}
  
function getMovementTypeLabel(type: string) {
  if (type === "sale") return isArabic ? "بيع" : "Sale";
  if (type === "return") return isArabic ? "مرتجع" : "Return";
  if (type === "purchase") return isArabic ? "توريد" : "Purchase";
  if (type === "medicine_create") return isArabic ? "إضافة دواء" : "Medicine Create";
  if (type === "medicine_update") return isArabic ? "تعديل دواء" : "Medicine Update";
  if (type === "medicine_delete") return isArabic ? "حذف دواء" : "Medicine Delete";
  return type;
}

function getActivityTypeLabel(type: string) {
  if (type === "sale") return isArabic ? "بيع" : "Sale";
  if (type === "return") return isArabic ? "مرتجع" : "Return";
  if (type === "purchase") return isArabic ? "توريد" : "Purchase";
  if (type === "cost_create") return isArabic ? "تسجيل تكلفة" : "Cost Recorded";
  if (type === "cost_update") return isArabic ? "تعديل تكلفة" : "Cost Updated";
  if (type === "cost_delete") return isArabic ? "حذف تكلفة" : "Cost Deleted";
  if (type === "customer_payment") return isArabic ? "تحصيل عميل" : "Customer Payment";
  if (type === "delete_customer_payment") return isArabic ? "حذف تحصيل" : "Delete Payment";
  if (type === "medicine_create") return isArabic ? "إضافة دواء" : "Medicine Create";
  if (type === "medicine_update") return isArabic ? "تعديل دواء" : "Medicine Update";
  if (type === "medicine_delete") return isArabic ? "حذف دواء" : "Medicine Delete";
  if (type === "settings_update") return isArabic ? "تعديل الإعدادات" : "Settings Update";
  if (type === "user_update") return isArabic ? "تعديل مستخدم" : "User Update";
  if (type === "backup_export") return isArabic ? "تصدير نسخة احتياطية" : "Backup Export";
  if (type === "subscription_renew") return isArabic ? "تجديد الاشتراك" : "Subscription Renew";
  if (type === "subscription_request") return isArabic ? "طلب تجديد اشتراك" : "Subscription Request";
  if (type === "dashboard_export") return isArabic ? "تصدير الداشبورد" : "Dashboard Export";
  if (type === "dashboard_print") return isArabic ? "طباعة الداشبورد" : "Dashboard Print";
  return type;
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
  return hasRole(["pharmacy_admin", "super_admin", "inventory"]);
}

function canUsePurchases() {
  return hasRole(["pharmacy_admin", "super_admin", "inventory"]);
}

function canManageCosts() {
  return hasRole(["pharmacy_admin", "super_admin", "accountant"]);
}

function canViewReports() {
  return hasRole(["pharmacy_admin", "super_admin", "accountant"]);
}

function canViewStockMovements() {
  return hasRole(["pharmacy_admin", "super_admin", "inventory", "accountant"]);
}

function canViewActivityLogs() {
  return hasRole(["pharmacy_admin", "super_admin", "accountant"]);
}

function canManageUsers() {
  return hasRole(["pharmacy_admin", "super_admin"]);
}

function canDeleteMedicine() {
  return hasRole(["pharmacy_admin", "super_admin"]);
}

function canViewInvoices() {
  return hasRole(["pharmacy_admin", "super_admin", "cashier", "accountant"]);
}

function canViewCustomers() {
  return hasRole(["pharmacy_admin", "super_admin", "cashier", "accountant"]);
}

function canUsePOS() {
  return hasRole(["pharmacy_admin", "super_admin", "cashier"]);
}
function canUseReturns() {
  return hasRole(["pharmacy_admin", "super_admin", "cashier"]);
}

function canDeleteReturn() {
  return hasRole(["pharmacy_admin", "super_admin"]);
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
  return activeBranchId || appUser?.pharmacyId || "default-pharmacy";
}
  function addToCart(medicine: Medicine) {
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

  if (isSelling) return;

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

    await pharmacyService.completeSaleWithStockDeduction(cart, invoice as Invoice, stockMovements);
    await refreshMedicinesFromDb();

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
        ? error.message
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

async function refreshPurchasesFromDb() {
  setPurchases(await pharmacyService.getPurchases());
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
  if (id === activeBranchId) return;
  setActiveBranchId(id);
  setIsMenuOpen(false);
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

function openAddBranchModal() {
  setBranchForm({
    id: "",
    name: "",
    name_en: "",
    phone: "",
    address: "",
    currency: pharmacySettings?.currency || "ج.م",
    isActive: true,
  });
  setBranchModal("add");
}

function openEditBranchModal(branch: PharmacySettings) {
  setBranchForm({
    id: branch.id,
    name: branch.name || "",
    name_en: branch.name_en || "",
    phone: branch.phone || "",
    address: branch.address || "",
    currency: branch.currency || "ج.م",
    isActive: branch.isActive !== false,
  });
  setBranchModal("edit");
}

function closeBranchModal() {
  setBranchModal(null);
}

function makeBranchId(): string {
  const base =
    (branchForm.name_en || branchForm.name || "branch")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "branch";
  const existing = new Set(branches.map((b) => b.id));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

async function saveBranch() {
  if (!isPharmacyAdmin(appUser)) {
    alert(isArabic ? "ليس لديك صلاحية لإدارة الفروع" : "You do not have permission to manage branches");
    return;
  }
  const name = branchForm.name.trim();
  if (!name) {
    alert(isArabic ? "من فضلك أدخل اسم الفرع" : "Please enter a branch name");
    return;
  }

  setSavingBranch(true);
  try {
    if (branchModal === "add") {
      const id = makeBranchId();
      await pharmacyService.createPharmacyBranch({
        id,
        name,
        name_en: branchForm.name_en.trim(),
        phone: branchForm.phone.trim(),
        address: branchForm.address.trim(),
        currency: branchForm.currency || "ج.م",
        isActive: branchForm.isActive,
      });
      await addActivityLog({
        type: "settings_update",
        title: isArabic ? "إضافة فرع" : "Branch Added",
        description: isArabic ? `تم إضافة الفرع ${name}` : `Branch ${name} was added`,
        referenceType: "branch",
        referenceId: id,
      });
    } else {
      await pharmacyService.updatePharmacySettings(branchForm.id, {
        name,
        name_en: branchForm.name_en.trim(),
        phone: branchForm.phone.trim(),
        address: branchForm.address.trim(),
        currency: branchForm.currency || "ج.م",
        isActive: branchForm.isActive,
      });
      await addActivityLog({
        type: "settings_update",
        title: isArabic ? "تعديل فرع" : "Branch Updated",
        description: isArabic ? `تم تعديل الفرع ${name}` : `Branch ${name} was updated`,
        referenceType: "branch",
        referenceId: branchForm.id,
      });
    }
    setBranches(await pharmacyService.getPharmacies());
    closeBranchModal();
    alert(isArabic ? "تم حفظ بيانات الفرع" : "Branch saved");
  } catch (error) {
    console.error("saveBranch error:", error);
    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "تعذر حفظ الفرع"
        : "Could not save branch"
    );
  } finally {
    setSavingBranch(false);
  }
}

async function removeBranch(id: string, name: string) {
  if (!isPharmacyAdmin(appUser)) {
    alert(isArabic ? "ليس لديك صلاحية لإدارة الفروع" : "You do not have permission to manage branches");
    return;
  }
  if (id === "main") {
    alert(isArabic ? "لا يمكن حذف الفرع الرئيسي" : "The main branch cannot be deleted");
    return;
  }
  if (id === appUser?.pharmacyId) {
    alert(isArabic ? "لا يمكنك حذف الفرع التابع له حسابك" : "You cannot delete your own branch");
    return;
  }
  const confirmed = window.confirm(
    isArabic
      ? `حذف الفرع "${name}"؟ تأكد أن الفرع لا يحتوي على بيانات (أدوية/فواتير) أولاً.`
      : `Delete branch "${name}"? Make sure it has no data (medicines/invoices) first.`
  );
  if (!confirmed) return;

  try {
    await pharmacyService.deletePharmacy(id);
    if (activeBranchId === id) {
      setActiveBranchId(appUser?.pharmacyId || "main");
    }
    await addActivityLog({
      type: "settings_update",
      title: isArabic ? "حذف فرع" : "Branch Deleted",
      description: isArabic ? `تم حذف الفرع ${name}` : `Branch ${name} was deleted`,
      referenceType: "branch",
      referenceId: id,
    });
    setBranches(await pharmacyService.getPharmacies());
  } catch (error) {
    console.error("removeBranch error:", error);
    alert(
      isArabic
        ? "تعذر حذف الفرع. قد يكون مرتبطاً ببيانات (أدوية أو فواتير)."
        : "Could not delete branch. It may still contain data (medicines or invoices)."
    );
  }
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

                    {branches.length > 1 && (
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

function escapeCSV(value: any) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function barcodeCSV(value: any) {
  return `="${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCSV(filename: string, rows: any[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          if (typeof value === "string" && value.startsWith("=\"")) {
            return value;
          }

          return escapeCSV(value);
        })
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
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

function exportActivityLogsCSV() {
  const rows = [
    [
      isArabic ? "النوع" : "Type",
      isArabic ? "العنوان" : "Title",
      isArabic ? "التفاصيل" : "Description",
      isArabic ? "نوع المرجع" : "Reference Type",
      isArabic ? "رقم المرجع" : "Reference ID",
      isArabic ? "المستخدم" : "User",
      isArabic ? "التاريخ" : "Date",
    ],
    ...filteredActivityLogs.map((log) => [
      getActivityTypeLabel(log.type),
      log.title || "-",
      log.description || "-",
      log.referenceType || "-",
      log.referenceId || "-",
      log.userName || "-",
      log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
    ]),
  ];

  downloadCSV(`activity-logs-${formatDateInput(new Date())}.csv`, rows);
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

const filteredStockMovements = stockMovements.filter((movement: any) => {
  const searchValue = movementSearch.trim().toLowerCase();

  const matchesSearch =
    !searchValue ||
    String(movement.medicineName_ar || "").toLowerCase().includes(searchValue) ||
    String(movement.medicineName_en || "").toLowerCase().includes(searchValue) ||
    String(movement.barcode || "").toLowerCase().includes(searchValue) ||
    String(movement.invoiceNumber || "").toLowerCase().includes(searchValue) ||
    String(movement.returnNumber || "").toLowerCase().includes(searchValue) ||
    String(movement.purchaseNumber || "").toLowerCase().includes(searchValue) ||
    String(movement.userName || "").toLowerCase().includes(searchValue);

  const matchesType =
    movementTypeFilter === "all" || movement.type === movementTypeFilter;

  const movementDate = new Date(movement.createdAt);
  const fromDate = movementFromDate
    ? new Date(`${movementFromDate}T00:00:00`)
    : null;
  const toDate = movementToDate
    ? new Date(`${movementToDate}T23:59:59`)
    : null;

  const matchesFrom = !fromDate || movementDate >= fromDate;
  const matchesTo = !toDate || movementDate <= toDate;

  return matchesSearch && matchesType && matchesFrom && matchesTo;
});

function exportStockMovementsCSV() {
  const rows = [
    [
      isArabic ? "نوع الحركة" : "Movement Type",
      isArabic ? "اسم الدواء عربي" : "Arabic Medicine Name",
      isArabic ? "اسم الدواء إنجليزي" : "English Medicine Name",
      isArabic ? "الباركود" : "Barcode",
      isArabic ? "الكمية قبل" : "Qty Before",
      isArabic ? "التغيير" : "Change",
      isArabic ? "الكمية بعد" : "Qty After",
      isArabic ? "رقم الفاتورة" : "Invoice No.",
      isArabic ? "رقم المرتجع" : "Return No.",
      isArabic ? "رقم التوريد" : "Purchase No.",
      isArabic ? "المورد" : "Supplier",
      isArabic ? "المستخدم" : "User",
      isArabic ? "التاريخ" : "Date",
    ],
    ...filteredStockMovements.map((movement: any) => [
      getMovementTypeLabel(movement.type),
      movement.medicineName_ar || "-",
      movement.medicineName_en || "-",
      barcodeCSV(movement.barcode),
      safeNumber(movement.qtyBefore),
      safeNumber(movement.quantityChange),
      safeNumber(movement.qtyAfter),
      movement.invoiceNumber || "-",
      movement.returnNumber || "-",
      movement.purchaseNumber || "-",
      movement.supplierName || "-",
      movement.userName || "-",
      movement.createdAt
        ? new Date(movement.createdAt).toLocaleString()
        : "-",
    ]),
  ];

  downloadCSV(`stock-movements-${formatDateInput(new Date())}.csv`, rows);
}

function exportCustomersCSV() {
  const rows = [
    [
      isArabic ? "اسم العميل" : "Customer Name",
      isArabic ? "إجمالي الآجل" : "Total Credit",
      isArabic ? "المحصل" : "Paid",
      isArabic ? "المتبقي" : "Remaining",
      isArabic ? "عدد الفواتير" : "Invoices Count",
      isArabic ? "آخر فاتورة" : "Last Invoice Date",
    ],
    ...filteredCustomerDebts.map((customer) => [
      customer.customerName,
      safeNumber(customer.totalDebt).toFixed(2),
      safeNumber(customer.paidAmount).toFixed(2),
      safeNumber(customer.remainingDebt).toFixed(2),
      customer.invoicesCount,
      customer.lastInvoiceDate,
    ]),
  ];

  downloadCSV(`customers-debts-${formatDateInput(new Date())}.csv`, rows);
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
  
function printCustomerPaymentReceipt(payment: CustomerPayment) {
  const docPdf = new jsPDF();
const pageWidth = docPdf.internal.pageSize.getWidth();
const margin = 10;

let y = addPdfHeader(
  docPdf,
  isArabic ? "إيصال تحصيل" : "Customer Payment Receipt",
  `${payment.paymentNumber} - ${payment.date || ""}`
);
  docPdf.setFontSize(10);
  docPdf.text(
  `${pdfLabel("رقم الإيصال", "Receipt No")}: ${payment.paymentNumber}`,
  margin,
  y
);
y += 7;

docPdf.text(
  `${pdfLabel("العميل", "Customer")}: ${payment.customerName}`,
  margin,
  y
);
y += 7;

docPdf.text(
  `${pdfLabel("المبلغ", "Amount")}: ${safeNumber(payment.amount).toFixed(2)} ${t.currency}`,
  margin,
  y
);
y += 7;

docPdf.text(
  `${pdfLabel("طريقة الدفع", "Payment Method")}: ${getPaymentLabel(payment.paymentMethod)}`,
  margin,
  y
);
y += 7;

docPdf.text(
  `${pdfLabel("المستخدم", "User")}: ${payment.userName || "-"}`,
  margin,
  y
);
y += 7;

docPdf.text(
  `${pdfLabel("التاريخ", "Date")}: ${payment.date || "-"}`,
  margin,
  y
);
y += 10;

  if (payment.notes) {
    docPdf.text(
  `${pdfLabel("ملاحظات", "Notes")}: ${payment.notes}`,
  margin,
  y
);
    y += 7;
  }

  docPdf.rect(margin, 45, pageWidth - margin * 2, y - 35);

  y += 12;
  addPdfFooter(docPdf, y);

docPdf.save(`${payment.paymentNumber}.pdf`);
}

  async function saveCustomerPayment() {
    if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }

  if (!canViewCustomers()) {
    alert(isArabic ? "ليس لديك صلاحية لتسجيل التحصيل" : "You do not have permission to collect payments");
    return;
  }

  if (!paymentCustomerName.trim() || paymentAmount <= 0) {
    alert(isArabic ? "اختر العميل وأدخل مبلغ التحصيل" : "Choose customer and enter payment amount");
    return;
  }

 const customer = customerDebts.find(
  (item) => item.customerName === paymentCustomerName.trim()
);

if (!customer) {
  alert(isArabic ? "هذا العميل غير موجود في المديونيات" : "Customer not found in debts");
  return;
}

const remainingDebt = safeNumber(customer.remainingDebt);

if (remainingDebt <= 0) {
  alert(isArabic ? "هذا العميل لا يوجد عليه مديونية" : "This customer has no remaining debt");
  return;
}

if (paymentAmount > remainingDebt) {
  alert(
    isArabic
      ? `مبلغ التحصيل أكبر من الرصيد المتبقي. المتبقي: ${remainingDebt.toFixed(2)} ${t.currency}`
      : `Payment amount is greater than remaining debt. Remaining: ${remainingDebt.toFixed(2)} ${t.currency}`
  );
  return;
}

  try {
    const paymentId = Date.now();
    const paymentNumber = `PAY-${paymentId}`;

    const paymentRecord: CustomerPayment = {
      id: paymentId,
      paymentNumber,
      customerName: paymentCustomerName.trim(),
      amount: Number(paymentAmount),
      paymentMethod: paymentMethodForDebt,
      notes: paymentNotes,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      date: new Date().toLocaleString(),
      createdAt: new Date().toISOString(),
    };

    await pharmacyService.saveCustomerPayment(paymentRecord);
    await addActivityLog({
  type: "customer_payment",
  title: isArabic ? "تحصيل من عميل" : "Customer Payment",
  description: isArabic
    ? `تم تحصيل ${paymentAmount.toFixed(2)} ${t.currency} من العميل ${paymentCustomerName.trim()}`
    : `Collected ${paymentAmount.toFixed(2)} ${t.currency} from ${paymentCustomerName.trim()}`,
  referenceType: "customerPayment",
  referenceId: paymentNumber,
});
          printCustomerPaymentReceipt(paymentRecord);
    alert(isArabic ? "تم تسجيل التحصيل بنجاح" : "Payment saved successfully");

    setPaymentCustomerName("");
    setPaymentAmount(0);
    setPaymentMethodForDebt("cash");
    setPaymentNotes("");
    setShowCustomerPaymentModal(false);
  } catch (error) {
  console.error("Customer payment error:", error);

  alert(
    error instanceof Error
      ? error.message
      : isArabic
      ? "حدث خطأ أثناء تسجيل التحصيل"
      : "An error occurred while saving payment"
  );
}
}
  
function getCustomerPayments(customerName: string) {
  return customerPayments.filter(
    (payment) => payment.customerName === customerName
  );
}

function printCustomerStatement(customer: CustomerDebt) {
  const docPdf = new jsPDF();
const pageWidth = docPdf.internal.pageSize.getWidth();
const margin = 10;

const payments = getCustomerPayments(customer.customerName);

let y = addPdfHeader(
  docPdf,
  isArabic ? "كشف حساب العميل" : "Customer Statement",
  customer.customerName
);
  docPdf.setFontSize(10);
    docPdf.text(
      `${pdfLabel("العميل", "Customer")}: ${customer.customerName}`,
      margin,
      y
    );
    y += 7;

    docPdf.text(
      `${pdfLabel("التاريخ", "Date")}: ${new Date().toLocaleString()}`,
      margin,
      y
    );
  y += 10;

  docPdf.rect(margin, y, pageWidth - margin * 2, 28);
  docPdf.text(
  `${pdfLabel("إجمالي الآجل", "Total Credit")}: ${safeNumber(customer.totalDebt).toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 8
);

docPdf.text(
  `${pdfLabel("المحصل", "Paid")}: ${safeNumber(customer.paidAmount).toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 16
);

docPdf.text(
  `${pdfLabel("المتبقي", "Remaining")}: ${safeNumber(customer.remainingDebt).toFixed(2)} ${t.currency}`,
  margin + 4,
  y + 24
);

  y += 40;

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel("الفواتير الآجلة", "Credit Invoices"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel("رقم الفاتورة", "Invoice No"), margin, y);
  docPdf.text(pdfLabel("التاريخ", "Date"), margin + 45, y);
  docPdf.text(pdfLabel("الإجمالي", "Total"), margin + 130, y);
  y += 5;

  customer.invoices.forEach((invoice) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }

    docPdf.text(invoice.invoiceNumber || `#${invoice.id}`, margin, y);
    docPdf.text(String(invoice.date || "-").slice(0, 28), margin + 45, y);
    docPdf.text(`${safeNumber(invoice.total).toFixed(2)} ${t.currency}`, margin + 130, y);
    y += 7;
  });

  y += 8;

  if (y > 260) {
    docPdf.addPage();
    y = 15;
  }

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel("التحصيلات", "Payments"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel("رقم التحصيل", "Payment No"), margin, y);
  docPdf.text(pdfLabel("التاريخ", "Date"), margin + 45, y);
  docPdf.text(pdfLabel("المبلغ", "Amount"), margin + 130, y);
  y += 5;

  payments.forEach((payment) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }

    docPdf.text(payment.paymentNumber || `#${payment.id}`, margin, y);
    docPdf.text(String(payment.date || "-").slice(0, 28), margin + 45, y);
    docPdf.text(`${safeNumber(payment.amount).toFixed(2)} ${t.currency}`, margin + 130, y);
    y += 7;
  });
  addPdfFooter(docPdf, y);
  docPdf.save(`customer-statement-${customer.customerName}.pdf`);
}

function exportCustomerStatementCSV(customer: CustomerDebt) {
  const payments = getCustomerPayments(customer.customerName);

  const rows = [
    [isArabic ? "كشف حساب العميل" : "Customer Statement"],
    [],
    [isArabic ? "اسم العميل" : "Customer Name", customer.customerName],
    [isArabic ? "إجمالي الآجل" : "Total Credit", safeNumber(customer.totalDebt).toFixed(2)],
    [isArabic ? "المحصل" : "Paid", safeNumber(customer.paidAmount).toFixed(2)],
    [isArabic ? "المتبقي" : "Remaining", safeNumber(customer.remainingDebt).toFixed(2)],
    [],
    [isArabic ? "الفواتير الآجلة" : "Credit Invoices"],
    [
      isArabic ? "رقم الفاتورة" : "Invoice No.",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "الإجمالي" : "Total",
    ],
    ...customer.invoices.map((invoice) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      safeNumber(invoice.total).toFixed(2),
    ]),
    [],
    [isArabic ? "التحصيلات" : "Payments"],
    [
      isArabic ? "رقم التحصيل" : "Payment No.",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "المبلغ" : "Amount",
      isArabic ? "طريقة الدفع" : "Payment Method",
      isArabic ? "المستخدم" : "User",
      isArabic ? "ملاحظات" : "Notes",
    ],
    ...payments.map((payment) => [
      payment.paymentNumber || `#${payment.id}`,
      payment.date || "-",
      safeNumber(payment.amount).toFixed(2),
      getPaymentLabel(payment.paymentMethod || "cash"),
      payment.userName || "-",
      payment.notes || "-",
    ]),
  ];

  downloadCSV(
    `customer-statement-${customer.customerName}-${formatDateInput(new Date())}.csv`,
    rows
  );
}

function openCustomerPaymentModal(customer?: CustomerDebt) {
  if (customer) {
    setPaymentCustomerName(customer.customerName);
    setPaymentAmount(safeNumber(customer.remainingDebt));
  } else {
    setPaymentCustomerName("");
    setPaymentAmount(0);
  }
  setPaymentMethodForDebt("cash");
  setPaymentNotes("");
  setShowCustomerPaymentModal(true);
}

function goToCustomerPaymentForm() {
  setActivePage("customers");
  setCustomerDebtFilter("debt");
  setTimeout(() => openCustomerPaymentModal(), 100);
}

function startCustomerPayment(customer: CustomerDebt) {
  openCustomerPaymentModal(customer);
}

async function deleteCustomerPayment(payment: CustomerPayment) {
  if (!hasRole(["pharmacy_admin", "super_admin"])) {
    alert(
      isArabic
        ? "الحذف متاح للأدمن فقط"
        : "Only admin can delete payments"
    );
    return;
  }

  const paymentNum = payment.paymentNumber || String(payment.id);
  const confirmDelete = window.confirm(
    isArabic
      ? `هل أنت متأكد من حذف التحصيل رقم ${paymentNum}؟`
      : `Are you sure you want to delete payment ${paymentNum}?`
  );

  if (!confirmDelete) return;

  try {
    await pharmacyService.deleteCustomerPayment(paymentNum);
    await addActivityLog({
      type: "delete_customer_payment",
      title: isArabic ? "حذف تحصيل" : "Payment Deleted",
      description: isArabic
    ? `تم حذف التحصيل رقم ${paymentNum} للعميل ${payment.customerName}`
    : `Payment ${paymentNum} for ${payment.customerName} was deleted`,
  referenceType: "customerPayment",
  referenceId: paymentNum,
});
    alert(isArabic ? "تم حذف التحصيل" : "Payment deleted");
  } catch (error) {
    console.error("Delete payment error:", error);
    alert(
      error instanceof Error
        ? error.message
        : isArabic
        ? "حدث خطأ أثناء حذف التحصيل"
        : "An error occurred while deleting payment"
    );
  }
}

const filteredActivityLogs = activityLogs.filter((log) => {

  const searchValue = activitySearch.trim().toLowerCase();

  const matchesSearch =
    !searchValue ||
    String(log.title || "").toLowerCase().includes(searchValue) ||
    String(log.description || "").toLowerCase().includes(searchValue) ||
    String(log.referenceId || "").toLowerCase().includes(searchValue) ||
    String(log.userName || "").toLowerCase().includes(searchValue);

  const matchesType =
    activityTypeFilter === "all" || log.type === activityTypeFilter;

  const logDate = new Date(log.createdAt);
  const fromDate = activityFromDate
    ? new Date(`${activityFromDate}T00:00:00`)
    : null;
  const toDate = activityToDate
    ? new Date(`${activityToDate}T23:59:59`)
    : null;

  const matchesFrom = !fromDate || logDate >= fromDate;
  const matchesTo = !toDate || logDate <= toDate;

  return matchesSearch && matchesType && matchesFrom && matchesTo;
});

const subscriptionRenewLogs = activityLogs
  .filter((log) => log.type === "subscription_renew")
  .slice(0, 10);

const pharmacySubscriptionRequests = subscriptionRequests.filter(
  (request) => request.pharmacyId === getPharmacyId()
);

function renderActivityLogsPage() {
  return (
    <section className="card activityLogsPage">
      <div className="cardHeader">
        <h2>{isArabic ? "سجل النشاط" : "Activity Log"}</h2>
        <button className="printBtn" onClick={exportActivityLogsCSV}>
    <span aria-hidden="true">⬇️</span>
    <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
  </button>
      </div>
      <div className="filtersBar">
  <input
    value={activitySearch}
    onChange={(e) => setActivitySearch(e.target.value)}
    placeholder={
      isArabic
        ? "بحث بالعنوان أو التفاصيل أو المرجع أو المستخدم"
        : "Search title, description, reference, or user"
    }
  />

  <select
    value={activityTypeFilter}
    onChange={(e) => setActivityTypeFilter(e.target.value)}
  >
    <option value="all">{isArabic ? "كل النشاطات" : "All activities"}</option>
    <option value="subscription_renew">
      {getActivityTypeLabel("subscription_renew")}
    </option>
    <option value="sale">{getActivityTypeLabel("sale")}</option>
    <option value="return">{getActivityTypeLabel("return")}</option>
    <option value="settings_update">
  {getActivityTypeLabel("settings_update")}
    </option>
    <option value="user_update">
      {getActivityTypeLabel("user_update")}
    </option>
    <option value="purchase">{getActivityTypeLabel("purchase")}</option>
    <option value="customer_payment">{getActivityTypeLabel("customer_payment")}</option>
    <option value="delete_customer_payment">
      {getActivityTypeLabel("delete_customer_payment")}
    </option>
    <option value="medicine_create">{getActivityTypeLabel("medicine_create")}</option>
    <option value="medicine_update">{getActivityTypeLabel("medicine_update")}</option>
    <option value="medicine_delete">{getActivityTypeLabel("medicine_delete")}</option>
    <option value="dashboard_export">
      {getActivityTypeLabel("dashboard_export")}
    </option>
    <option value="dashboard_print">
      {getActivityTypeLabel("dashboard_print")}
    </option>
  </select>

  <input
    type="date"
    value={activityFromDate}
    onChange={(e) => setActivityFromDate(e.target.value)}
  />

  <input
    type="date"
    value={activityToDate}
    onChange={(e) => setActivityToDate(e.target.value)}
  />

  <button
    className="clearCartBtn"
    onClick={() => {
      setActivitySearch("");
      setActivityTypeFilter("all");
      setActivityFromDate("");
      setActivityToDate("");
    }}
  >
    {isArabic ? "مسح الفلاتر" : "Clear filters"}
  </button>
</div>
      {filteredActivityLogs.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد نشاطات حتى الآن" : "No activity logs yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التفاصيل" : "Description"}</th>
                <th>{isArabic ? "المرجع" : "Reference"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
              </tr>
            </thead>

            <tbody>
              {filteredActivityLogs.map((log) => (
                <tr key={log.id}>
                  <td>{getActivityTypeLabel(log.type)}</td>
                  <td>{log.title}</td>
                  <td>{log.description}</td>
                  <td>
                    {log.referenceType || "-"}{" "}
                    {log.referenceId ? `#${log.referenceId}` : ""}
                  </td>
                  <td>{log.userName || "-"}</td>
                  <td>
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
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

function renderCustomerPaymentFormFields() {
  return (
    <>
      {paymentCustomerName && (
        <p className="mutedText">
          {isArabic
            ? `العميل المحدد: ${paymentCustomerName}`
            : `Selected customer: ${paymentCustomerName}`}
        </p>
      )}
      <div className="formGrid">
        <select
          value={paymentCustomerName}
          onChange={(e) => setPaymentCustomerName(e.target.value)}
        >
          <option value="">
            {isArabic ? "اختر العميل" : "Choose customer"}
          </option>

          {customerDebts
            .filter((customer) => safeNumber(customer.remainingDebt) > 0)
            .map((customer) => (
              <option key={customer.customerName} value={customer.customerName}>
                {customer.customerName} - {safeNumber(customer.remainingDebt).toFixed(2)} {t.currency}
              </option>
            ))}
        </select>

        <input
          type="number"
          value={paymentAmount || ""}
          onChange={(e) =>
            setPaymentAmount(e.target.value === "" ? 0 : Number(e.target.value))
          }
          placeholder={isArabic ? "مبلغ التحصيل" : "Payment amount"}
        />

        <select
          value={paymentMethodForDebt}
          onChange={(e) => setPaymentMethodForDebt(e.target.value as PaymentMethod)}
        >
          <option value="cash">{getPaymentLabel("cash")}</option>
          <option value="visa">{getPaymentLabel("visa")}</option>
          <option value="wallet">{getPaymentLabel("wallet")}</option>
        </select>

        <input
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
          placeholder={isArabic ? "ملاحظات" : "Notes"}
        />
      </div>
    </>
  );
}

function renderCustomersPage() {
  const totalDebts = customerDebts.reduce(
  (sum, customer) => sum + safeNumber(customer.totalDebt),
  0
);

const totalPaid = customerDebts.reduce(
  (sum, customer) => sum + safeNumber(customer.paidAmount),
  0
);

const totalRemaining = customerDebts.reduce(
  (sum, customer) => sum + safeNumber(customer.remainingDebt),
  0
);

  return (
    <section className="card customersPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "العملاء والمديونيات" : "Customers & Debts"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "متابعة المديونيات وتسجيل التحصيلات"
              : "Track debts and record customer payments"}
          </p>
        </div>

        <div className="returnsHeaderBtns">
          {canViewCustomers() && (
            <button
              type="button"
              className="printFullBtn"
              onClick={() => openCustomerPaymentModal()}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل تحصيل من عميل" : "Collect Payment"}
            </button>
          )}
          <button className="printBtn" onClick={exportCustomersCSV}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      <div className="summaryGrid reportSummary">
  <div>
    <span>{isArabic ? "عدد العملاء" : "Customers"}</span>
    <strong>{filteredCustomerDebts.length}</strong>
  </div>

  <div>
    <span>{isArabic ? "إجمالي الآجل" : "Total Credit"}</span>
    <strong>
      {totalDebts.toFixed(2)} {t.currency}
    </strong>
  </div>

  <div>
    <span>{isArabic ? "إجمالي المحصل" : "Total Paid"}</span>
    <strong>
      {totalPaid.toFixed(2)} {t.currency}
    </strong>
  </div>

  <div>
    <span>{isArabic ? "المتبقي" : "Remaining"}</span>
    <strong>
      {totalRemaining.toFixed(2)} {t.currency}
    </strong>
  </div>
</div>

<div className="filtersBar">
  <input
    value={customerSearch}
    onChange={(e) => setCustomerSearch(e.target.value)}
    placeholder={isArabic ? "بحث باسم العميل" : "Search customer"}
  />

  <select
    value={customerDebtFilter}
    onChange={(e) =>
      setCustomerDebtFilter(e.target.value as "all" | "debt" | "paid")
    }
  >
    <option value="all">{isArabic ? "كل العملاء" : "All customers"}</option>
    <option value="debt">{isArabic ? "عليه مديونية" : "Has debt"}</option>
    <option value="paid">{isArabic ? "مسدد بالكامل" : "Fully paid"}</option>
  </select>

  <button
    className="clearCartBtn"
    onClick={() => {
      setCustomerSearch("");
      setCustomerDebtFilter("all");
    }}
  >
    {isArabic ? "مسح الفلاتر" : "Clear filters"}
  </button>
</div>

      {filteredCustomerDebts.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد مديونيات آجلة" : "No credit debts"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "اسم العميل" : "Customer"}</th>
                <th>{isArabic ? "إجمالي الآجل" : "Total Credit"}</th>
                <th>{isArabic ? "المحصل" : "Paid"}</th>
                <th>{isArabic ? "المتبقي" : "Remaining"}</th>
                <th>{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th>{isArabic ? "آخر فاتورة" : "Last Invoice"}</th>
                <th>{t.action}</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomerDebts.map((customer) => (
                <tr key={customer.customerName}>
                  <td>{customer.customerName}</td>
                  <td>{safeNumber(customer.totalDebt).toFixed(2)} {t.currency}</td>
                  <td>{safeNumber(customer.paidAmount).toFixed(2)} {t.currency}</td>
                  <td>
                    <span
                      className={
                        safeNumber(customer.remainingDebt) > 0 ? "badge danger" : "badge ok"
                      }
                    >
                      {safeNumber(customer.remainingDebt).toFixed(2)} {t.currency}
                    </span>
                  </td>
                  <td>{customer.invoicesCount}</td>
                  <td>{customer.lastInvoiceDate}</td>
                  <td>
                    <div className="actionButtons">
                      {safeNumber(customer.remainingDebt) > 0 && (
                      <button
                        className="smallBtn"
                        onClick={() => startCustomerPayment(customer)}
                      >
                        {isArabic ? "تحصيل" : "Collect"}
                      </button>
                    )}
                      <button
                        className="printBtn"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {isArabic ? "كشف حساب" : "Statement"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        <div className="cardHeader" style={{ marginTop: 22 }}>
  <h2>{isArabic ? "سجل التحصيلات" : "Payment History"}</h2>
</div>

<div className="filtersBar">
  <input
    value={paymentSearch}
    onChange={(e) => setPaymentSearch(e.target.value)}
    placeholder={
      isArabic
        ? "بحث باسم العميل أو رقم التحصيل أو المستخدم"
        : "Search customer, payment no, or user"
    }
  />

  <button
    className="clearCartBtn"
    onClick={() => setPaymentSearch("")}
  >
    {isArabic ? "مسح البحث" : "Clear search"}
  </button>
</div>

{filteredCustomerPayments.length === 0 ? (
  <p className="empty">
    {isArabic ? "لا توجد تحصيلات حتى الآن" : "No payments yet"}
  </p>
) : (
  <div className="tableWrap">
    <table>
      <thead>
        <tr>
          <th>{isArabic ? "رقم التحصيل" : "Payment No."}</th>
          <th>{isArabic ? "العميل" : "Customer"}</th>
          <th>{isArabic ? "المبلغ" : "Amount"}</th>
          <th>{isArabic ? "طريقة الدفع" : "Payment Method"}</th>
          <th>{isArabic ? "المستخدم" : "User"}</th>
          <th>{t.date}</th>
          <th>{isArabic ? "ملاحظات" : "Notes"}</th>
          <th>{t.action}</th>
        </tr>
      </thead>

      <tbody>
       {filteredCustomerPayments.map((payment) => (
          <tr key={payment.id}>
            <td>{payment.paymentNumber}</td>
            <td>{payment.customerName}</td>
            <td>
              {safeNumber(payment.amount).toFixed(2)} {t.currency}
            </td>
            <td>{getPaymentLabel(payment.paymentMethod || "cash")}</td>
            <td>{payment.userName || "-"}</td>
            <td>{payment.date || "-"}</td>
            <td>{payment.notes || "-"}</td>
            <td>
            <div className="actionButtons">
              <button
                className="printBtn"
                onClick={() => printCustomerPaymentReceipt(payment)}
              >
                <span aria-hidden="true">🖨️</span>
                <span>{t.print}</span>
              </button>

              {isPharmacyAdmin(appUser) && (
                <button
                  className="deleteSmallBtn"
                  onClick={() => deleteCustomerPayment(payment)}
                >
                  {isArabic ? "حذف" : "Delete"}
                </button>
              )}
            </div>
          </td>
            <td>
              <button
                className="printBtn"
                onClick={() => printCustomerPaymentReceipt(payment)}
              >
                <span aria-hidden="true">🖨️</span>
                <span>{t.print}</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

      {showCustomerPaymentModal && (
        <div className="modalOverlay" onClick={() => setShowCustomerPaymentModal(false)}>
          <div className="invoiceModal purchaseModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "تسجيل تحصيل من عميل" : "Collect Customer Payment"}</h2>
                <p>
                  {isArabic
                    ? "اختر العميل وأدخل مبلغ التحصيل"
                    : "Select customer and enter payment amount"}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                onClick={() => setShowCustomerPaymentModal(false)}
              >
                ×
              </button>
            </div>

            <div className="medicineForm purchaseModalForm">
              {renderCustomerPaymentFormFields()}
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="addMedicineBtn"
                onClick={() => void saveCustomerPayment()}
                disabled={isSubscriptionExpired}
              >
                {isSubscriptionExpired
                  ? isArabic
                    ? "الاشتراك منتهي"
                    : "Subscription Expired"
                  : isArabic
                  ? "حفظ التحصيل"
                  : "Save Payment"}
              </button>
              <button
                type="button"
                className="completeBtn"
                onClick={() => setShowCustomerPaymentModal(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
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

  function renderBranchModal() {
    if (!branchModal) return null;
    return (
      <div className="modalOverlay" onClick={closeBranchModal}>
        <div className="userFormPanel" onClick={(e) => e.stopPropagation()}>
          <div className="modalHeader">
            <h2>
              {branchModal === "add"
                ? isArabic
                  ? "إضافة فرع"
                  : "Add Branch"
                : isArabic
                ? "تعديل فرع"
                : "Edit Branch"}
            </h2>
            <button className="closeBtn" type="button" onClick={closeBranchModal}>
              ×
            </button>
          </div>

          <div className="userFormGrid">
            <label>
              <span>{isArabic ? "اسم الفرع" : "Branch name"}</span>
              <input
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                placeholder={isArabic ? "فرع المعادي" : "Maadi Branch"}
              />
            </label>

            <label>
              <span>{isArabic ? "الاسم بالإنجليزية" : "Name (English)"}</span>
              <input
                value={branchForm.name_en}
                onChange={(e) => setBranchForm({ ...branchForm, name_en: e.target.value })}
                placeholder="Maadi Branch"
              />
            </label>

            <label>
              <span>{isArabic ? "الهاتف" : "Phone"}</span>
              <input
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
              />
            </label>

            <label>
              <span>{isArabic ? "العملة" : "Currency"}</span>
              <input
                value={branchForm.currency}
                onChange={(e) => setBranchForm({ ...branchForm, currency: e.target.value })}
              />
            </label>

            <label className="userFormFullWidth">
              <span>{isArabic ? "العنوان" : "Address"}</span>
              <input
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              />
            </label>

            <label className="userFormFullWidth branchActiveToggle">
              <input
                type="checkbox"
                checked={branchForm.isActive}
                onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
              />
              <span>{isArabic ? "فرع مفعّل" : "Active branch"}</span>
            </label>
          </div>

          <div className="modalActions">
            <button className="ghostBtn" type="button" onClick={closeBranchModal}>
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              className="printBtn"
              type="button"
              disabled={savingBranch}
              onClick={() => void saveBranch()}
            >
              {savingBranch
                ? isArabic
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : isArabic
                ? "حفظ"
                : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderBranchesPage() {
    const effectiveBranchId = activeBranchId || appUser?.pharmacyId;
    return (
      <section className="card branchesPage">
        {renderBranchModal()}

        <div className="cardHeader">
          <h2>{isArabic ? "الفروع" : "Branches"}</h2>
          <button className="printBtn" type="button" onClick={openAddBranchModal}>
            {isArabic ? "+ إضافة فرع" : "+ Add Branch"}
          </button>
        </div>

        <p className="hintText">
          {isArabic
            ? "كل فرع له مخزونه وفواتيره وبياناته المنفصلة. اختر الفرع النشط لعرض وإدارة بياناته."
            : "Each branch has its own separate inventory, invoices, and data. Pick the active branch to view and manage its data."}
        </p>

        {branches.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد فروع — اضغط إضافة فرع" : "No branches — click Add Branch"}
          </p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الفرع" : "Branch"}</th>
                  <th>{isArabic ? "الهاتف" : "Phone"}</th>
                  <th>{isArabic ? "العنوان" : "Address"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>

              <tbody>
                {branches.map((branch) => {
                  const isCurrent = branch.id === effectiveBranchId;
                  return (
                    <tr key={branch.id} className={isCurrent ? "branchActiveRow" : ""}>
                      <td>
                        <strong>{(isArabic ? branch.name : branch.name_en) || branch.name}</strong>
                        {isCurrent && (
                          <span className="badge ok branchCurrentTag">
                            {isArabic ? "نشط الآن" : "Active"}
                          </span>
                        )}
                      </td>
                      <td>{branch.phone || "-"}</td>
                      <td>{branch.address || "-"}</td>
                      <td>
                        <span className={branch.isActive !== false ? "badge ok" : "badge danger"}>
                          {branch.isActive !== false
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
                            className="smallBtn"
                            disabled={isCurrent}
                            onClick={() => switchBranch(branch.id)}
                          >
                            {isArabic ? "تبديل" : "Switch"}
                          </button>
                          <button
                            type="button"
                            className="editBtn"
                            onClick={() => openEditBranchModal(branch)}
                          >
                            {isArabic ? "تعديل" : "Edit"}
                          </button>
                          <button
                            type="button"
                            className="deleteSmallBtn"
                            disabled={branch.id === "main" || branch.id === appUser?.pharmacyId}
                            onClick={() =>
                              void removeBranch(
                                branch.id,
                                (isArabic ? branch.name : branch.name_en) || branch.name
                              )
                            }
                          >
                            {isArabic ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderStockMovementsTable() {
  return (
    <section className="card stockMovementsPage">
      <div className="cardHeader">
        <h2>{isArabic ? "حركة المخزون" : "Stock Movements"}</h2>

        <button className="printBtn" onClick={exportStockMovementsCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      <div className="filtersBar">
  <input
    value={movementSearch}
    onChange={(e) => setMovementSearch(e.target.value)}
    placeholder={
      isArabic
        ? "بحث بالدواء أو الباركود أو رقم الفاتورة أو المستخدم"
        : "Search medicine, barcode, invoice, or user"
    }
  />

  <select
    value={movementTypeFilter}
    onChange={(e) => setMovementTypeFilter(e.target.value)}
  >
    <option value="all">{isArabic ? "كل الحركات" : "All movements"}</option>
    <option value="sale">{getMovementTypeLabel("sale")}</option>
    <option value="return">{getMovementTypeLabel("return")}</option>
    <option value="purchase">{getMovementTypeLabel("purchase")}</option>
    <option value="medicine_create">{getMovementTypeLabel("medicine_create")}</option>
    <option value="medicine_update">{getMovementTypeLabel("medicine_update")}</option>
    <option value="medicine_delete">{getMovementTypeLabel("medicine_delete")}</option>
  </select>

  <input
    type="date"
    value={movementFromDate}
    onChange={(e) => setMovementFromDate(e.target.value)}
  />

  <input
    type="date"
    value={movementToDate}
    onChange={(e) => setMovementToDate(e.target.value)}
  />

  <button
    className="clearCartBtn"
    onClick={() => {
      setMovementSearch("");
      setMovementTypeFilter("all");
      setMovementFromDate("");
      setMovementToDate("");
    }}
  >
    {isArabic ? "مسح الفلاتر" : "Clear filters"}
  </button>
</div>

      {filteredStockMovements.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد حركات مخزون حتى الآن" : "No stock movements yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "النوع" : "Type"}</th>
                <th>{isArabic ? "الدواء" : "Medicine"}</th>
                <th>{t.barcode}</th>
                <th>{isArabic ? "قبل" : "Before"}</th>
                <th>{isArabic ? "التغيير" : "Change"}</th>
                <th>{isArabic ? "بعد" : "After"}</th>
                <th>{isArabic ? "الفاتورة" : "Invoice"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
              </tr>
            </thead>

            <tbody>
              {filteredStockMovements.map((movement, index) => (
                <tr key={`${movement.createdAt}-${movement.medicineId}-${index}`}>
                  <td>{getMovementTypeLabel(movement.type)}</td>
                  <td>
                    {isArabic
                      ? movement.medicineName_ar
                      : movement.medicineName_en}
                  </td>
                  <td>{movement.barcode}</td>
                  <td>{movement.qtyBefore}</td>
                  <td>
                    <span
                      className={
                        movement.quantityChange < 0
                          ? "badge danger"
                          : "badge ok"
                      }
                    >
                      {movement.quantityChange > 0
                        ? `+${movement.quantityChange}`
                        : movement.quantityChange}
                    </span>
                  </td>
                  <td>{movement.qtyAfter}</td>
                  <td>{movement.invoiceNumber || "-"}</td>
                  <td>{movement.userName || "-"}</td>
                  <td>
                    {movement.createdAt
                      ? new Date(movement.createdAt).toLocaleString()
                      : "-"}
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
    subscriptionPlan: "basic",
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
      subscriptionPlan: tenantForm.subscriptionPlan || "basic",
      subscriptionStatus: "active",
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
      email: loginEmail,
      password: loginPassword,
    });

    if (result.needsEmailConfirmation) {
      setRegisterSuccess(
        isArabic
          ? "تم إنشاء الحساب. راجع بريدك لتأكيد الحساب ثم سجّل الدخول."
          : "Account created. Check your email to confirm, then sign in."
      );
      setAuthMode("login");
      setLoginPassword("");
      return;
    }

    setRegisterSuccess(
      isArabic ? "تم إنشاء الحساب بنجاح — جاري الدخول..." : "Account created — signing in..."
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
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
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
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
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
      loginError={loginError}
      registerSuccess={registerSuccess}
      registering={registering}
      googleLoading={googleLoading}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onRegisterNameChange={setRegisterName}
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
            title={
              isArabic
                ? pharmacySettings?.name || "صيدلية Focus"
                : pharmacySettings?.name_en || pharmacySettings?.name || "Focus Pharmacy"
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
            onSelectPage={setActivePage}
          />
        </div>

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
            hasAdminRole={isPharmacyAdmin(appUser)}
            onOpenSubscriptionSettings={() => setActivePage("settings")}
            onOpenPOS={() => {
              setActivePage("pos");
              setQuery("");
            }}
            onOpenPurchases={() => {
              setActivePage("purchases");
              setQuery("");
            }}
            onOpenInventory={(filter) => {
              setActivePage("inventory");
              setInventoryStatusFilter(filter);
              setQuery("");
            }}
            onOpenCustomerPayments={goToCustomerPaymentForm}
            onNavigate={(page) => {
              setActivePage(page);
            }}
          />
        )}

        {displayPage === "inventory" && (
          <InventoryPage
            medicines={medicines}
            newMedicine={newMedicine}
            editingMedicineId={editingMedicineId}
            isArabic={isArabic}
            t={t}
            currency={t.currency}
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
          />
        )}

        {displayPage === "purchases" && canOpenPage("purchases") && (
          <PurchasesPage
            purchases={purchases}
            branches={branches}
            defaultBranchId={getPharmacyId()}
            isArabic={isArabic}
            t={t}
            currency={t.currency}
            canUsePurchases={canUsePurchases()}
            isSubscriptionExpired={isSubscriptionExpired}
            userId={user?.uid}
            userName={appUser?.name}
            onActivityLog={addActivityLog}
            onRefreshMedicines={refreshMedicinesFromDb}
            onRefreshPurchases={refreshPurchasesFromDb}
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
          />
        )}

        {displayPage === "invoices" && (
          <InvoicesPage
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
            t={t}
            isArabic={isArabic}
            currency={t.currency}
            safeNumber={safeNumber}
          />
        )}
        {displayPage === "customers" &&
          canOpenPage("customers") &&
          renderCustomersPage()}

        {displayPage === "stockMovements" &&
          canOpenPage("stockMovements") &&
          renderStockMovementsTable()}
          
          {displayPage === "activityLogs" &&
          canOpenPage("activityLogs") &&
          renderActivityLogsPage()}

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
            subscriptionRequests={subscriptionRequests}
            onApproveSubscriptionRequest={handleApproveSubscriptionRequest}
            onRejectSubscriptionRequest={handleRejectSubscriptionRequest}
            pendingPharmacyLoginAccounts={pendingPharmacyLoginAccounts}
            onApprovePharmacyLoginAccount={handleApprovePharmacyLoginAccount}
            onRejectPharmacyLoginAccount={handleRejectPharmacyLoginAccount}
            onRefreshAdminRequests={refreshAdminRequestsStable}
          />
        )}
        {displayPage === "branches" && canOpenPage("branches") && renderBranchesPage()}
        {displayPage === "settings" && canOpenPage("settings") && (
          <SettingsPage
            isArabic={isArabic}
            pharmacyId={getPharmacyId()}
            t={t}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            isSubscriptionExpired={isSubscriptionExpired}
            isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
            getSubscriptionPlanLabel={getSubscriptionPlanLabel}
            submitSubscriptionRequest={handleSubmitSubscriptionRequest}
            pharmacySubscriptionRequests={pharmacySubscriptionRequests}
            hasRole={hasRole}
            subscriptionRenewLogs={subscriptionRenewLogs}
            subscriptionDaysLeft={subscriptionDaysLeft}
            handleLogoUpload={handleLogoUpload}
            savePharmacySettings={savePharmacySettings}
            exportBackupCSV={exportBackupCSV}
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
      
      {selectedCustomer && (
  <div className="modalOverlay" onClick={() => setSelectedCustomer(null)}>
    <div className="invoiceModal" onClick={(e) => e.stopPropagation()}>
      <div className="modalHeader">
        <div>
          <h2>{isArabic ? "كشف حساب العميل" : "Customer Statement"}</h2>
          <p>{selectedCustomer.customerName}</p>
        </div>

        <button className="closeBtn" onClick={() => setSelectedCustomer(null)}>
          ×
        </button>
      </div>

      <div className="invoiceInfo">
        <div>
          <span>{isArabic ? "إجمالي الآجل" : "Total Credit"}</span>
          <strong>
            {safeNumber(selectedCustomer.totalDebt).toFixed(2)} {t.currency}
          </strong>
        </div>

        <div>
          <span>{isArabic ? "المحصل" : "Paid"}</span>
          <strong>
            {safeNumber(selectedCustomer.paidAmount).toFixed(2)} {t.currency}
          </strong>
        </div>

        <div>
          <span>{isArabic ? "المتبقي" : "Remaining"}</span>
          <strong>
            {safeNumber(selectedCustomer.remainingDebt).toFixed(2)} {t.currency}
          </strong>
        </div>

        <div>
          <span>{isArabic ? "عدد الفواتير" : "Invoices"}</span>
          <strong>{selectedCustomer.invoicesCount}</strong>
        </div>
      </div>

      <div className="cardHeader" style={{ marginTop: 16 }}>
        <h2>{isArabic ? "الفواتير الآجلة" : "Credit Invoices"}</h2>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{t.invoiceNo}</th>
              <th>{t.date}</th>
              <th>{t.total}</th>
              <th>{t.action}</th>
            </tr>
          </thead>

          <tbody>
            {selectedCustomer.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber || `#${invoice.id}`}</td>
                <td>{invoice.date || "-"}</td>
                <td>
                  {safeNumber(invoice.total).toFixed(2)} {t.currency}
                </td>
                <td>
                  <button
                    className="smallBtn"
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    {t.view}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cardHeader" style={{ marginTop: 16 }}>
        <h2>{isArabic ? "التحصيلات" : "Payments"}</h2>
      </div>

      {getCustomerPayments(selectedCustomer.customerName).length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد تحصيلات لهذا العميل" : "No payments for this customer"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "رقم التحصيل" : "Payment No."}</th>
                <th>{t.date}</th>
                <th>{isArabic ? "المبلغ" : "Amount"}</th>
                <th>{t.paymentMethod}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
              </tr>
            </thead>

            <tbody>
              {getCustomerPayments(selectedCustomer.customerName).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paymentNumber}</td>
                  <td>{payment.date || "-"}</td>
                  <td>
                    {safeNumber(payment.amount).toFixed(2)} {t.currency}
                  </td>
                  <td>{getPaymentLabel(payment.paymentMethod || "cash")}</td>
                  <td>{payment.userName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

     <div className="modalActions">
  <button
    className="printFullBtn"
    onClick={() => printCustomerStatement(selectedCustomer)}
  >
    <span aria-hidden="true">🖨️</span>
    <span>{isArabic ? "طباعة كشف الحساب" : "Print Statement"}</span>
  </button>

  <button
    className="printBtn"
    onClick={() => exportCustomerStatementCSV(selectedCustomer)}
  >
    <span aria-hidden="true">⬇️</span>
    <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
  </button>

  <button className="completeBtn" onClick={() => setSelectedCustomer(null)}>
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
