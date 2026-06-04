import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as pharmacyService from "./services/pharmacyService";
import "./styles.css";
import { ARABIC_FONT_BASE64 } from "./arabicFont";
import { LOGO_BASE64 } from "./logoBase64";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatCard from "./components/StatCard";
import MedicineTable from "./components/MedicineTable";
import MedicineForm from "./components/MedicineForm";
import PosCart from "./components/PosCart";
import InvoiceTable from "./components/InvoiceTable";
import InvoiceModal from "./components/InvoiceModal";
import LoginPage from "./components/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import PosPage from "./pages/PosPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
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
  PharmacySettings,
  PurchaseRecord,
  ReturnItem,
  ReturnRecord,
  StockMovement,
  SystemUser,
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
  const customerPaymentFormRef = useRef<HTMLDivElement | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [movementFromDate, setMovementFromDate] = useState("");
  const [movementToDate, setMovementToDate] = useState("");
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isReturning, setIsReturning] = useState(false);
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
  "all" | "low" | "expiring" | "expired"
  >("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePaymentFilter, setInvoicePaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [invoiceFromDate, setInvoiceFromDate] = useState("");
  const [invoiceToDate, setInvoiceToDate] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newMedicine, setNewMedicine] = useState<NewMedicineForm>(emptyMedicineForm);
  const [purchaseForm, setPurchaseForm] = useState({
  barcode: "",
  name_ar: "",
  name_en: "",
  qty: 0,
  buyPrice: 0,
  price: 0,
  expiry: "",
  supplierName: "",
  notes: "",
});
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [reportFrom, setReportFrom] = useState(formatDateInput(new Date()));
  const [reportTo, setReportTo] = useState(formatDateInput(new Date()));
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);
  const t = translations[lang];
  const isArabic = lang === "ar";
  const [user, setUser] = useState<{ uid: string; email?: string } | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseFromDate, setPurchaseFromDate] = useState("");
  const [purchaseToDate, setPurchaseToDate] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDebtFilter, setCustomerDebtFilter] = useState<"all" | "debt" | "paid">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
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
  const [userModal, setUserModal] = useState<"add" | "edit" | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [savingUserEdit, setSavingUserEdit] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as AppUser["role"],
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
});
useEffect(() => {
  let cancelled = false;

  const processSession = async (session: { user?: { id: string; email?: string | null } } | null) => {
    if (cancelled) return;

    const currentUser = session?.user
      ? { uid: session.user.id, email: session.user.email || undefined }
      : null;

    setUser(currentUser);
    setAuthLoading(false);

    if (!currentUser) {
      setAppUser(null);
      setActiveBranchId(null);
      pharmacyService.setActivePharmacy(null);
      setUserLoading(false);
      return;
    }

    try {
      setUserLoading(true);
      const data = await pharmacyService.getAppUserByUid(currentUser.uid);

      if (!data) {
        setAppUser(null);
        await pharmacyService.signOutUser();
        alert("هذا المستخدم غير مسجل في نظام الصيدلية");
        return;
      }

      if (!data.isActive) {
        setAppUser(null);
        await pharmacyService.signOutUser();
        alert("هذا المستخدم موقوف");
        return;
      }

      setAppUser(data);
      setActiveBranchId(data.pharmacyId || null);
    } catch (error) {
      console.error("[Auth] error loading app user", error);
      setAppUser(null);
      await pharmacyService.signOutUser();
      alert("حدث خطأ أثناء تحميل بيانات المستخدم");
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
        });
      }

      if (user.role === "admin" && branchId === "main") {
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
      setStockMovements(await pharmacyService.getStockMovements());
      setActivityLogs(await pharmacyService.getActivityLogs());

      setBranches(await pharmacyService.getPharmacies());

      if (user.role === "admin") {
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
      });
    }));

    cleanup.push(pharmacyService.subscribeMedicines(setMedicines));
    cleanup.push(pharmacyService.subscribeInvoices(setInvoices));
    cleanup.push(pharmacyService.subscribeReturns(setReturns));
    cleanup.push(pharmacyService.subscribePurchases(setPurchases));
    cleanup.push(pharmacyService.subscribeCustomerPayments(setCustomerPayments));
    cleanup.push(pharmacyService.subscribeStockMovements(setStockMovements));
    cleanup.push(pharmacyService.subscribeActivityLogs(setActivityLogs));

    if (currentAppUser.role === "admin") {
      cleanup.push(pharmacyService.subscribeUsers(branchId, setSystemUsers));
    }

    return () => {
      cleanup.forEach((unsubscribe) => unsubscribe());
    };
  }, [appUser, activeBranchId]);

   const filteredMedicines = useMemo(() => {
  const value = query.trim().toLowerCase();
  const todayValue = formatDateInput(new Date());
  const expiringLimit = new Date();
  expiringLimit.setDate(expiringLimit.getDate() + 30);
  const expiringLimitValue = formatDateInput(expiringLimit);

  return medicines.filter((medicine) => {
    const matchesSearch =
      !value ||
      medicine.name_ar.toLowerCase().includes(value) ||
      medicine.name_en.toLowerCase().includes(value) ||
      medicine.barcode.includes(value);

    const expiry = medicine.expiry || "";

    const matchesStatus =
      inventoryStatusFilter === "all" ||
      (inventoryStatusFilter === "low" && medicine.qty <= 20) ||
      (inventoryStatusFilter === "expired" && expiry && expiry < todayValue) ||
      (inventoryStatusFilter === "expiring" &&
        expiry &&
        expiry >= todayValue &&
        expiry <= expiringLimitValue);

    return matchesSearch && matchesStatus;
  });
}, [query, medicines, inventoryStatusFilter]); 


const todayValue = formatDateInput(new Date());

const expiryLimitDate = new Date();
expiryLimitDate.setDate(expiryLimitDate.getDate() + 30);
const expiryLimitValue = formatDateInput(expiryLimitDate);

const lowStockMedicines = medicines.filter((m) => m.qty <= 20);

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

  async function renewSubscription(days = 30) {
  if (!hasRole(["admin"])) {
    alert(
      isArabic
        ? "التجديد متاح للأدمن فقط"
        : "Renewal is available for admin only"
    );
    return;
  }

  const currentEndDate = pharmacySettings?.subscriptionEndDate
    ? new Date(`${pharmacySettings.subscriptionEndDate}T23:59:59`)
    : new Date();

  const today = new Date();

  const startDate = currentEndDate > today ? currentEndDate : today;

  startDate.setDate(startDate.getDate() + days);

  const newEndDate = formatDateInput(startDate);

  const newPlan =
    days >= 365 ? "yearly" : days >= 90 ? "quarterly" : "monthly";

  await pharmacyService.updatePharmacySettings(getPharmacyId(), {
    subscriptionEndDate: newEndDate,
    subscriptionPlan: newPlan,
    isActive: true,
  });

  setSettingsForm({
    ...settingsForm,
    subscriptionEndDate: newEndDate,
    subscriptionPlan: newPlan,
  });

  await addActivityLog({
    type: "subscription_renew",
    title: isArabic ? "تجديد الاشتراك" : "Subscription Renewed",
    description: isArabic
      ? `تم تجديد الاشتراك لمدة ${days} يوم حتى ${newEndDate}`
      : `Subscription renewed for ${days} days until ${newEndDate}`,
    referenceType: "pharmacy",
    referenceId: getPharmacyId(),
  });

  alert(
    isArabic
      ? `تم تجديد الاشتراك حتى ${newEndDate}`
      : `Subscription renewed until ${newEndDate}`
  );
}
 
function handleLogoUpload(file: File | null) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    setSettingsForm({
      ...settingsForm,
      logoBase64: String(reader.result || ""),
    });
  };

  reader.readAsDataURL(file);
}

  async function savePharmacySettings() {
  if (!hasRole(["admin"])) {
    alert(isArabic ? "ليس لديك صلاحية لتعديل الإعدادات" : "You do not have permission to edit settings");
    return;
  }

  if (!settingsForm.name || !settingsForm.phone) {
    alert(isArabic ? "اسم الصيدلية ورقم الهاتف مطلوبان" : "Pharmacy name and phone are required");
    return;
  }

  await pharmacyService.updatePharmacySettings(getPharmacyId(), {
    id: getPharmacyId(),
    name: settingsForm.name,
    name_en: settingsForm.name_en,
    phone: settingsForm.phone,
    address: settingsForm.address,
    currency: settingsForm.currency,
    invoiceFooter: settingsForm.invoiceFooter,
    subscriptionPlan: settingsForm.subscriptionPlan,
    subscriptionEndDate: settingsForm.subscriptionEndDate,
    logoBase64: settingsForm.logoBase64,
    isActive: true,
  });
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
  if (type === "customer_payment") return isArabic ? "تحصيل عميل" : "Customer Payment";
  if (type === "delete_customer_payment") return isArabic ? "حذف تحصيل" : "Delete Payment";
  if (type === "medicine_create") return isArabic ? "إضافة دواء" : "Medicine Create";
  if (type === "medicine_update") return isArabic ? "تعديل دواء" : "Medicine Update";
  if (type === "medicine_delete") return isArabic ? "حذف دواء" : "Medicine Delete";
  if (type === "settings_update") return isArabic ? "تعديل الإعدادات" : "Settings Update";
  if (type === "user_update") return isArabic ? "تعديل مستخدم" : "User Update";
  if (type === "backup_export") return isArabic ? "تصدير نسخة احتياطية" : "Backup Export";
  if (type === "subscription_renew") return isArabic ? "تجديد الاشتراك" : "Subscription Renew";
  if (type === "dashboard_export") return isArabic ? "تصدير الداشبورد" : "Dashboard Export";
  if (type === "dashboard_print") return isArabic ? "طباعة الداشبورد" : "Dashboard Print";
  return type;
}

function hasRole(roles: AppUser["role"][]) {
  if (!appUser) return false;
  return roles.includes(appUser.role);
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
  return hasRole(["admin", "inventory"]);
}

function canUsePurchases() {
  return hasRole(["admin", "inventory"]);
}

function canViewReports() {
  return hasRole(["admin", "manager"]);
}

function canViewStockMovements() {
  return hasRole(["admin", "inventory", "manager"]);
}

function canViewActivityLogs() {
  return hasRole(["admin", "manager"]);
}

function canManageUsers() {
  return hasRole(["admin"]);
}

function canDeleteMedicine() {
  return hasRole(["admin"]);
}

function canViewInvoices() {
  return hasRole(["admin", "cashier", "manager"]);
}

function canViewCustomers() {
  return hasRole(["admin", "cashier", "manager"]);
}

function canUsePOS() {
  return hasRole(["admin", "cashier"]);
}
function canUseReturns() {
  return hasRole(["admin", "cashier"]);
}
function canOpenPage(page: Page) {
  if (!appUser) return false;

  if (appUser.role === "admin") return true;

  if (appUser.role === "cashier") {
  return (
    page === "pos" ||
    page === "invoices" ||
    page === "returns" ||
    page === "customers"
  );
}

  if (appUser.role === "inventory") {
  return page === "inventory" || page === "stockMovements" || page === "purchases";
}

  if (appUser.role === "manager") {
  return (
    page === "dashboard" ||
    page === "invoices" ||
    page === "returns" ||
    page === "customers" ||
    page === "reports" ||
    page === "stockMovements" ||
    page === "activityLogs"
  );
}

  return false;
}
function getPharmacyId() {
  return activeBranchId || appUser?.pharmacyId || "default-pharmacy";
}
  function addToCart(medicine: Medicine) {
    if (medicine.qty <= 0) {
      alert(isArabic ? "هذا الدواء غير متوفر في المخزون" : "This medicine is out of stock");
      return;
    }

    setCart((oldCart) => {
      const found = oldCart.find((item) => item.id === medicine.id);

      if (found) {
        if (found.cartQty >= medicine.qty) {
          alert(isArabic ? "لا توجد كمية كافية في المخزون" : "Not enough stock");
          return oldCart;
        }
        return oldCart.map((item) =>
          item.id === medicine.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      }

      return [...oldCart, { ...medicine, cartQty: 1 }];
    });
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
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      createdAt: new Date().toISOString(),
    };

    await pharmacyService.addActivityLog(logRecord);
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

  async function saveMedicine() {
    if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }
    if (!canManageInventory()) {
  alert(isArabic ? "ليس لديك صلاحية لإدارة المخزون" : "You do not have permission to manage inventory");
  return;
}
    if (!newMedicine.name_ar || !newMedicine.name_en || !newMedicine.barcode || !newMedicine.expiry) {
      alert(isArabic ? "من فضلك أكمل بيانات الدواء" : "Please complete medicine data");
      return;
    }

    if (newMedicine.qty < 0 || (newMedicine.buyPrice ?? -1) < 0 || newMedicine.price <= 0) {
      alert(isArabic ? "تأكد من الكمية وسعر الشراء وسعر البيع" : "Check quantity, buy price and sell price");
      return;
    }

    const barcodeExists = medicines.find(
      (medicine) => medicine.barcode === newMedicine.barcode && medicine.id !== editingMedicineId
    );

    if (barcodeExists) {
      alert(isArabic ? "الباركود موجود بالفعل" : "Barcode already exists");
      return;
    }

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



    const oldMedicine = medicines.find((m) => m.id === medicineId);
    if (editingMedicineId) {
      await pharmacyService.updateMedicine(medicineId, medicine);
    } else {
      await pharmacyService.addMedicine(medicine);
    }

    await pharmacyService.addStockMovement({
      type: editingMedicineId ? "medicine_update" : "medicine_create",
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

await addActivityLog({
  type: editingMedicineId ? "medicine_update" : "medicine_create",
  title: editingMedicineId
    ? isArabic
      ? "تعديل دواء"
      : "Medicine Updated"
    : isArabic
    ? "إضافة دواء"
    : "Medicine Created",
  description: editingMedicineId
    ? isArabic
      ? `تم تعديل بيانات الدواء ${medicine.name_ar}`
      : `Medicine ${medicine.name_en} was updated`
    : isArabic
    ? `تمت إضافة الدواء ${medicine.name_ar} بكمية ${medicine.qty}`
    : `Medicine ${medicine.name_en} was created with quantity ${medicine.qty}`,
  referenceType: "medicine",
  referenceId: String(medicineId),
});

    setNewMedicine(emptyMedicineForm);
    setEditingMedicineId(null);
    alert(editingMedicineId ? (isArabic ? "تم تعديل الدواء بنجاح" : "Medicine updated successfully") : (isArabic ? "تمت إضافة الدواء بنجاح" : "Medicine added successfully"));
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
function getReturnedQtyForInvoice(invoiceNumber: string, medicineId: number) {
  return returns
    .filter((returnRecord) => returnRecord.invoiceNumber === invoiceNumber)
    .flatMap((returnRecord) => returnRecord.items || [])
    .filter((item) => item.medicineId === medicineId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
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

  const selectedReturnItems = returnInvoice.items
    .map((item) => {
      const quantity = Number(returnQuantities[item.medicineId] || 0);

      return {
        ...item,
        quantity,
        lineTotal: item.unitPrice * quantity,
        costTotal: (item.buyPrice || 0) * quantity,
        profit: item.unitPrice * quantity - (item.buyPrice || 0) * quantity,
      };
    })
    .filter((item) => item.quantity > 0);

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
  if (appUser?.pharmacyId) {
    setSystemUsers(await pharmacyService.getSystemUsers(appUser.pharmacyId));
  }

  if (userModal !== "edit") {
    alert(isArabic ? "تم تحديث المستخدم" : "User updated");
  }
}

function getRoleLabel(role: AppUser["role"]) {
  if (!isArabic) return role;
  const labels: Record<AppUser["role"], string> = {
    admin: "مدير",
    cashier: "كاشير",
    inventory: "مخزون",
    manager: "مشرف",
  };
  return labels[role] || role;
}

function formatUserCreationError(message: string) {
  if (message === "email_address_invalid" || message === "email_address_invalid_format") {
    return isArabic
      ? "صيغة الإيميل غير مقبولة. جرّب بريداً آخر مثل cashier@focus-pharmacy.eg"
      : "Invalid email format. Try another address like cashier@focus-pharmacy.eg";
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
  if (!appUser?.pharmacyId) return;

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
      pharmacyId: appUser.pharmacyId,
    });

    await addActivityLog({
      type: "user_update",
      title: isArabic ? "إضافة مستخدم" : "User Added",
      description: isArabic ? `تم إضافة المستخدم ${name}` : `User ${name} was added`,
      referenceType: "user",
      referenceId: newUid,
    });

    setNewUserForm({ name: "", email: "", password: "", role: "cashier" });
    setUserModal(null);
    setSystemUsers(await pharmacyService.getSystemUsers(appUser.pharmacyId));
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
  setNewUserForm({ name: "", email: "", password: "", role: "cashier" });
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
  if (appUser?.role !== "admin") {
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
      await pharmacyService.createPharmacy({
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
  if (appUser?.role !== "admin") {
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

async function savePurchase() {
   if (!canUseSystemActions()) {
    showSubscriptionExpiredAlert();
    return;
  }
  if (!canUsePurchases()) {
    alert(isArabic ? "ليس لديك صلاحية للمشتريات" : "You do not have permission for purchases");
    return;
  }

  if (
    !purchaseForm.barcode ||
    !purchaseForm.name_ar ||
    !purchaseForm.name_en ||
    !purchaseForm.expiry ||
    purchaseForm.qty <= 0 ||
    purchaseForm.buyPrice < 0 ||
    purchaseForm.price <= 0
  ) {
    alert(isArabic ? "من فضلك أكمل بيانات التوريد" : "Please complete purchase data");
    return;
  }

  try {
    const existingMedicine = medicines.find(
      (medicine) => medicine.barcode === purchaseForm.barcode
    );

    const medicineId = existingMedicine?.id || Date.now();
    const oldQty = existingMedicine?.qty || 0;
    const newQty = oldQty + Number(purchaseForm.qty);
    const purchaseId = Date.now();
    const purchaseNumber = `PUR-${purchaseId}`;
    const purchaseQty = Number(purchaseForm.qty);
    const purchaseBuyPrice = Number(purchaseForm.buyPrice);
    const purchaseSellPrice = Number(purchaseForm.price);

    const medicine: Medicine = {
      id: medicineId,
      name_ar: purchaseForm.name_ar,
      name_en: purchaseForm.name_en,
      barcode: purchaseForm.barcode,
      qty: newQty,
      buyPrice: Number(purchaseForm.buyPrice),
      price: Number(purchaseForm.price),
      expiry: purchaseForm.expiry,
    };

    const purchaseRecord: PurchaseRecord = {
      id: purchaseId,
      purchaseNumber,
      medicineId,
      medicineName_ar: medicine.name_ar,
      medicineName_en: medicine.name_en,
      barcode: medicine.barcode,
      quantity: purchaseQty,
      buyPrice: purchaseBuyPrice,
      sellPrice: purchaseSellPrice,
      totalCost: purchaseQty * purchaseBuyPrice,
      supplierName: purchaseForm.supplierName,
      notes: purchaseForm.notes,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      date: new Date().toLocaleString(),
      createdAt: new Date().toISOString(),
    };

    if (existingMedicine) {
      await pharmacyService.updateMedicine(medicineId, medicine);
    } else {
      await pharmacyService.addMedicine(medicine);
    }

    await pharmacyService.createPurchase(purchaseRecord);
    await pharmacyService.addStockMovement({
      type: "purchase",
      purchaseNumber,
      medicineId,
      medicineName_ar: medicine.name_ar,
      medicineName_en: medicine.name_en,
      barcode: medicine.barcode,
      quantityChange: Number(purchaseForm.qty),
      qtyBefore: oldQty,
      qtyAfter: newQty,
      supplierName: purchaseForm.supplierName,
      notes: purchaseForm.notes,
      pharmacyId: getPharmacyId(),
      userId: user?.uid || "",
      userName: appUser?.name || "",
      createdAt: new Date().toISOString(),
    });
    await addActivityLog({
  type: "purchase",
  title: isArabic ? "تسجيل توريد" : "Purchase Created",
  description: isArabic
    ? `تم تسجيل توريد رقم ${purchaseNumber} للصنف ${medicine.name_ar} بكمية ${purchaseQty}`
    : `Purchase ${purchaseNumber} created for ${medicine.name_en} with quantity ${purchaseQty}`,
  referenceType: "purchase",
  referenceId: purchaseNumber,
});
    alert(isArabic ? "تم تسجيل التوريد بنجاح" : "Purchase saved successfully");

    setPurchaseForm({
      barcode: "",
      name_ar: "",
      name_en: "",
      qty: 0,
      buyPrice: 0,
      price: 0,
      expiry: "",
      supplierName: "",
      notes: "",
    });
  } catch (error) {
    console.error("Purchase error:", error);
    alert(isArabic ? "حدث خطأ أثناء تسجيل التوريد" : "An error occurred while saving purchase");
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
                    className={medicine.qty <= 20 ? "badge danger" : "badge ok"}
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

const filteredPurchases = purchases.filter((purchase: any) => {
  const searchValue = purchaseSearch.trim().toLowerCase();

  const matchesSearch =
    !searchValue ||
    String(purchase.purchaseNumber || "").toLowerCase().includes(searchValue) ||
    String(purchase.medicineName_ar || "").toLowerCase().includes(searchValue) ||
    String(purchase.medicineName_en || "").toLowerCase().includes(searchValue) ||
    String(purchase.barcode || "").toLowerCase().includes(searchValue) ||
    String(purchase.supplierName || "").toLowerCase().includes(searchValue) ||
    String(purchase.userName || "").toLowerCase().includes(searchValue);

  const purchaseDate = new Date(purchase.createdAt || purchase.date);
  const fromDate = purchaseFromDate
    ? new Date(`${purchaseFromDate}T00:00:00`)
    : null;
  const toDate = purchaseToDate
    ? new Date(`${purchaseToDate}T23:59:59`)
    : null;

  const matchesFrom = !fromDate || purchaseDate >= fromDate;
  const matchesTo = !toDate || purchaseDate <= toDate;

  return matchesSearch && matchesFrom && matchesTo;
});

function exportPurchasesCSV() {
  const rows = [
    [
      isArabic ? "رقم التوريد" : "Purchase No.",
      isArabic ? "اسم الدواء عربي" : "Arabic Medicine Name",
      isArabic ? "اسم الدواء إنجليزي" : "English Medicine Name",
      isArabic ? "الباركود" : "Barcode",
      isArabic ? "الكمية" : "Qty",
      isArabic ? "سعر الشراء" : "Buy Price",
      isArabic ? "سعر البيع" : "Sell Price",
      isArabic ? "إجمالي التكلفة" : "Total Cost",
      isArabic ? "المورد" : "Supplier",
      isArabic ? "ملاحظات" : "Notes",
      isArabic ? "المستخدم" : "User",
      isArabic ? "التاريخ" : "Date",
    ],
    ...filteredPurchases.map((purchase: any) => [
      purchase.purchaseNumber || `#${purchase.id}`,
      purchase.medicineName_ar || "-",
      purchase.medicineName_en || "-",
      barcodeCSV(purchase.barcode),
      safeNumber(purchase.quantity),
      safeNumber(purchase.buyPrice).toFixed(2),
      safeNumber(purchase.sellPrice).toFixed(2),
      safeNumber(purchase.totalCost).toFixed(2),
      purchase.supplierName || "-",
      purchase.notes || "-",
      purchase.userName || "-",
      purchase.date || "-",
    ]),
  ];

  downloadCSV(`purchases-${formatDateInput(new Date())}.csv`, rows);
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

function renderPurchasesPage() {
  return (
    <section className="card purchasesPage">
      <div className="cardHeader">
        <h2>{isArabic ? "المشتريات / توريد المخزون" : "Purchases / Stock Supply"}</h2>
      </div>

      <div className="medicineForm">
        <h3>{isArabic ? "تسجيل توريد صنف" : "Add Purchase Item"}</h3>

        <div className="formGrid">
          <input
            value={purchaseForm.barcode}
            onChange={(e) => {
              const barcode = e.target.value;
              const found = medicines.find((medicine) => medicine.barcode === barcode);

              setPurchaseForm({
                ...purchaseForm,
                barcode,
                name_ar: found?.name_ar || purchaseForm.name_ar,
                name_en: found?.name_en || purchaseForm.name_en,
                buyPrice: found?.buyPrice || purchaseForm.buyPrice,
                price: found?.price || purchaseForm.price,
                expiry: found?.expiry || purchaseForm.expiry,
              });
            }}
            placeholder={t.barcode}
          />

          <input
            value={purchaseForm.name_ar}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, name_ar: e.target.value })}
            placeholder={isArabic ? "اسم الدواء بالعربي" : "Arabic medicine name"}
          />

          <input
            value={purchaseForm.name_en}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, name_en: e.target.value })}
            placeholder={isArabic ? "اسم الدواء بالإنجليزي" : "English medicine name"}
          />

          <input
            type="number"
            value={purchaseForm.qty || ""}
            onChange={(e) =>
              setPurchaseForm({
                ...purchaseForm,
                qty: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            placeholder={isArabic ? "كمية التوريد" : "Purchase quantity"}
          />

          <input
            type="number"
            value={purchaseForm.buyPrice || ""}
            onChange={(e) =>
              setPurchaseForm({
                ...purchaseForm,
                buyPrice: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            placeholder={isArabic ? "سعر الشراء" : "Buy price"}
          />

          <input
            type="number"
            value={purchaseForm.price || ""}
            onChange={(e) =>
              setPurchaseForm({
                ...purchaseForm,
                price: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            placeholder={isArabic ? "سعر البيع" : "Sell price"}
          />

          <input
            type="date"
            value={purchaseForm.expiry}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, expiry: e.target.value })}
          />

          <input
            value={purchaseForm.supplierName}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
            placeholder={isArabic ? "اسم المورد" : "Supplier name"}
          />

          <input
            value={purchaseForm.notes}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
            placeholder={isArabic ? "ملاحظات" : "Notes"}
          />
        </div>

        <div className="medicineFormActions">
          <button
            className="addMedicineBtn"
            onClick={savePurchase}
            disabled={isSubscriptionExpired}
          >
            {isArabic ? "حفظ التوريد" : "Save Purchase"}
          </button>
        </div>
      </div>

      <div className="cardHeader" style={{ marginTop: 22 }}>
        <h2>{isArabic ? "المخزون الحالي" : "Current Inventory"}</h2>

        <button className="printBtn" onClick={exportInventoryCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      {renderInventoryTable(false)}
<div className="cardHeader" style={{ marginTop: 22 }}>
  <h2>{isArabic ? "سجل المشتريات" : "Purchases History"}</h2>

  <button className="printBtn" onClick={exportPurchasesCSV}>
    <span aria-hidden="true">⬇️</span>
    <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
  </button>
</div>

<div className="filtersBar">
  <input
    value={purchaseSearch}
    onChange={(e) => setPurchaseSearch(e.target.value)}
    placeholder={
      isArabic
        ? "بحث بالدواء أو الباركود أو المورد أو رقم التوريد"
        : "Search medicine, barcode, supplier, or purchase no."
    }
  />

  <input
    type="date"
    value={purchaseFromDate}
    onChange={(e) => setPurchaseFromDate(e.target.value)}
  />

  <input
    type="date"
    value={purchaseToDate}
    onChange={(e) => setPurchaseToDate(e.target.value)}
  />

  <button
    className="clearCartBtn"
    onClick={() => {
      setPurchaseSearch("");
      setPurchaseFromDate("");
      setPurchaseToDate("");
    }}
  >
    {isArabic ? "مسح الفلاتر" : "Clear filters"}
  </button>
</div>

{filteredPurchases.length === 0 ? (
  <p className="empty">
    {isArabic ? "لا توجد مشتريات حتى الآن" : "No purchases yet"}
  </p>
) : (
  <div className="tableWrap">
    <table>
      <thead>
        <tr>
          <th>{isArabic ? "رقم التوريد" : "Purchase No."}</th>
          <th>{t.medicine}</th>
          <th>{t.barcode}</th>
          <th>{t.qty}</th>
          <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
          <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
          <th>{isArabic ? "الإجمالي" : "Total Cost"}</th>
          <th>{isArabic ? "المورد" : "Supplier"}</th>
          <th>{isArabic ? "المستخدم" : "User"}</th>
          <th>{t.date}</th>
        </tr>
      </thead>

      <tbody>
        {filteredPurchases.map((purchase) => (
          <tr key={purchase.id}>
            <td>{purchase.purchaseNumber}</td>
            <td>
              {isArabic
                ? purchase.medicineName_ar
                : purchase.medicineName_en}
            </td>
            <td>{purchase.barcode}</td>
            <td>{purchase.quantity}</td>
            <td>
              {safeNumber(purchase.buyPrice).toFixed(2)} {t.currency}
            </td>
            <td>
              {safeNumber(purchase.sellPrice).toFixed(2)} {t.currency}
            </td>
            <td>
              {safeNumber(purchase.totalCost).toFixed(2)} {t.currency}
            </td>
            <td>{purchase.supplierName || "-"}</td>
            <td>{purchase.userName || "-"}</td>
            <td>{purchase.date || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
    </section>
  );
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
    initialQuantities[item.medicineId] = 0;
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

function goToCustomerPaymentForm() {
  setActivePage("customers");
  setCustomerDebtFilter("debt");

  setTimeout(() => {
    customerPaymentFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
}

function startCustomerPayment(customer: CustomerDebt) {
  setPaymentCustomerName(customer.customerName);
  setPaymentAmount(safeNumber(customer.remainingDebt));

  setTimeout(() => {
    customerPaymentFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 100);
}

async function deleteCustomerPayment(payment: CustomerPayment) {
  if (!hasRole(["admin"])) {
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
      <div className="cardHeader">
        <h2>{isArabic ? "العملاء والمديونيات" : "Customers & Debts"}</h2>

        <button className="printBtn" onClick={exportCustomersCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
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

      <div className="medicineForm" ref={customerPaymentFormRef}>
  <h3>{isArabic ? "تسجيل تحصيل من عميل" : "Collect Customer Payment"}</h3>
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

  <div className="medicineFormActions">
    <button
  className="addMedicineBtn"
  onClick={saveCustomerPayment}
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
  </div>
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

              {hasRole(["admin"]) && (
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
    </section>
  );
}
  
  function renderReturnsTable() {
  return (
    <section className="card returnsPage">
      <div className="cardHeader">
        <h2>{isArabic ? "المرتجعات" : "Returns"}</h2>
      </div>

      {returns.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد مرتجعات حتى الآن" : "No returns yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "رقم المرتجع" : "Return No."}</th>
                <th>{t.invoiceNo}</th>
                <th>{t.date}</th>
                <th>{t.items}</th>
                <th>{t.total}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
              </tr>
            </thead>

            <tbody>
              {returns.map((returnRecord) => (
                <tr key={returnRecord.id}>
                  <td>{returnRecord.returnNumber}</td>
                  <td>{returnRecord.invoiceNumber}</td>
                  <td>{returnRecord.date}</td>
                  <td>{returnRecord.items?.length || 0}</td>
                  <td>
                    {(returnRecord.total || 0).toFixed(2)} {t.currency}
                  </td>
                  <td>{returnRecord.userName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cardHeader" style={{ marginTop: 22 }}>
        <h2>{isArabic ? "اختيار فاتورة لعمل مرتجع" : "Choose Invoice for Return"}</h2>
      </div>

      {renderInvoicesTable()}
    </section>
  );
}
  function renderUserModal() {
    const roleOptions: AppUser["role"][] = ["admin", "cashier", "inventory", "manager"];
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
    const roleOptions: AppUser["role"][] = ["admin", "cashier", "inventory", "manager"];

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
async function handleLogin(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  try {
    setLoginError("");
    const { error } = await pharmacyService.signInWithPassword(loginEmail, loginPassword);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(error);
    setLoginError(
      isArabic ? "بيانات الدخول غير صحيحة" : "Invalid login credentials"
    );
  }
}

async function handleLogout() {
  await pharmacyService.signOutUser();
}
if (authLoading || userLoading) {
  return (
    <LoginPage
      status="loading"
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      loginError={loginError}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onSubmit={handleLogin}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
    />
  );
}

if (!user) {
  return (
    <LoginPage
      status="login"
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      loginError={loginError}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onSubmit={handleLogin}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
    />
  );
}
const allowedPagesByRole: Record<AppUser["role"], Page[]> = {
  admin: [
    "dashboard",
    "inventory",
    "pos",
    "invoices",
    "returns",
    "purchases",
    "customers",
    "reports",
    "stockMovements",
    "activityLogs",
    "users",
    "branches",
    "settings",
  ],
  cashier: ["pos", "invoices", "returns", "customers"],
  inventory: ["inventory", "purchases", "stockMovements"],
  manager: [
    "dashboard",
    "invoices",
    "returns",
    "customers",
    "reports",
    "stockMovements",
    "activityLogs",
  ],
};
const allowedPages = appUser ? allowedPagesByRole[appUser.role] || [] : [];

if (!appUser) {
  return (
    <LoginPage
      status="denied"
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      loginError={loginError}
      isArabic={isArabic}
      t={t}
      onEmailChange={setLoginEmail}
      onPasswordChange={setLoginPassword}
      onSubmit={handleLogin}
      onToggleLang={() => setLang(lang === "ar" ? "en" : "ar")}
      onLogout={handleLogout}
    />
  );
}

if (!allowedPages.includes(activePage)) {
  setTimeout(() => {
    setActivePage(allowedPages[0] || "dashboard");
  }, 0);
}
  return (
    <div className="app" dir={isArabic ? "rtl" : "ltr"}>
      <Sidebar
        appUser={appUser}
        activePage={activePage}
        setActivePage={setActivePage}
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
        isOpen={isMenuOpen}
        onCloseMenu={() => setIsMenuOpen(false)}
        onSelectPage={(page) => {
          setActivePage(page);
          setIsMenuOpen(false);
        }}
      />

      <main className="content">
        <Topbar
          title={
            isArabic
              ? pharmacySettings?.name || "صيدلية Focus"
              : pharmacySettings?.name_en || pharmacySettings?.name || "Focus Pharmacy"
          }
          pharmacyPhone={pharmacySettings?.phone || ""}
          pharmacyAddress={pharmacySettings?.address || ""}
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

        {activePage === "dashboard" && (
          <DashboardPage
            isArabic={isArabic}
            t={t}
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
            hasAdminRole={hasRole(["admin"])}
            onRenewSubscription={renewSubscription}
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
              setIsMenuOpen(false);
            }}
          />
        )}

        {activePage === "inventory" && (
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
            canUsePOS={canUsePOS()}
            canManageInventory={canManageInventory()}
            canDeleteMedicine={canDeleteMedicine()}
            onAddToCart={addToCart}
            onEditMedicine={startEditMedicine}
            onDeleteMedicine={deleteMedicine}
          />
        )}

        {activePage === "purchases" && canOpenPage("purchases") && renderPurchasesPage()}

        {activePage === "pos" && (
          <PosPage
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
          />
        )}

        {activePage === "invoices" && (
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
        {activePage === "returns" && canOpenPage("returns") && renderReturnsTable()}
        {activePage === "customers" &&
          canOpenPage("customers") &&
          renderCustomersPage()}

        {activePage === "stockMovements" &&
          canOpenPage("stockMovements") &&
          renderStockMovementsTable()}
          
          {activePage === "activityLogs" &&
          canOpenPage("activityLogs") &&
          renderActivityLogsPage()}

        {activePage === "reports" && canOpenPage("reports") && (
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
            topSellingMedicines={topSellingMedicines}
            reportPaymentTotals={reportPaymentTotals}
            reportPaymentBreakdown={reportPaymentBreakdown}
            reportSalesTrend={reportSalesTrend}
            reportCashierTotals={reportCashierTotals}
            getPaymentLabel={getPaymentLabel}
            currency={t.currency}
            invoiceTable={
              <InvoiceTable
                filteredInvoices={filteredInvoicesList}
                t={t}
                isArabic={isArabic}
                invoiceSearch={invoiceSearch}
                invoicePaymentFilter={invoicePaymentFilter}
                invoiceFromDate={invoiceFromDate}
                invoiceToDate={invoiceToDate}
                setInvoiceSearch={setInvoiceSearch}
                setInvoicePaymentFilter={setInvoicePaymentFilter}
                setInvoiceFromDate={setInvoiceFromDate}
                setInvoiceToDate={setInvoiceToDate}
                onViewInvoice={setSelectedInvoice}
                onReturnInvoice={openReturnModal}
                onPrintInvoice={printSavedInvoice}
                canUseReturns={canUseReturns()}
                exportInvoicesCSV={exportInvoicesCSV}
                getPaymentLabel={getPaymentLabel}
              />
            }
          />
        )}
        {activePage === "users" && canOpenPage("users") && renderUsersPage()}
        {activePage === "branches" && canOpenPage("branches") && renderBranchesPage()}
        {activePage === "settings" && canOpenPage("settings") && (
          <SettingsPage
            isArabic={isArabic}
            t={t}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            isSubscriptionExpired={isSubscriptionExpired}
            isSubscriptionExpiringSoon={isSubscriptionExpiringSoon}
            getSubscriptionPlanLabel={getSubscriptionPlanLabel}
            renewSubscription={renewSubscription}
            hasRole={hasRole}
            subscriptionRenewLogs={subscriptionRenewLogs}
            handleLogoUpload={handleLogoUpload}
            savePharmacySettings={savePharmacySettings}
            exportBackupCSV={exportBackupCSV}
          />
        )}
      </main>

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
                            <span className={qty <= 0 ? "badge danger" : qty <= 20 ? "badge warn" : "badge ok"}>
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

      {selectedInvoice && (
  <div className="modalOverlay">
    <div className="invoiceModal">
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
  <div className="modalOverlay">
    <div className="invoiceModal">
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
        <div className="modalOverlay">
          <div className="invoiceModal">
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
                    <th>{t.qty}</th>
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
  <div>{item.quantity}</div>
  <small style={{ color: "#667085" }}>
    {isArabic
      ? `تم إرجاع: ${alreadyReturnedQty} / المتاح: ${availableQty}`
      : `Returned: ${alreadyReturnedQty} / Available: ${availableQty}`}
  </small>
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
    </div>
  );
}

export default App;
