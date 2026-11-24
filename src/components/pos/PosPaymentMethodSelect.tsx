import type { PaymentMethod } from "../../types";
import type { PaymentOption } from "./paymentTypes";

type PosPaymentMethodSelectProps = {
  paymentMethod: PaymentMethod;
  isArabic: boolean;
  getPaymentLabel: (method: string) => string;
  disableCredit?: boolean;
  paymentOptions?: PaymentOption[];
  paymentOptionValue?: string;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPaymentOptionChange?: (value: string) => void;
};

export default function PosPaymentMethodSelect({
  paymentMethod,
  isArabic,
  getPaymentLabel,
  disableCredit = false,
  paymentOptions,
  paymentOptionValue,
  onPaymentMethodChange,
  onPaymentOptionChange,
}: PosPaymentMethodSelectProps) {
  const useCustomOptions = Boolean(paymentOptions && paymentOptions.length > 0);

  if (useCustomOptions) {
    return (
      <select
        value={paymentOptionValue || paymentOptions![0]?.value || ""}
        onChange={(e) => onPaymentOptionChange?.(e.target.value)}
        aria-label={isArabic ? "طريقة الدفع" : "Payment method"}
      >
        {paymentOptions!.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select
      value={paymentMethod}
      onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
      aria-label={isArabic ? "طريقة الدفع" : "Payment method"}
    >
      <option value="cash">{getPaymentLabel("cash")}</option>
      <option value="visa">{getPaymentLabel("visa")}</option>
      <option value="wallet">{getPaymentLabel("wallet")}</option>
      <option value="delivery">{getPaymentLabel("delivery")}</option>
      {!disableCredit && <option value="credit">{getPaymentLabel("credit")}</option>}
    </select>
  );
}
