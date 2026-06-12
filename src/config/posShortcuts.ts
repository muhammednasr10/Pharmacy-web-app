export type PosShortcutAction =
  | "showHelp"
  | "focusBarcode"
  | "paymentCash"
  | "paymentVisa"
  | "paymentWallet"
  | "holdInvoice"
  | "openHeldInvoices"
  | "completeSale"
  | "clearCart";

export type PosShortcutDef = {
  id: PosShortcutAction;
  keys: string[];
  labelAr: string;
  labelEn: string;
  requiresOnline?: boolean;
};

export const POS_SHORTCUTS: PosShortcutDef[] = [
  {
    id: "showHelp",
    keys: ["F1", "?"],
    labelAr: "عرض اختصارات لوحة المفاتيح",
    labelEn: "Show keyboard shortcuts",
  },
  {
    id: "focusBarcode",
    keys: ["F2"],
    labelAr: "التركيز على حقل الباركود",
    labelEn: "Focus barcode field",
  },
  {
    id: "paymentCash",
    keys: ["F4"],
    labelAr: "طريقة الدفع: نقدي",
    labelEn: "Payment method: cash",
  },
  {
    id: "paymentVisa",
    keys: ["F5"],
    labelAr: "طريقة الدفع: فيزا",
    labelEn: "Payment method: Visa",
  },
  {
    id: "paymentWallet",
    keys: ["F6"],
    labelAr: "طريقة الدفع: محفظة",
    labelEn: "Payment method: wallet",
  },
  {
    id: "holdInvoice",
    keys: ["F8"],
    labelAr: "تعليق الفاتورة",
    labelEn: "Hold invoice",
    requiresOnline: true,
  },
  {
    id: "openHeldInvoices",
    keys: ["F9"],
    labelAr: "الفواتير المعلقة",
    labelEn: "Held invoices",
    requiresOnline: true,
  },
  {
    id: "completeSale",
    keys: ["Ctrl+Enter"],
    labelAr: "إتمام البيع",
    labelEn: "Complete sale",
  },
  {
    id: "clearCart",
    keys: ["Ctrl+Backspace"],
    labelAr: "تفريغ السلة",
    labelEn: "Clear cart",
  },
];

export function formatShortcutKey(key: string) {
  return key.replace("Ctrl+", "Ctrl + ");
}
