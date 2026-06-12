import { useEffect } from "react";
import type { PaymentMethod } from "../types";
import type { PosShortcutAction } from "../config/posShortcuts";

type UsePosKeyboardShortcutsOptions = {
  enabled: boolean;
  isArabic: boolean;
  isOnline: boolean;
  cartLength: number;
  isSelling: boolean;
  isHolding: boolean;
  onShowHelp: () => void;
  onFocusBarcode: () => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onHoldInvoice: () => void;
  onOpenHeldInvoices: () => void;
  onCompleteSale: () => void;
  onClearCart: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function matchShortcut(event: KeyboardEvent): PosShortcutAction | null {
  const key = event.key;

  if (key === "F1" || (key === "?" && event.shiftKey)) return "showHelp";
  if (key === "F2") return "focusBarcode";
  if (key === "F4") return "paymentCash";
  if (key === "F5") return "paymentVisa";
  if (key === "F6") return "paymentWallet";
  if (key === "F8") return "holdInvoice";
  if (key === "F9") return "openHeldInvoices";
  if (key === "Enter" && (event.ctrlKey || event.metaKey)) return "completeSale";
  if (key === "Backspace" && (event.ctrlKey || event.metaKey)) return "clearCart";

  return null;
}

export function usePosKeyboardShortcuts({
  enabled,
  isArabic,
  isOnline,
  cartLength,
  isSelling,
  isHolding,
  onShowHelp,
  onFocusBarcode,
  onPaymentMethodChange,
  onHoldInvoice,
  onOpenHeldInvoices,
  onCompleteSale,
  onClearCart,
}: UsePosKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const action = matchShortcut(event);
      if (!action) return;

      const typing = isEditableTarget(event.target);
      if (typing) {
        const isFunctionKey = /^F\d+$/.test(event.key);
        const isModifierCombo =
          (event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key === "Backspace");
        if (!isFunctionKey && !isModifierCombo) return;
      }

      event.preventDefault();

      switch (action) {
        case "showHelp":
          onShowHelp();
          break;
        case "focusBarcode":
          onFocusBarcode();
          break;
        case "paymentCash":
          onPaymentMethodChange("cash");
          break;
        case "paymentVisa":
          onPaymentMethodChange("visa");
          break;
        case "paymentWallet":
          onPaymentMethodChange("wallet");
          break;
        case "holdInvoice":
          if (!isOnline || isHolding || cartLength === 0) return;
          onHoldInvoice();
          break;
        case "openHeldInvoices":
          if (!isOnline) return;
          onOpenHeldInvoices();
          break;
        case "completeSale":
          if (isSelling || cartLength === 0) return;
          onCompleteSale();
          break;
        case "clearCart":
          if (cartLength === 0) return;
          if (window.confirm(isArabic ? "تفريغ السلة بالكامل؟" : "Clear the entire cart?")) {
            onClearCart();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    isArabic,
    isOnline,
    cartLength,
    isSelling,
    isHolding,
    onShowHelp,
    onFocusBarcode,
    onPaymentMethodChange,
    onHoldInvoice,
    onOpenHeldInvoices,
    onCompleteSale,
    onClearCart,
  ]);
}
