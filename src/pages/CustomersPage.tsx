import { useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type {
  AppUser,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  PaymentMethod,
  PharmacySettings,
} from "../types";
import {
  exportCustomerStatementCSV,
  exportCustomersDebtsCSV,
  printCustomerPaymentReceipt,
  printCustomerStatement,
  type CustomerExportContext,
} from "../utils/customerExports";

type CustomersPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
  appUser: AppUser | null;
  user: { uid: string } | null;
  isSubscriptionExpired: boolean;
  canCollectPayments: boolean;
  canDeletePayments: boolean;
  getPaymentLabel: (method: string) => string;
  getPharmacyId: () => string;
  pharmacySettings: PharmacySettings | null;
  onActivityLog: (entry: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  onViewInvoice: (invoice: Invoice) => void;
  openPaymentModalRequest?: number;
  onOpenPaymentModalRequestConsumed?: () => void;
};

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CustomersPage({
  isArabic,
  t,
  customerDebts,
  customerPayments,
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
}: CustomersPageProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDebtFilter, setCustomerDebtFilter] = useState<"all" | "debt" | "paid">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentCustomerName, setPaymentCustomerName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState<PaymentMethod>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);

  const exportCtx: CustomerExportContext = useMemo(
    () => ({
      isArabic,
      currency: t.currency,
      pharmacySettings,
      getPaymentLabel,
    }),
    [isArabic, t.currency, pharmacySettings, getPaymentLabel]
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
        String(payment.userName || "").toLowerCase().includes(searchValue)
    );
  }, [customerPayments, paymentSearch]);

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
    setCustomerDebtFilter("debt");
    openCustomerPaymentModal();
    onOpenPaymentModalRequestConsumed?.();
  }, [openPaymentModalRequest]);

  async function saveCustomerPayment() {
    if (isSubscriptionExpired) {
      alert(
        isArabic
          ? "انتهى الاشتراك — جدّد الاشتراك لاستخدام النظام"
          : "Subscription expired — renew to use the system"
      );
      return;
    }

    if (!canCollectPayments) {
      alert(
        isArabic
          ? "ليس لديك صلاحية لتسجيل التحصيل"
          : "You do not have permission to collect payments"
      );
      return;
    }

    if (!paymentCustomerName.trim() || paymentAmount <= 0) {
      alert(
        isArabic
          ? "اختر العميل وأدخل مبلغ التحصيل"
          : "Choose customer and enter payment amount"
      );
      return;
    }

    const customer = customerDebts.find(
      (item) => item.customerName === paymentCustomerName.trim()
    );

    if (!customer) {
      alert(
        isArabic
          ? "هذا العميل غير موجود في المديونيات"
          : "Customer not found in debts"
      );
      return;
    }

    const remainingDebt = safeNumber(customer.remainingDebt);
    if (remainingDebt <= 0) {
      alert(
        isArabic
          ? "هذا العميل لا يوجد عليه مديونية"
          : "This customer has no remaining debt"
      );
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
      await onActivityLog({
        type: "customer_payment",
        title: isArabic ? "تحصيل من عميل" : "Customer Payment",
        description: isArabic
          ? `تم تحصيل ${paymentAmount.toFixed(2)} ${t.currency} من العميل ${paymentCustomerName.trim()}`
          : `Collected ${paymentAmount.toFixed(2)} ${t.currency} from ${paymentCustomerName.trim()}`,
        referenceType: "customerPayment",
        referenceId: paymentNumber,
      });
      printCustomerPaymentReceipt(paymentRecord, exportCtx);
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

  async function deleteCustomerPayment(payment: CustomerPayment) {
    if (!canDeletePayments) {
      alert(
        isArabic
          ? "حذف التحصيل متاح للمدير العام فقط"
          : "Only the general manager can delete payments"
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
            : "An error occurred while deleting payment"
      );
    }
  }

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
          {canCollectPayments && (
            <button
              type="button"
              className="printFullBtn"
              onClick={() => openCustomerPaymentModal()}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل تحصيل من عميل" : "Collect Payment"}
            </button>
          )}
          <button
            className="printBtn"
            onClick={() => exportCustomersDebtsCSV(filteredCustomerDebts, exportCtx)}
          >
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
                  <td>
                    {safeNumber(customer.totalDebt).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    {safeNumber(customer.paidAmount).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    <span
                      className={
                        safeNumber(customer.remainingDebt) > 0
                          ? "badge danger"
                          : "badge ok"
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
                          onClick={() => openCustomerPaymentModal(customer)}
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
        <button className="clearCartBtn" onClick={() => setPaymentSearch("")}>
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
                        onClick={() => printCustomerPaymentReceipt(payment, exportCtx)}
                      >
                        <span aria-hidden="true">🖨️</span>
                        <span>{t.print}</span>
                      </button>
                      {canDeletePayments && (
                        <button
                          className="deleteSmallBtn"
                          onClick={() => void deleteCustomerPayment(payment)}
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
      )}

      {showCustomerPaymentModal && (
        <div
          className="modalOverlay"
          onClick={() => setShowCustomerPaymentModal(false)}
        >
          <div
            className="invoiceModal purchaseModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "تسجيل تحصيل من عميل" : "Collect Customer Payment"}
                </h2>
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
                        {customer.customerName} -{" "}
                        {safeNumber(customer.remainingDebt).toFixed(2)} {t.currency}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  value={paymentAmount || ""}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value === "" ? 0 : Number(e.target.value)
                    )
                  }
                  placeholder={isArabic ? "مبلغ التحصيل" : "Payment amount"}
                />
                <select
                  value={paymentMethodForDebt}
                  onChange={(e) =>
                    setPaymentMethodForDebt(e.target.value as PaymentMethod)
                  }
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
                          onClick={() => onViewInvoice(invoice)}
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
                {isArabic
                  ? "لا توجد تحصيلات لهذا العميل"
                  : "No payments for this customer"}
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
                onClick={() =>
                  printCustomerStatement(
                    selectedCustomer,
                    getCustomerPayments(selectedCustomer.customerName),
                    exportCtx
                  )
                }
              >
                <span aria-hidden="true">🖨️</span>
                <span>{isArabic ? "طباعة كشف الحساب" : "Print Statement"}</span>
              </button>
              <button
                className="printBtn"
                onClick={() =>
                  exportCustomerStatementCSV(
                    selectedCustomer,
                    getCustomerPayments(selectedCustomer.customerName),
                    exportCtx
                  )
                }
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
    </section>
  );
}
