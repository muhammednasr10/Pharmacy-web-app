import type { CartItem, PaymentMethod } from "../types";
import PaymentBox, { type PaymentOption } from "./PaymentBox";

type PosCartProps = {
  cart: CartItem[];
  cartItemsCount: number;
  cartTotalQty: number;
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
  subscriptionBlocksSale?: boolean;
  shiftSaleBlocked?: boolean;
  layout?: "default" | "split";
  onDecreaseQty: (id: number) => void;
  onIncreaseQty: (id: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
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
  isOnline?: boolean;
  paymentOptions?: PaymentOption[];
  paymentOptionValue?: string;
  onPaymentOptionChange?: (value: string) => void;
};

export default function PosCart({
  cart,
  cartItemsCount,
  cartTotalQty,
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
  subscriptionBlocksSale = false,
  shiftSaleBlocked = false,
  layout = "default",
  onDecreaseQty,
  onIncreaseQty,
  onRemoveItem,
  onClearCart,
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
  isOnline = true,
  paymentOptions,
  paymentOptionValue,
  onPaymentOptionChange,
}: PosCartProps) {
  const saleBlocked = subscriptionBlocksSale || shiftSaleBlocked;
  const splitLayout = layout === "split";

  const cartHeader = (
    <div className="cartHeader">
      <div>
        <h3>{t.cart}</h3>
        <div className="cartMiniStats">
          <span>
            {isArabic ? "الأصناف" : "Items"}: {cartItemsCount}
          </span>
          <span>
            {isArabic ? "الكمية" : "Qty"}: {cartTotalQty}
          </span>
        </div>
      </div>
      {cart.length > 0 && (
        <button type="button" className="clearCartBtn" onClick={onClearCart}>
          {isArabic ? "تفريغ السلة" : "Clear Cart"}
        </button>
      )}
    </div>
  );

  const cartBody = (
    <div className="posCartBody">
      {cart.length === 0 ? (
        <div className="posCartEmpty">
          <span className="posCartEmptyIcon" aria-hidden="true">
            🛒
          </span>
          <p>{t.emptyCart}</p>
          <small>
            {isArabic
              ? "امسح باركود أو اختر من البحث السريع"
              : "Scan a barcode or pick from quick search"}
          </small>
        </div>
      ) : (
        <div className="cartList posCartList">
          {cart.map((item) => {
            const lineTotal = item.price * item.cartQty;
            return (
              <div className="cartItem posCartItem" key={item.id}>
                <div className="posCartItemMain">
                  <strong>{isArabic ? item.name_ar : item.name_en}</strong>
                  <p>
                    {item.price.toFixed(2)} {currency} × {item.cartQty}
                  </p>
                  <span className="posCartLineTotal">
                    {lineTotal.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="posCartItemActions">
                  <div className="qtyControls posQtyControls">
                    <button
                      type="button"
                      className="posQtyBtn"
                      aria-label={isArabic ? "إنقاص الكمية" : "Decrease quantity"}
                      onClick={() => onDecreaseQty(item.id)}
                    >
                      −
                    </button>
                    <span className="posQtyValue" title={isArabic ? "الكمية" : "Quantity"}>
                      {item.cartQty}
                    </span>
                    <button
                      type="button"
                      className="posQtyBtn"
                      aria-label={isArabic ? "زيادة الكمية" : "Increase quantity"}
                      onClick={() => onIncreaseQty(item.id)}
                      disabled={item.cartQty >= item.qty}
                    >
                      +
                    </button>
                  </div>
                  {item.cartQty > 1 ? (
                    <span className="posQtyConfirmHint">
                      {isArabic ? "كمية أكبر من 1 — ستُؤكد عند البيع" : "Qty > 1 — confirm at checkout"}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="deleteBtn posCartRemoveBtn"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const cartCheckout = (
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
        {cart.length > 0 && (
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
        disabled={isSelling || saleBlocked || cart.length === 0}
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

  if (splitLayout) {
    return (
      <div className="posPanel posCartPanel posCartPanel--split">
        <div className="posCartSplitMain">
          {cartHeader}
          {cartBody}
        </div>
        <div className="posCartSplitSide">{cartCheckout}</div>
      </div>
    );
  }

  return (
    <div className="posPanel posCartPanel">
      {cartHeader}
      {cartBody}
      {cartCheckout}
    </div>
  );
}
