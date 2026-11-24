import type { PaymentMethod } from "../../types";
import PaymentBox from "../PaymentBox";
import type { PaymentOption } from "./paymentTypes";

type PosCartCheckoutProps = {
  cartLength: number;
  subtotal: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone?: string;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  isSelling: boolean;
  isSubscriptionExpired: boolean;
  saleBlocked: boolean;
  subscriptionBlocksSale: boolean;
  shiftSaleBlocked: boolean;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  onCompleteSale: () => void;
  getPaymentLabel: (method: string) => string;
  heldInvoicesCount: number;
  isHolding: boolean;
  onHoldInvoice: () => void;
  onOpenHeldInvoices: () => void;
  onOpenInstantReturn: () => void;
  isOnline: boolean;
  paymentOptions?: PaymentOption[];
  paymentOptionValue?: string;
  onPaymentOptionChange?: (value: string) => void;
};

export default function PosCartCheckout({
  cartLength,
  subtotal,
  total,
  discount,
  paymentMethod,
  customerName,
  customerPhone = "",
  isArabic,
  t,
  currency,
  isSelling,
  isSubscriptionExpired,
  saleBlocked,
  subscriptionBlocksSale,
  shiftSaleBlocked,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCompleteSale,
  getPaymentLabel,
  heldInvoicesCount,
  isHolding,
  onHoldInvoice,
  onOpenHeldInvoices,
  onOpenInstantReturn,
  isOnline,
  paymentOptions,
  paymentOptionValue,
  onPaymentOptionChange,
}: PosCartCheckoutProps) {
  return (
    <div className="posCartCheckout">
      <PaymentBox
        discount={discount}
        paymentMethod={paymentMethod}
        customerName={customerName}
        customerPhone={customerPhone}
        isArabic={isArabic}
        t={t}
        onDiscountChange={onDiscountChange}
        onPaymentMethodChange={onPaymentMethodChange}
        onCustomerNameChange={onCustomerNameChange}
        onCustomerPhoneChange={onCustomerPhoneChange}
        getPaymentLabel={getPaymentLabel}
        disableCredit={!isOnline}
        paymentOptions={paymentOptions}
        paymentOptionValue={paymentOptionValue}
        onPaymentOptionChange={onPaymentOptionChange}
      />
      <div className="subtotalLine posCartSubtotal">
        <span>{t.subtotal}</span>
        <strong>
          {subtotal.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="totalBox posCartTotal">
        <span>{t.total}</span>
        <strong>
          {total.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="posActionRow">
        {cartLength > 0 && (
          <button
            className="posActionBtn holdBtn"
            type="button"
            onClick={onHoldInvoice}
            disabled={isHolding || isSubscriptionExpired || !isOnline}
          >
            {isHolding
              ? isArabic
                ? "جاري التعليق..."
                : "Holding..."
              : isArabic
                ? "تعليق الفاتورة"
                : "Hold Invoice"}
          </button>
        )}
        <button
          className="posActionBtn"
          type="button"
          onClick={onOpenHeldInvoices}
          disabled={!isOnline}
        >
          {isArabic ? "الفواتير المعلقة" : "Held Invoices"}
          {heldInvoicesCount > 0 ? ` (${heldInvoicesCount})` : ""}
        </button>
        <button
          className="posActionBtn"
          type="button"
          onClick={onOpenInstantReturn}
          disabled={!isOnline}
        >
          {isArabic ? "مرتجع سريع" : "Quick Return"}
        </button>
      </div>
      <button
        type="button"
        className="completeBtn posCartCompleteBtn"
        onClick={onCompleteSale}
        disabled={isSelling || saleBlocked || cartLength === 0}
      >
        {subscriptionBlocksSale
          ? isArabic
            ? "الاشتراك منتهي"
            : "Subscription Expired"
          : shiftSaleBlocked
            ? isArabic
              ? "افتح وردية أولاً"
              : "Open shift first"
            : isSelling
              ? isArabic
                ? "جاري تسجيل البيع..."
                : "Completing sale..."
              : t.completeSale}
      </button>
    </div>
  );
}
