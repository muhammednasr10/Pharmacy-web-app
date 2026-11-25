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
  customerAddress?: string;
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
  onCustomerAddressChange?: (value: string) => void;
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
  canAssignDeliveryEmployee?: boolean;
  deliveryEmployeeName?: string;
  onOpenDeliveryEmployeePicker?: () => void;
};

export default function PosCartCheckout({
  cartLength,
  subtotal,
  total,
  discount,
  paymentMethod,
  customerName,
  customerPhone = "",
  customerAddress = "",
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
  onCustomerAddressChange,
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
  canAssignDeliveryEmployee = false,
  deliveryEmployeeName = "",
  onOpenDeliveryEmployeePicker,
}: PosCartCheckoutProps) {
  return (
    <div className="posCartCheckout">
      <PaymentBox
        discount={discount}
        paymentMethod={paymentMethod}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        isArabic={isArabic}
        t={t}
        onDiscountChange={onDiscountChange}
        onPaymentMethodChange={onPaymentMethodChange}
        onCustomerNameChange={onCustomerNameChange}
        onCustomerPhoneChange={onCustomerPhoneChange}
        onCustomerAddressChange={onCustomerAddressChange}
        getPaymentLabel={getPaymentLabel}
        disableCredit={!isOnline}
        paymentOptions={paymentOptions}
        paymentOptionValue={paymentOptionValue}
        onPaymentOptionChange={onPaymentOptionChange}
        canAssignDeliveryEmployee={canAssignDeliveryEmployee}
        deliveryEmployeeName={deliveryEmployeeName}
        onOpenDeliveryEmployeePicker={onOpenDeliveryEmployeePicker}
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
