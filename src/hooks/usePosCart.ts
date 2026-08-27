import { useCallback, useEffect, useMemo, useState } from "react";
import type { CartItem, Medicine, PaymentMethod } from "../types";

type UsePosCartOptions = {
  medicines: Medicine[];
  isArabic: boolean;
  isViewingAllBranches: boolean;
  isOnline: boolean;
};

export function usePosCart({
  medicines,
  isArabic,
  isViewingAllBranches,
  isOnline,
}: UsePosCartOptions) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.cartQty, 0),
    [cart],
  );
  const safeDiscount = useMemo(
    () => Math.min(Math.max(discount, 0), subtotal),
    [discount, subtotal],
  );
  const total = useMemo(() => Math.max(0, subtotal - safeDiscount), [subtotal, safeDiscount]);
  const cartItemsCount = cart.length;
  const cartTotalQty = useMemo(() => cart.reduce((sum, item) => sum + item.cartQty, 0), [cart]);

  const resetCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod("cash");
    setCustomerName("");
  }, []);

  const addToCart = useCallback(
    (medicine: Medicine) => {
      if (isViewingAllBranches) {
        alert(
          isArabic
            ? "اختر فرعاً محدداً من القائمة العلوية قبل البيع"
            : "Select a specific branch from the top menu before selling",
        );
        return false;
      }

      if (medicine.qty <= 0) {
        alert(isArabic ? "هذا الدواء غير متوفر في المخزون" : "This medicine is out of stock");
        return false;
      }

      const found = cart.find((item) => Number(item.id) === Number(medicine.id));
      if (found && found.cartQty >= medicine.qty) {
        alert(isArabic ? "لا توجد كمية كافية في المخزون" : "Not enough stock");
        return false;
      }

      setCart((oldCart) => {
        const existing = oldCart.find((item) => Number(item.id) === Number(medicine.id));

        if (existing) {
          return oldCart.map((item) =>
            Number(item.id) === Number(medicine.id)
              ? { ...item, cartQty: item.cartQty + 1, qty: medicine.qty }
              : item,
          );
        }

        return [...oldCart, { ...medicine, cartQty: 1 }];
      });
      return true;
    },
    [cart, isArabic, isViewingAllBranches],
  );

  const changeQty = useCallback(
    (id: number, delta: number) => {
      setCart((oldCart) =>
        oldCart.map((item) => {
          if (Number(item.id) !== Number(id)) return item;
          // Large catalogs skip loading full branchMedicines; fall back to the
          // stock qty captured when the line was added from search/barcode.
          const medicineInStock = medicines.find(
            (medicine) => Number(medicine.id) === Number(id),
          );
          const maxQty = Math.max(0, medicineInStock?.qty ?? item.qty ?? 0);
          const newQty = Math.max(1, item.cartQty + delta);

          if (newQty > maxQty) {
            alert(isArabic ? "لا توجد كمية كافية في المخزون" : "Not enough stock");
            return item;
          }

          return { ...item, cartQty: newQty };
        }),
      );
    },
    [isArabic, medicines],
  );

  const removeItem = useCallback((id: number) => {
    setCart((oldCart) => oldCart.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    if (cart.length === 0) return;

    const confirmClear = window.confirm(
      isArabic ? "هل أنت متأكد من تفريغ السلة؟" : "Are you sure you want to clear the cart?",
    );

    if (!confirmClear) return;
    resetCart();
  }, [cart.length, isArabic, resetCart]);

  useEffect(() => {
    if (isOnline || paymentMethod !== "credit") return;
    setPaymentMethod("cash");
    setCustomerName("");
  }, [isOnline, paymentMethod]);

  return {
    cart,
    setCart,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    customerName,
    setCustomerName,
    subtotal,
    safeDiscount,
    total,
    cartItemsCount,
    cartTotalQty,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
    resetCart,
  };
}
