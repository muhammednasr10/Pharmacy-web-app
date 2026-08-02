import type { PurchaseRecord } from "../../types";
import type { PurchaseGroup } from "./types";

export const emptyItemForm = {
  barcode: "",
  name_ar: "",
  name_en: "",
  qty: 0,
  buyPrice: 0,
  price: 0,
  expiry: "",
};

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function groupPurchasesByNumber(
  records: PurchaseRecord[],
  safeNumber: (value: unknown) => number,
): PurchaseGroup[] {
  const map = new Map<string, PurchaseGroup>();

  for (const record of records) {
    const key = record.purchaseNumber || `legacy-${record.id}`;
    const existing = map.get(key);

    if (existing) {
      existing.items.push(record);
      existing.totalCost += safeNumber(record.totalCost);
      existing.totalQuantity += safeNumber(record.quantity);
      if (!existing.supplierName && record.supplierName)
        existing.supplierName = record.supplierName;
      if (!existing.notes && record.notes) existing.notes = record.notes;
    } else {
      map.set(key, {
        purchaseNumber: record.purchaseNumber || `#${record.id}`,
        pharmacyId: record.pharmacyId || "",
        supplierName: record.supplierName || "",
        userName: record.userName || "",
        date: record.date || "",
        createdAt: record.createdAt || "",
        notes: record.notes || "",
        items: [record],
        totalCost: safeNumber(record.totalCost),
        totalQuantity: safeNumber(record.quantity),
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt || b.date || 0).getTime() -
      new Date(a.createdAt || a.date || 0).getTime(),
  );
}
