import { useEffect, useState } from "react";
import type { PaymentMethod } from "../types";

export type PaymentOption = {
  value: string;
  label: string;
};

type PaymentBoxProps = {
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone?: string;
  isArabic: boolean;
  t: Record<string, string>;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  getPaymentLabel: (method: string) => string;
  disableCredit?: boolean;
  /** When set, dropdown shows these options (e.g. investment wallets) instead of classic methods. */
  paymentOptions?: PaymentOption[];
  paymentOptionValue?: string;
  onPaymentOptionChange?: (value: string) => void;
};

export default function PaymentBox({
  discount,
  paymentMethod,
  customerName,
  customerPhone = "",
  isArabic,
  t,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  getPaymentLabel,
  disableCredit = false,
  paymentOptions,
  paymentOptionValue,
  onPaymentOptionChange,
}: PaymentBoxProps) {
  const useCustomOptions = Boolean(paymentOptions && paymentOptions.length > 0);
  const needsCustomer =
    (!useCustomOptions && (paymentMethod === "credit" || paymentMethod === "delivery")) ||
    (useCustomOptions && paymentMethod === "delivery");
  const hasCustomerData = Boolean(customerName.trim() || customerPhone.trim());
  const [customerPanelOpen, setCustomerPanelOpen] = useState(needsCustomer || hasCustomerData);

  useEffect(() => {
    if (needsCustomer || hasCustomerData) {
      setCustomerPanelOpen(true);
    }
  }, [needsCustomer, hasCustomerData]);

  return (
    <div className="paymentBox">
      <label>{t.discount}</label>
      <input
        type="number"
        min="0"
        value={discount}
        onChange={(e) => onDiscountChange(Number(e.target.value))}
        placeholder={isArabic ? "قيمة الخصم" : "Discount amount"}
      />
      <label>{t.paymentMethod}</label>
      <div className="paymentMethodRow">
        {useCustomOptions ? (
          <select
            value={paymentOptionValue || paymentOptions![0]?.value || ""}
            onChange={(e) => onPaymentOptionChange?.(e.target.value)}
          >
            {paymentOptions!.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
          >
            <option value="cash">{getPaymentLabel("cash")}</option>
            <option value="visa">{getPaymentLabel("visa")}</option>
            <option value="wallet">{getPaymentLabel("wallet")}</option>
            <option value="delivery">{getPaymentLabel("delivery")}</option>
            {!disableCredit && <option value="credit">{getPaymentLabel("credit")}</option>}
          </select>
        )}
        <button
          type="button"
          className={`posCustomerDataBtn${hasCustomerData ? " has-data" : ""}${customerPanelOpen ? " is-open" : ""}`}
          aria-label={isArabic ? "بيانات العميل" : "Customer details"}
          title={isArabic ? "بيانات العميل على الفاتورة" : "Invoice customer details"}
          aria-expanded={customerPanelOpen}
          onClick={() => setCustomerPanelOpen((open) => !open)}
        >
          <span aria-hidden="true">👤</span>
          {hasCustomerData ? <span className="posCustomerDataDot" aria-hidden="true" /> : null}
        </button>
      </div>
      {!useCustomOptions && disableCredit && (
        <p className="mutedText paymentOfflineHint">
          {isArabic ? "البيع الآجل غير متاح بدون اتصال" : "Credit sales are unavailable offline"}
        </p>
      )}
      {customerPanelOpen ? (
        <div className="posCustomerDataPanel">
          <label>{isArabic ? "اسم العميل" : "Customer name"}</label>
          <input
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder={
              needsCustomer
                ? isArabic
                  ? "مطلوب للدليفري / الآجل"
                  : "Required for delivery / credit"
                : isArabic
                  ? "اختياري — يظهر على الفاتورة"
                  : "Optional — shown on invoice"
            }
          />
          <label>{isArabic ? "رقم الموبايل" : "Phone"}</label>
          <input
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange?.(e.target.value)}
            placeholder={isArabic ? "اختياري" : "Optional"}
          />
        </div>
      ) : null}
    </div>
  );
}
