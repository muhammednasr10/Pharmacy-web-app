import type {
  ActivityLog,
  CartItem,
  CashierShift,
  CustomerPayment,
  HeldInvoice,
  Invoice,
  Medicine,
  PharmacyCost,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
} from "../types";
import { OFFLINE_POS_MEDICINES_CACHE_MAX } from "../constants/medicineCatalog";

const DB_NAME = "focus-pharmacy-offline";
const DB_VERSION = 4;

export type AppDataSnapshot = {
  cacheKey: string;
  updatedAt: string;
  branches: PharmacySettings[];
  pharmacySettings: PharmacySettings | null;
  medicines: Medicine[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  purchases: PurchaseRecord[];
  customerPayments: CustomerPayment[];
  pharmacyCosts: PharmacyCost[];
  stockMovements: StockMovement[];
  activityLogs: ActivityLog[];
  heldInvoices: HeldInvoice[];
};

export function buildAppDataCacheKey(userId: string, branchId: string) {
  return `${userId}:${branchId}`;
}

export type PendingOfflineSale = {
  localId: string;
  pharmacyId: string;
  cart: CartItem[];
  invoice: Invoice;
  queuedAt: string;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

type MedicinesCacheRow = {
  pharmacyId: string;
  medicines: Medicine[];
  updatedAt: string;
};

type OpenShiftCacheRow = {
  key: string;
  pharmacyId: string;
  cashierId: string;
  shift: CashierShift;
  updatedAt: string;
};

export type PendingOfflineShiftClose = {
  localId: string;
  shiftId: number;
  pharmacyId: string;
  actualCash: number;
  notes?: string;
  closedById?: string;
  closedByName?: string;
  queuedAt: string;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

function openShiftCacheKey(pharmacyId: string, cashierId: string) {
  return `${pharmacyId}:${cashierId}`;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_open_failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("medicines")) {
        db.createObjectStore("medicines", { keyPath: "pharmacyId" });
      }
      if (!db.objectStoreNames.contains("pendingSales")) {
        const store = db.createObjectStore("pendingSales", { keyPath: "localId" });
        store.createIndex("pharmacyId", "pharmacyId", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("appSnapshots")) {
        db.createObjectStore("appSnapshots", { keyPath: "cacheKey" });
      }
      if (!db.objectStoreNames.contains("openShifts")) {
        db.createObjectStore("openShifts", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("pendingShiftCloses")) {
        const store = db.createObjectStore("pendingShiftCloses", { keyPath: "localId" });
        store.createIndex("pharmacyId", "pharmacyId", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openOfflineDb().then(
    (db) =>
      new Promise<T | void>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = runner(store);
        tx.oncomplete = () => {
          if (request && "result" in request) {
            resolve((request as IDBRequest<T>).result);
            return;
          }
          resolve();
        };
        tx.onerror = () => reject(tx.error ?? new Error("indexeddb_tx_failed"));
      }),
  );
}

export async function cacheMedicinesSnapshot(pharmacyId: string, medicines: Medicine[]) {
  if (!pharmacyId || medicines.length === 0) return;
  const row: MedicinesCacheRow = {
    pharmacyId,
    medicines,
    updatedAt: new Date().toISOString(),
  };
  await runTransaction("medicines", "readwrite", (store) => store.put(row));
}

export async function loadCachedMedicines(pharmacyId: string): Promise<{
  medicines: Medicine[];
  updatedAt: string | null;
}> {
  if (!pharmacyId) return { medicines: [], updatedAt: null };
  const row = (await runTransaction<MedicinesCacheRow | undefined>(
    "medicines",
    "readonly",
    (store) => store.get(pharmacyId),
  )) as MedicinesCacheRow | undefined;
  return {
    medicines: row?.medicines ?? [],
    updatedAt: row?.updatedAt ?? null,
  };
}

/** Merge medicines into the offline POS cache (in-stock preferred when trimming). */
export async function mergeMedicinesIntoOfflineCache(
  pharmacyId: string,
  incoming: Medicine[],
  maxItems = OFFLINE_POS_MEDICINES_CACHE_MAX,
): Promise<{ medicines: Medicine[]; updatedAt: string }> {
  if (!pharmacyId) {
    return { medicines: [], updatedAt: new Date().toISOString() };
  }
  const { medicines: cached } = await loadCachedMedicines(pharmacyId);
  if (incoming.length === 0) {
    return {
      medicines: cached,
      updatedAt: new Date().toISOString(),
    };
  }

  const merged = new Map<number, Medicine>();
  for (const medicine of cached) merged.set(medicine.id, medicine);
  for (const medicine of incoming) merged.set(medicine.id, medicine);

  const next = Array.from(merged.values())
    .sort((left, right) => {
      const leftStock = left.qty > 0 ? 1 : 0;
      const rightStock = right.qty > 0 ? 1 : 0;
      if (leftStock !== rightStock) return rightStock - leftStock;
      return String(left.name_ar || "").localeCompare(String(right.name_ar || ""), "ar");
    })
    .slice(0, Math.max(1, maxItems));

  const updatedAt = new Date().toISOString();
  await runTransaction("medicines", "readwrite", (store) =>
    store.put({ pharmacyId, medicines: next, updatedAt } satisfies MedicinesCacheRow),
  );
  return { medicines: next, updatedAt };
}

export async function cacheOpenCashierShift(shift: CashierShift): Promise<void> {
  if (!shift?.pharmacyId || !shift?.cashierId || shift.status !== "open") return;
  const row: OpenShiftCacheRow = {
    key: openShiftCacheKey(shift.pharmacyId, shift.cashierId),
    pharmacyId: shift.pharmacyId,
    cashierId: shift.cashierId,
    shift,
    updatedAt: new Date().toISOString(),
  };
  await runTransaction("openShifts", "readwrite", (store) => store.put(row));
}

export async function loadCachedOpenCashierShift(
  pharmacyId: string,
  cashierId: string,
): Promise<CashierShift | null> {
  if (!pharmacyId || !cashierId) return null;
  const row = (await runTransaction<OpenShiftCacheRow | undefined>(
    "openShifts",
    "readonly",
    (store) => store.get(openShiftCacheKey(pharmacyId, cashierId)),
  )) as OpenShiftCacheRow | undefined;
  if (!row?.shift || row.shift.status !== "open") return null;
  return row.shift;
}

export async function clearCachedOpenCashierShift(
  pharmacyId: string,
  cashierId: string,
): Promise<void> {
  if (!pharmacyId || !cashierId) return;
  await runTransaction("openShifts", "readwrite", (store) =>
    store.delete(openShiftCacheKey(pharmacyId, cashierId)),
  );
}

export async function queueOfflineSale(input: {
  pharmacyId: string;
  cart: CartItem[];
  invoice: Invoice;
}): Promise<PendingOfflineSale> {
  const entry: PendingOfflineSale = {
    localId: `offline-${input.invoice.id}`,
    pharmacyId: input.pharmacyId,
    cart: input.cart,
    invoice: input.invoice,
    queuedAt: new Date().toISOString(),
    status: "pending",
  };
  await runTransaction("pendingSales", "readwrite", (store) => store.put(entry));
  return entry;
}

export async function listPendingOfflineSales(pharmacyId?: string): Promise<PendingOfflineSale[]> {
  const rows = (await runTransaction<PendingOfflineSale[]>("pendingSales", "readonly", (store) =>
    store.getAll(),
  )) as PendingOfflineSale[] | void;
  const all = rows ?? [];
  return pharmacyId ? all.filter((row) => row.pharmacyId === pharmacyId) : all;
}

export async function countPendingOfflineSales(pharmacyId?: string): Promise<number> {
  const rows = await listPendingOfflineSales(pharmacyId);
  return rows.filter((row) => row.status === "pending" || row.status === "failed").length;
}

export async function updatePendingOfflineSale(
  localId: string,
  updates: Partial<PendingOfflineSale>,
): Promise<void> {
  const existing = (await runTransaction<PendingOfflineSale | undefined>(
    "pendingSales",
    "readonly",
    (store) => store.get(localId),
  )) as PendingOfflineSale | undefined;
  if (!existing) return;
  await runTransaction("pendingSales", "readwrite", (store) =>
    store.put({ ...existing, ...updates }),
  );
}

export async function removePendingOfflineSale(localId: string): Promise<void> {
  await runTransaction("pendingSales", "readwrite", (store) => store.delete(localId));
}

export async function saveAppDataSnapshot(snapshot: AppDataSnapshot): Promise<void> {
  await runTransaction("appSnapshots", "readwrite", (store) => store.put(snapshot));
}

export async function loadAppDataSnapshot(cacheKey: string): Promise<AppDataSnapshot | null> {
  if (!cacheKey) return null;
  const row = (await runTransaction<AppDataSnapshot | undefined>(
    "appSnapshots",
    "readonly",
    (store) => store.get(cacheKey),
  )) as AppDataSnapshot | undefined;
  return row ?? null;
}

export function applyOptimisticStockDeduction(medicines: Medicine[], cart: CartItem[]): Medicine[] {
  if (!cart.length) return medicines;
  const qtyById = new Map<number, number>();
  for (const item of cart) {
    qtyById.set(item.id, (qtyById.get(item.id) ?? 0) + item.cartQty);
  }
  return medicines.map((medicine) => {
    const soldQty = qtyById.get(medicine.id);
    if (!soldQty) return medicine;
    return { ...medicine, qty: Math.max(0, medicine.qty - soldQty) };
  });
}

export async function queueOfflineShiftClose(
  input: Omit<PendingOfflineShiftClose, "localId" | "queuedAt" | "status" | "lastError">,
): Promise<PendingOfflineShiftClose> {
  const entry: PendingOfflineShiftClose = {
    ...input,
    localId: `close-${input.shiftId}-${Date.now()}`,
    queuedAt: new Date().toISOString(),
    status: "pending",
  };
  await runTransaction("pendingShiftCloses", "readwrite", (store) => store.put(entry));
  return entry;
}

export async function listPendingOfflineShiftCloses(
  pharmacyId?: string,
): Promise<PendingOfflineShiftClose[]> {
  const rows = (await runTransaction<PendingOfflineShiftClose[]>(
    "pendingShiftCloses",
    "readonly",
    (store) => store.getAll(),
  )) as PendingOfflineShiftClose[] | void;
  const all = rows ?? [];
  return pharmacyId ? all.filter((row) => row.pharmacyId === pharmacyId) : all;
}

export async function updatePendingOfflineShiftClose(
  localId: string,
  updates: Partial<PendingOfflineShiftClose>,
): Promise<void> {
  const existing = (await runTransaction<PendingOfflineShiftClose | undefined>(
    "pendingShiftCloses",
    "readonly",
    (store) => store.get(localId),
  )) as PendingOfflineShiftClose | undefined;
  if (!existing) return;
  await runTransaction("pendingShiftCloses", "readwrite", (store) =>
    store.put({ ...existing, ...updates }),
  );
}

export async function removePendingOfflineShiftClose(localId: string): Promise<void> {
  await runTransaction("pendingShiftCloses", "readwrite", (store) => store.delete(localId));
}
