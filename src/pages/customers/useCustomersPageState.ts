import { useEffect, useMemo, useState } from "react";
import type { CustomerCrmTab } from "../../components/customers/CustomerCrmTabs";
import * as pharmacyService from "../../services/pharmacyService";
import type {
  CrmCustomer,
  CrmCustomerProfile,
  CustomerActivity,
  CustomerDebt,
  CustomerPayment,
  PaymentMethod,
} from "../../types";
import { buildCrmCustomerProfiles } from "../../utils/crmProfiles";
import type { CustomerExportContext } from "../../utils/customerExportTypes";
import { safeNumber } from "./helpers";
import type { CustomersPageProps } from "./types";

export function useCustomersPageState(props: CustomersPageProps) {
  const {
    isArabic,
    t,
    customerDebts,
    customerPayments,
    invoices = [],
    totalCustomerPayments,
    appUser,
    user,
    isSubscriptionExpired,
    canCollectPayments,
    canDeletePayments,
    getPaymentLabel,
    getPharmacyId,
    pharmacySettings,
    onActivityLog,
    onViewInvoice,
    openPaymentModalRequest = 0,
    onOpenPaymentModalRequestConsumed,
    initialCustomerSearch = "",
    onInitialCustomerSearchConsumed,
  } = props;

  const [activeTab, setActiveTab] = useState<CustomerCrmTab>("overview");
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomer[]>([]);
  const [customerActivities, setCustomerActivities] = useState<CustomerActivity[]>([]);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSegmentFilter, setCrmSegmentFilter] = useState("all");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState<"open" | "done" | "all">("open");
  const [selectedProfile, setSelectedProfile] = useState<CrmCustomerProfile | null>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerFormInitial, setCustomerFormInitial] = useState<Partial<CrmCustomer> | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDebtFilter, setCustomerDebtFilter] = useState<"all" | "debt" | "paid">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [customers, activities] = await Promise.all([
          pharmacyService.getCrmCustomers(),
          pharmacyService.getCustomerActivities(),
        ]);
        if (!cancelled) {
          setCrmCustomers(customers);
          setCustomerActivities(activities);
        }
      } catch (error) {
        console.error(error);
      }
    };
    void load();
    const cleanups = [
      pharmacyService.subscribeCrmCustomers(setCrmCustomers),
      pharmacyService.subscribeCustomerActivities(setCustomerActivities),
    ];
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [getPharmacyId]);

  const crmProfiles = useMemo(
    () =>
      buildCrmCustomerProfiles({
        customers: crmCustomers,
        invoices,
        customerDebts,
        customerPayments,
        activities: customerActivities,
      }),
    [crmCustomers, invoices, customerDebts, customerPayments, customerActivities],
  );

  const filteredCrmProfiles = useMemo(() => {
    const searchValue = crmSearch.trim().toLowerCase();
    return crmProfiles.filter((profile) => {
      const matchesSearch =
        !searchValue ||
        profile.name.toLowerCase().includes(searchValue) ||
        (profile.phone || "").includes(searchValue);
      const matchesSegment = crmSegmentFilter === "all" || profile.segment === crmSegmentFilter;
      return matchesSearch && matchesSegment;
    });
  }, [crmProfiles, crmSearch, crmSegmentFilter]);

  const openFollowUpsCount = useMemo(
    () =>
      customerActivities.filter(
        (activity) => activity.activityType === "follow_up" && activity.status === "open",
      ).length,
    [customerActivities],
  );

  const exportCtx: CustomerExportContext = useMemo(
    () => ({
      isArabic,
      currency: t.currency,
      pharmacySettings,
      getPaymentLabel,
    }),
    [isArabic, t.currency, pharmacySettings, getPaymentLabel],
  );

  const filteredCustomerDebts = useMemo(() => {
    const searchValue = customerSearch.trim().toLowerCase();
    return customerDebts.filter((customer) => {
      const matchesSearch =
        !searchValue || customer.customerName.toLowerCase().includes(searchValue);
      const remainingDebt = safeNumber(customer.remainingDebt);
      const matchesDebtFilter =
        customerDebtFilter === "all" ||
        (customerDebtFilter === "debt" && remainingDebt > 0) ||
        (customerDebtFilter === "paid" && remainingDebt <= 0);
      return matchesSearch && matchesDebtFilter;
    });
  }, [customerDebts, customerSearch, customerDebtFilter]);

  const filteredCustomerPayments = useMemo(() => {
    const searchValue = paymentSearch.trim().toLowerCase();
    return customerPayments.filter(
      (payment) =>
        !searchValue ||
        payment.customerName.toLowerCase().includes(searchValue) ||
        (payment.paymentNumber || "").toLowerCase().includes(searchValue) ||
        String(payment.userName || "")
          .toLowerCase()
          .includes(searchValue),
    );
  }, [customerPayments, paymentSearch]);

  const totalDebts = customerDebts.reduce(
    (sum, customer) => sum + safeNumber(customer.totalDebt),
    0,
  );
  const totalPaid = customerDebts.reduce(
    (sum, customer) => sum + safeNumber(customer.paidAmount),
    0,
  );
  const totalRemaining = customerDebts.reduce(
    (sum, customer) => sum + safeNumber(customer.remainingDebt),
    0,
  );

  function getCustomerPayments(customerName: string) {
    return customerPayments.filter((payment) => payment.customerName === customerName);
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

  useEffect(() => {
    if (!openPaymentModalRequest) return;
    setActiveTab("debts");
    setCustomerDebtFilter("debt");
    openCustomerPaymentModal();
    onOpenPaymentModalRequestConsumed?.();
  }, [openPaymentModalRequest]);

  useEffect(() => {
    if (!initialCustomerSearch.trim()) return;
    setActiveTab("customers");
    setCrmSearch(initialCustomerSearch);
    setCustomerSearch(initialCustomerSearch);
    onInitialCustomerSearchConsumed?.();
  }, [initialCustomerSearch, onInitialCustomerSearchConsumed]);

  async function saveCrmCustomer(customer: CrmCustomer) {
    if (isSubscriptionExpired) {
      alert(
        isArabic
          ? "انتهى الاشتراك — جدّد الاشتراك لاستخدام النظام"
          : "Subscription expired — renew to use the system",
      );
      return;
    }
    setSavingCustomer(true);
    try {
      await pharmacyService.saveCrmCustomer({
        ...customer,
        pharmacyId: getPharmacyId(),
      });
      setCustomerFormOpen(false);
      setCustomerFormInitial(null);
      alert(isArabic ? "تم حفظ بيانات العميل" : "Customer saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(
        message === "sql_migration_required"
          ? isArabic
            ? "شغّل supabase/customers-crm.sql في Supabase أولاً"
            : "Run supabase/customers-crm.sql in Supabase first"
          : message || (isArabic ? "تعذر حفظ العميل" : "Could not save customer"),
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function addCustomerActivity(activity: CustomerActivity) {
    try {
      await pharmacyService.saveCustomerActivity({
        ...activity,
        pharmacyId: getPharmacyId(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(
        message === "sql_migration_required"
          ? isArabic
            ? "شغّل supabase/customers-crm.sql في Supabase أولاً"
            : "Run supabase/customers-crm.sql in Supabase first"
          : message || (isArabic ? "تعذر حفظ النشاط" : "Could not save activity"),
      );
      throw error;
    }
  }

  async function updateActivityStatus(id: number, status: CustomerActivity["status"]) {
    try {
      await pharmacyService.updateCustomerActivityStatus(id, status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message || (isArabic ? "تعذر تحديث المتابعة" : "Could not update follow-up"));
    }
  }

  function openProfile(profile: CrmCustomerProfile) {
    setSelectedProfile(profile);
  }

  function openRegisterInferred(profile: CrmCustomerProfile) {
    setCustomerFormInitial({
      id: Date.now(),
      name: profile.name,
      phone: profile.phone,
      segment: profile.segment,
      notes: profile.notes,
    });
    setCustomerFormOpen(true);
  }

  async function saveCustomerPayment() {
    if (isSubscriptionExpired) {
      alert(
        isArabic
          ? "انتهى الاشتراك — جدّد الاشتراك لاستخدام النظام"
          : "Subscription expired — renew to use the system",
      );
      return;
    }

    if (!canCollectPayments) {
      alert(
        isArabic
          ? "ليس لديك صلاحية لتسجيل التحصيل"
          : "You do not have permission to collect payments",
      );
      return;
    }

    if (!paymentCustomerName.trim() || paymentAmount <= 0) {
      alert(
        isArabic ? "اختر العميل وأدخل مبلغ التحصيل" : "Choose customer and enter payment amount",
      );
      return;
    }

    const customer = customerDebts.find((item) => item.customerName === paymentCustomerName.trim());

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
          : `Payment amount is greater than remaining debt. Remaining: ${remainingDebt.toFixed(2)} ${t.currency}`,
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
      await onActivityLog({
        type: "customer_payment",
        title: isArabic ? "تحصيل من عميل" : "Customer Payment",
        description: isArabic
          ? `تم تحصيل ${paymentAmount.toFixed(2)} ${t.currency} من العميل ${paymentCustomerName.trim()}`
          : `Collected ${paymentAmount.toFixed(2)} ${t.currency} from ${paymentCustomerName.trim()}`,
        referenceType: "customerPayment",
        referenceId: paymentNumber,
      });
      void import("../../utils/customerExports").then((m) =>
        m.printCustomerPaymentReceipt(paymentRecord, exportCtx),
      );
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
            : "An error occurred while saving payment",
      );
    }
  }

  async function deleteCustomerPayment(payment: CustomerPayment) {
    if (!canDeletePayments) {
      alert(
        isArabic
          ? "حذف التحصيل متاح للمدير العام فقط"
          : "Only the general manager can delete payments",
      );
      return;
    }

    const paymentNum = payment.paymentNumber || String(payment.id);
    const confirmDelete = window.confirm(
      isArabic
        ? `هل أنت متأكد من حذف التحصيل رقم ${paymentNum}؟`
        : `Are you sure you want to delete payment ${paymentNum}?`,
    );
    if (!confirmDelete) return;

    try {
      await pharmacyService.deleteCustomerPayment(paymentNum);
      await onActivityLog({
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
            : "An error occurred while deleting payment",
      );
    }
  }

  return {
    isArabic,
    t,
    customerDebts,
    customerPayments,
    invoices,
    totalCustomerPayments,
    appUser,
    isSubscriptionExpired,
    canCollectPayments,
    canDeletePayments,
    getPaymentLabel,
    activeTab,
    setActiveTab,
    crmProfiles,
    filteredCrmProfiles,
    customerActivities,
    crmSearch,
    setCrmSearch,
    crmSegmentFilter,
    setCrmSegmentFilter,
    followUpStatusFilter,
    setFollowUpStatusFilter,
    selectedProfile,
    setSelectedProfile,
    customerFormOpen,
    setCustomerFormOpen,
    customerFormInitial,
    setCustomerFormInitial,
    savingCustomer,
    customerSearch,
    setCustomerSearch,
    customerDebtFilter,
    setCustomerDebtFilter,
    paymentSearch,
    setPaymentSearch,
    paymentCustomerName,
    setPaymentCustomerName,
    paymentAmount,
    setPaymentAmount,
    paymentMethodForDebt,
    setPaymentMethodForDebt,
    paymentNotes,
    setPaymentNotes,
    showCustomerPaymentModal,
    setShowCustomerPaymentModal,
    selectedCustomer,
    setSelectedCustomer,
    openFollowUpsCount,
    exportCtx,
    filteredCustomerDebts,
    filteredCustomerPayments,
    totalDebts,
    totalPaid,
    totalRemaining,
    getCustomerPayments,
    openCustomerPaymentModal,
    saveCrmCustomer,
    addCustomerActivity,
    updateActivityStatus,
    openProfile,
    openRegisterInferred,
    saveCustomerPayment,
    deleteCustomerPayment,
    onViewInvoice,
  };
}

export type CustomersPageState = ReturnType<typeof useCustomersPageState>;
