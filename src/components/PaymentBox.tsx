import { useEffect, useState } from "react";
import type { PaymentMethod } from "../types";
import PosCustomerDataPanel from "./pos/PosCustomerDataPanel";
import PosPaymentMethodSelect from "./pos/PosPaymentMethodSelect";
import type { PaymentOption } from "./pos/paymentTypes";

export type { PaymentOption };

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
        <PosPaymentMethodSelect
          paymentMethod={paymentMethod}
          isArabic={isArabic}
          getPaymentLabel={getPaymentLabel}
          disableCredit={disableCredit}
          paymentOptions={paymentOptions}
          paymentOptionValue={paymentOptionValue}
          onPaymentMethodChange={onPaymentMethodChange}
          onPaymentOptionChange={onPaymentOptionChange}
        />
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
        <PosCustomerDataPanel
          isArabic={isArabic}
          customerName={customerName}
          customerPhone={customerPhone}
          required={needsCustomer}
          onCustomerNameChange={onCustomerNameChange}
          onCustomerPhoneChange={onCustomerPhoneChange}
        />
      ) : null}
    </div>
  );
}
