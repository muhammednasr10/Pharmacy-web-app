import type { CartItem, PaymentMethod } from "../types";
import type { PaymentOption } from "./pos/paymentTypes";
import PosCartCheckout from "./pos/PosCartCheckout";
import PosCartItems from "./pos/PosCartItems";

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
      <PosCartItems
        cart={cart}
        isArabic={isArabic}
        t={t}
        currency={currency}
        onDecreaseQty={onDecreaseQty}
        onIncreaseQty={onIncreaseQty}
        onRemoveItem={onRemoveItem}
      />
    </div>
  );

  const cartCheckout = (
    <PosCartCheckout
      cartLength={cart.length}
      subtotal={subtotal}
      total={total}
      discount={discount}
      paymentMethod={paymentMethod}
      customerName={customerName}
      customerPhone={customerPhone}
      isArabic={isArabic}
      t={t}
      currency={currency}
      isSelling={isSelling}
      isSubscriptionExpired={isSubscriptionExpired}
      saleBlocked={saleBlocked}
      subscriptionBlocksSale={subscriptionBlocksSale}
      shiftSaleBlocked={shiftSaleBlocked}
      onDiscountChange={onDiscountChange}
      onPaymentMethodChange={onPaymentMethodChange}
      onCustomerNameChange={onCustomerNameChange}
      onCustomerPhoneChange={onCustomerPhoneChange}
      onCompleteSale={onCompleteSale}
      getPaymentLabel={getPaymentLabel}
      heldInvoicesCount={heldInvoicesCount}
      isHolding={isHolding}
      onHoldInvoice={onHoldInvoice}
      onOpenHeldInvoices={onOpenHeldInvoices}
      onOpenInstantReturn={onOpenInstantReturn}
      isOnline={isOnline}
      paymentOptions={paymentOptions}
      paymentOptionValue={paymentOptionValue}
      onPaymentOptionChange={onPaymentOptionChange}
    />
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
