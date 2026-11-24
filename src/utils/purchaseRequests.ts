import type { Medicine } from "../types";
import { suggestReorderQty } from "./reorderSuggestions";

export type PurchaseRequestStatus = "open" | "ordered" | "done" | "cancelled";

export type PurchaseRequestItem = {
  id: string;
  pharmacyId: string;
  medicineId: number;
  barcode: string;
  name_ar: string;
  name_en: string;
  currentQty: number;
  requestedQty: number;
  requestCount: number;
  buyPrice: number;
  sellPrice: number;
  expiry: string;
  note: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
};

const STORAGE_PREFIX = "pharmacy_purchase_requests:";
export const PURCHASE_REQUESTS_CHANGED_EVENT = "pharmacy:purchase-requests-changed";

function storageKey(pharmacyId: string) {
  return `${STORAGE_PREFIX}${pharmacyId || "default"}`;
}

function emitChanged(pharmacyId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PURCHASE_REQUESTS_CHANGED_EVENT, { detail: { pharmacyId } }),
  );
}

function readLocal(pharmacyId: string): PurchaseRequestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(pharmacyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PurchaseRequestItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(pharmacyId: string, items: PurchaseRequestItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(pharmacyId), JSON.stringify(items));
  } catch {
    // ignore quota
  }
  emitChanged(pharmacyId);
}

export function listLocalPurchaseRequests(
  pharmacyId: string,
  status: PurchaseRequestStatus | "all" = "open",
): PurchaseRequestItem[] {
  const rows = readLocal(pharmacyId);
  const filtered = status === "all" ? rows : rows.filter((item) => item.status === status);
  return filtered.sort(
    (a, b) =>
      b.requestCount - a.requestCount ||
      String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );
}

export function countOpenPurchaseRequests(pharmacyId: string): number {
  return listLocalPurchaseRequests(pharmacyId, "open").length;
}

export function upsertLocalPurchaseRequest(params: {
  pharmacyId: string;
  medicine: Pick<
    Medicine,
    "id" | "barcode" | "name_ar" | "name_en" | "qty" | "buyPrice" | "price" | "expiry"
  >;
  requestedQty?: number;
  note?: string;
  createdByName?: string;
  lowStockThreshold?: number;
}): PurchaseRequestItem {
  const { pharmacyId, medicine } = params;
  const now = new Date().toISOString();
  const existing = readLocal(pharmacyId);
  const medicineId = Number(medicine.id);
  const foundIndex = existing.findIndex(
    (item) =>
      item.status === "open" &&
      (item.medicineId === medicineId ||
        (medicine.barcode && item.barcode && item.barcode === medicine.barcode)),
  );

  const suggested =
    params.requestedQty ??
    suggestReorderQty(Number(medicine.qty) || 0, params.lowStockThreshold ?? 10);

  if (foundIndex >= 0) {
    const previous = existing[foundIndex];
    const next: PurchaseRequestItem = {
      ...previous,
      currentQty: Number(medicine.qty) || 0,
      requestedQty: Math.max(previous.requestedQty, suggested),
      requestCount: previous.requestCount + 1,
      buyPrice: Number(medicine.buyPrice) || previous.buyPrice || 0,
      sellPrice: Number(medicine.price) || previous.sellPrice || 0,
      expiry: medicine.expiry || previous.expiry || "",
      note: params.note?.trim() || previous.note,
      updatedAt: now,
      createdByName: params.createdByName || previous.createdByName,
    };
    const copy = [...existing];
    copy[foundIndex] = next;
    writeLocal(pharmacyId, copy);
    return next;
  }

  const created: PurchaseRequestItem = {
    id: `${Date.now()}-${medicineId}`,
    pharmacyId,
    medicineId,
    barcode: String(medicine.barcode || ""),
    name_ar: medicine.name_ar || "",
    name_en: medicine.name_en || "",
    currentQty: Number(medicine.qty) || 0,
    requestedQty: Math.max(1, suggested),
    requestCount: 1,
    buyPrice: Number(medicine.buyPrice) || 0,
    sellPrice: Number(medicine.price) || 0,
    expiry: medicine.expiry || "",
    note: params.note?.trim() || "",
    status: "open",
    createdAt: now,
    updatedAt: now,
    createdByName: params.createdByName,
  };
  writeLocal(pharmacyId, [created, ...existing]);
  return created;
}

export function updateLocalPurchaseRequest(
  pharmacyId: string,
  id: string,
  updates: Partial<
    Pick<PurchaseRequestItem, "requestedQty" | "note" | "status" | "currentQty">
  >,
): PurchaseRequestItem | null {
  const existing = readLocal(pharmacyId);
  const index = existing.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const next = {
    ...existing[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const copy = [...existing];
  copy[index] = next;
  writeLocal(pharmacyId, copy);
  return next;
}

export function removeLocalPurchaseRequest(pharmacyId: string, id: string) {
  writeLocal(
    pharmacyId,
    readLocal(pharmacyId).filter((item) => item.id !== id),
  );
}

export function subscribePurchaseRequestsChanged(
  handler: (pharmacyId: string) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = (event: Event) => {
    const pharmacyId = (event as CustomEvent<{ pharmacyId?: string }>).detail?.pharmacyId;
    if (pharmacyId) handler(pharmacyId);
  };
  window.addEventListener(PURCHASE_REQUESTS_CHANGED_EVENT, onEvent);
  return () => window.removeEventListener(PURCHASE_REQUESTS_CHANGED_EVENT, onEvent);
}
