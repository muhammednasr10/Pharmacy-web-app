import type { CartItem, PaymentMethod } from "../types";
import PaymentBox from "./PaymentBox";

type PosCartProps = {
  cart: CartItem[];
  cartItemsCount: number;
  cartTotalQty: number;
  subtotal: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  isSelling: boolean;
  isSubscriptionExpired: boolean;
  onDecreaseQty: (id: number) => void;
  onIncreaseQty: (id: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
  onCompleteSale: () => void;
  getPaymentLabel: (method: string) => string;
  heldInvoicesCount: number;
  isHolding: boolean;
  onHoldInvoice: () => void;
  onOpenHeldInvoices: () => void;
  onOpenInstantReturn: () => void;
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
  isArabic,
  t,
  currency,
  isSelling,
  isSubscriptionExpired,
  onDecreaseQty,
  onIncreaseQty,
  onRemoveItem,
  onClearCart,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCompleteSale,
  getPaymentLabel,
  heldInvoicesCount,
  isHolding,
  onHoldInvoice,
  onOpenHeldInvoices,
  onOpenInstantReturn,
}: PosCartProps) {
  return (
    <div className="posPanel">
      <div className="cartHeader">
        <div>
          <h3>{t.cart}</h3>
          <div className="cartMiniStats">
            <span>{isArabic ? "الأصناف" : "Items"}: {cartItemsCount}</span>
            <span>{isArabic ? "الكمية" : "Qty"}: {cartTotalQty}</span>
          </div>
        </div>
        {cart.length > 0 && (
          <button className="clearCartBtn" onClick={onClearCart}>
            {isArabic ? "تفريغ السلة" : "Clear Cart"}
          </button>
        )}
      </div>
      {cart.length === 0 ? (
        <p className="empty">{t.emptyCart}</p>
      ) : (
        <div className="cartList">
          {cart.map((item) => (
            <div className="cartItem" key={item.id}>
              <div>
                <strong>{isArabic ? item.name_ar : item.name_en}</strong>
                <p>{item.price} {currency} × {item.cartQty}</p>
              </div>
              <div className="qtyControls">
                <button onClick={() => onDecreaseQty(item.id)}>-</button>
                <span>{item.cartQty}</span>
                <button onClick={() => onIncreaseQty(item.id)}>+</button>
              </div>
              <button className="deleteBtn" onClick={() => onRemoveItem(item.id)}>
                {t.remove}
              </button>
            </div>
          ))}
        </div>
      )}
      <PaymentBox
        discount={discount}
        paymentMethod={paymentMethod}
        customerName={customerName}
        isArabic={isArabic}
        t={t}
        onDiscountChange={onDiscountChange}
        onPaymentMethodChange={onPaymentMethodChange}
        onCustomerNameChange={onCustomerNameChange}
        getPaymentLabel={getPaymentLabel}
      />
      <div className="subtotalLine">
        <span>{t.subtotal}</span>
        <strong>{subtotal.toFixed(2)} {currency}</strong>
      </div>
      <div className="totalBox">
        <span>{t.total}</span>
        <strong>{total.toFixed(2)} {currency}</strong>
      </div>
      <div className="posActionRow">
        {cart.length > 0 && (
          <button
            className="posActionBtn holdBtn"
            type="button"
            onClick={onHoldInvoice}
            disabled={isHolding || isSubscriptionExpired}
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
        <button className="posActionBtn" type="button" onClick={onOpenHeldInvoices}>
          {isArabic ? "الفواتير المعلقة" : "Held Invoices"}
          {heldInvoicesCount > 0 ? ` (${heldInvoicesCount})` : ""}
        </button>
        <button className="posActionBtn" type="button" onClick={onOpenInstantReturn}>
          {isArabic ? "مرتجع سريع" : "Quick Return"}
        </button>
      </div>
      <button
        className="completeBtn"
        onClick={onCompleteSale}
        disabled={isSelling || isSubscriptionExpired}
      >
        {isSubscriptionExpired
          ? isArabic
            ? "الاشتراك منتهي"
            : "Subscription Expired"
          : isSelling
          ? isArabic
            ? "جاري تسجيل البيع..."
            : "Completing sale..."
          : t.completeSale}
      </button>
    </div>
  );
}
