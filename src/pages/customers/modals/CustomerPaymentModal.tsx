import type { PaymentMethod } from "../../../types";
import { safeNumber } from "../helpers";
import type { CustomersPageState } from "../useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomerPaymentModal({ state }: Props) {
  const {
    isArabic,
    t,
    customerDebts,
    showCustomerPaymentModal,
    setShowCustomerPaymentModal,
    paymentCustomerName,
    setPaymentCustomerName,
    paymentAmount,
    setPaymentAmount,
    paymentMethodForDebt,
    setPaymentMethodForDebt,
    paymentNotes,
    setPaymentNotes,
    getPaymentLabel,
    isSubscriptionExpired,
    saveCustomerPayment,
  } = state;

  if (!showCustomerPaymentModal) return null;

  return (
    <div className="modalOverlay">
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
              <option value="">{isArabic ? "اختر العميل" : "Choose customer"}</option>
              {customerDebts
                .filter((customer) => safeNumber(customer.remainingDebt) > 0)
                .map((customer) => (
                  <option key={customer.customerName} value={customer.customerName}>
                    {customer.customerName} - {safeNumber(customer.remainingDebt).toFixed(2)}{" "}
                    {t.currency}
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
  );
}
