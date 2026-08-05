import type { Invoice, InvoiceItem, Medicine, ReturnRecord } from "../types";

function safeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

/** Stable key for medicine IDs stored as text ("26563") or number (26563). */
export function normalizeMedicineIdKey(value: unknown): string {
  const raw = value ?? "";
  if (typeof raw === "string" && raw.includes("-")) {
    return raw.trim();
  }
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return String(asNumber);
  }
  return String(raw).trim();
}

export function sameMedicineId(a: unknown, b: unknown): boolean {
  const left = normalizeMedicineIdKey(a);
  const right = normalizeMedicineIdKey(b);
  return left !== "" && left !== "0" && left === right;
}

export function findMedicineForReturnItem(
  item: NonNullable<ReturnRecord["items"]>[number],
  medicinesList: Medicine[],
) {
  const medicineId = item.medicineId;
  let found = medicinesList.find((medicine) => String(medicine.id) === String(medicineId));
  if (found) return found;

  if (item.barcode) {
    found = medicinesList.find((medicine) => medicine.barcode === item.barcode);
  }

  return found;
}

export function getReturnItemMedicineId(item: {
  medicineId?: number | string;
  medicine_id?: number | string;
}) {
  return normalizeMedicineIdKey(item.medicineId ?? item.medicine_id);
}

export function getReturnItemQuantity(item: { quantity?: number; qty?: number }) {
  return Number(item.quantity ?? item.qty ?? 0);
}

export function getReturnedQtyForInvoice(
  returns: ReturnRecord[],
  invoiceNumber: string,
  medicineId: number | string,
) {
  const targetId = getReturnItemMedicineId({ medicineId });
  return returns
    .filter((returnRecord) => returnRecord.invoiceNumber === invoiceNumber)
    .flatMap((returnRecord) => returnRecord.items || [])
    .filter((item) => String(getReturnItemMedicineId(item)) === String(targetId))
    .reduce((sum, item) => sum + getReturnItemQuantity(item), 0);
}

export function getReturnTypeLabel(returnRecord: ReturnRecord, isArabic: boolean) {
  if (returnRecord.isInstant) {
    return isArabic ? "مرتجع لحظي" : "Instant Return";
  }
  return isArabic ? "مرتجع فاتورة" : "Invoice Return";
}

export function getRefundMethodLabel(returnRecord: ReturnRecord, isArabic: boolean) {
  if (returnRecord.refundMethod === "cash") {
    return isArabic ? "استرداد نقدي" : "Cash refund";
  }
  if (returnRecord.refundMethod === "deduct_from_cart") {
    return isArabic ? "خصم من السلة" : "Deduct from cart";
  }
  return isArabic ? "إرجاع للمخزون" : "Stock restore";
}

export function getReturnItemsSummary(returnRecord: ReturnRecord, isArabic: boolean) {
  const items = returnRecord.items || [];
  if (items.length === 0) return "-";

  const totalQty = items.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
  const firstName = isArabic ? items[0].name_ar : items[0].name_en;

  if (items.length === 1) {
    return `${firstName || "-"} × ${safeNumber(items[0].quantity)}`;
  }

  return isArabic
    ? `${items.length} أصناف (${totalQty} وحدة) — ${firstName || "-"}...`
    : `${items.length} items (${totalQty} units) — ${firstName || "-"}...`;
}

export function getAvailableReturnQty(
  returns: ReturnRecord[],
  invoice: Invoice,
  item: InvoiceItem,
) {
  const alreadyReturnedQty = getReturnedQtyForInvoice(
    returns,
    invoice.invoiceNumber,
    item.medicineId,
  );

  return Math.max(0, item.quantity - alreadyReturnedQty);
}
