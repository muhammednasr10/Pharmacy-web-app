import type { PaymentMethod } from "../types";

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
}: PaymentBoxProps) {
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
      <select
        value={paymentMethod}
        onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
      >
        <option value="cash">{getPaymentLabel("cash")}</option>
        <option value="visa">{getPaymentLabel("visa")}</option>
        <option value="wallet">{getPaymentLabel("wallet")}</option>
        <option value="credit">{getPaymentLabel("credit")}</option>
      </select>
      {paymentMethod === "credit" && (
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
