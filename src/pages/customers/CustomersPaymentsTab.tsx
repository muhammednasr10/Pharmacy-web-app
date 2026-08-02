import { printCustomerPaymentReceipt } from "../../utils/customerExports";
import { safeNumber } from "./helpers";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersPaymentsTab({ state }: Props) {
  const {
    isArabic,
    t,
    activeTab,
    filteredCustomerPayments,
    paymentSearch,
    setPaymentSearch,
    getPaymentLabel,
    exportCtx,
    canDeletePayments,
    deleteCustomerPayment,
  } = state;

  if (activeTab !== "payments") return null;

  return (
    <>
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
        <p className="empty">{isArabic ? "لا توجد تحصيلات حتى الآن" : "No payments yet"}</p>
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
    </>
  );
}
