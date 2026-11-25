import { useMemo, useState } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import type { CustomerDebt, CustomerPayment, PaymentMethod } from "../../../types";
import type { CustomerExportContext } from "../../../utils/customerExportTypes";
import { safeNumber } from "../helpers";
import { subscriptionBlockedAlert } from "../crmPageErrors";

type Params = {
  isArabic: boolean;
  currency: string;
  isSubscriptionExpired: boolean;
  canCollectPayments: boolean;
  canDeletePayments: boolean;
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
  getPharmacyId: () => string;
  userUid?: string;
  appUserName?: string;
  exportCtx: CustomerExportContext;
  onActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
};

export function useCustomerCreditPaymentsState({
  isArabic,
  currency,
  isSubscriptionExpired,
  canCollectPayments,
  canDeletePayments,
  customerDebts,
  customerPayments,
  getPharmacyId,
  userUid = "",
  appUserName = "",
  exportCtx,
  onActivityLog,
}: Params) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDebtFilter, setCustomerDebtFilter] = useState<"all" | "debt" | "paid">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);

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

  async function saveCustomerPayment() {
    if (isSubscriptionExpired) {
      alert(subscriptionBlockedAlert(isArabic));
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
          ? `مبلغ التحصيل أكبر من الرصيد المتبقي. المتبقي: ${remainingDebt.toFixed(2)} ${currency}`
          : `Payment amount is greater than remaining debt. Remaining: ${remainingDebt.toFixed(2)} ${currency}`,
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
        userId: userUid,
        userName: appUserName,
        date: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
      };

      await pharmacyService.saveCustomerPayment(paymentRecord);
      await onActivityLog({
        type: "customer_payment",
        title: isArabic ? "تحصيل من عميل" : "Customer Payment",
        description: isArabic
          ? `تم تحصيل ${paymentAmount.toFixed(2)} ${currency} من العميل ${paymentCustomerName.trim()}`
          : `Collected ${paymentAmount.toFixed(2)} ${currency} from ${paymentCustomerName.trim()}`,
        referenceType: "customerPayment",
        referenceId: paymentNumber,
      });
      void import("../../../utils/customerExports").then((m) =>
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
    filteredCustomerDebts,
    filteredCustomerPayments,
    totalDebts,
    totalPaid,
    totalRemaining,
    getCustomerPayments,
    openCustomerPaymentModal,
    saveCustomerPayment,
    deleteCustomerPayment,
  };
}
