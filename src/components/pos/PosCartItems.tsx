import type { CartItem } from "../../types";

type PosCartItemsProps = {
  cart: CartItem[];
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  onDecreaseQty: (id: number) => void;
  onIncreaseQty: (id: number) => void;
  onRemoveItem: (id: number) => void;
};

export default function PosCartItems({
  cart,
  isArabic,
  t,
  currency,
  onDecreaseQty,
  onIncreaseQty,
  onRemoveItem,
}: PosCartItemsProps) {
  if (cart.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}
