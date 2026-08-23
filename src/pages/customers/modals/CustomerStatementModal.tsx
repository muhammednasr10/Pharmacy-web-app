import { safeNumber } from "../helpers";
import type { CustomersPageState } from "../useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomerStatementModal({ state }: Props) {
  const {
    isArabic,
    t,
    selectedCustomer,
    setSelectedCustomer,
    getCustomerPayments,
    getPaymentLabel,
    exportCtx,
    onViewInvoice,
  } = state;

  if (!selectedCustomer) return null;

  return (
    <div className="modalOverlay">
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
                    <button className="smallBtn" onClick={() => onViewInvoice(invoice)}>
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
            onClick={() =>
              void import("../../../utils/customerExports").then((m) =>
                m.printCustomerStatement(
                  selectedCustomer,
                  getCustomerPayments(selectedCustomer.customerName),
                  exportCtx,
                ),
              )
            }
          >
            <span aria-hidden="true">🖨️</span>
            <span>{isArabic ? "طباعة كشف الحساب" : "Print Statement"}</span>
          </button>
          <button
            className="printBtn"
            onClick={() =>
              void import("../../../utils/customerExports").then((m) =>
                m.exportCustomerStatementCSV(
                  selectedCustomer,
                  getCustomerPayments(selectedCustomer.customerName),
                  exportCtx,
                ),
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
  );
}
