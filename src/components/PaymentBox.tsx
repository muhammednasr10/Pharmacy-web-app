import type { PaymentMethod } from "../types";

export type PaymentOption = {
  value: string;
  label: string;
};

type PaymentBoxProps = {
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  isArabic: boolean;
  t: Record<string, string>;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
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
  isArabic,
  t,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  getPaymentLabel,
  disableCredit = false,
  paymentOptions,
  paymentOptionValue,
  onPaymentOptionChange,
}: PaymentBoxProps) {
  const useCustomOptions = Boolean(paymentOptions && paymentOptions.length > 0);

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
          {!disableCredit && <option value="credit">{getPaymentLabel("credit")}</option>}
        </select>
      )}
      {!useCustomOptions && disableCredit && (
        <p className="mutedText paymentOfflineHint">
          {isArabic ? "البيع الآجل غير متاح بدون اتصال" : "Credit sales are unavailable offline"}
        </p>
      )}
      {!useCustomOptions && paymentMethod === "credit" && (
        <>
          <label>{isArabic ? "اسم العميل" : "Customer Name"}</label>
          <input
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder={isArabic ? "اكتب اسم العميل" : "Enter customer name"}
          />
        </>
      )}
    </div>
  );
}
