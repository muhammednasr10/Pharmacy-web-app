import * as pharmacyService from "../services/pharmacyService";
import {
  clearCachedOpenCashierShift,
  listPendingOfflineSales,
  listPendingOfflineShiftCloses,
  removePendingOfflineSale,
  removePendingOfflineShiftClose,
  updatePendingOfflineSale,
  updatePendingOfflineShiftClose,
  type PendingOfflineSale,
  type PendingOfflineShiftClose,
} from "./offlinePosStorage";

export type OfflineSyncResult = {
  synced: number;
  failed: number;
  errors: Array<{ localId: string; message: string }>;
  shiftClosesSynced: number;
  shiftClosesFailed: number;
};

async function syncOnePendingSale(sale: PendingOfflineSale): Promise<void> {
  await updatePendingOfflineSale(sale.localId, { status: "syncing", lastError: undefined });
  await pharmacyService.completeSaleWithStockDeduction(sale.cart, sale.invoice, undefined);
  await removePendingOfflineSale(sale.localId);
}

async function syncOnePendingShiftClose(entry: PendingOfflineShiftClose): Promise<void> {
  await updatePendingOfflineShiftClose(entry.localId, { status: "syncing", lastError: undefined });
  await pharmacyService.closeCashierShift({
    shiftId: entry.shiftId,
    actualCash: entry.actualCash,
    notes: entry.notes,
    closedById: entry.closedById,
    closedByName: entry.closedByName,
  });
  await clearCachedOpenCashierShift(entry.pharmacyId, entry.closedById || "");
  await removePendingOfflineShiftClose(entry.localId);
}

export async function syncPendingOfflineSales(pharmacyId?: string): Promise<OfflineSyncResult> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: [], shiftClosesSynced: 0, shiftClosesFailed: 0 };
  }

  const pending = (await listPendingOfflineSales(pharmacyId)).filter(
    (sale) => sale.status === "pending" || sale.status === "failed",
  );

  const result: OfflineSyncResult = {
    synced: 0,
    failed: 0,
    errors: [],
    shiftClosesSynced: 0,
    shiftClosesFailed: 0,
  };

  for (const sale of pending) {
    try {
      await syncOnePendingSale(sale);
      result.synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "sync_failed";
      result.failed += 1;
      result.errors.push({ localId: sale.localId, message });
      await updatePendingOfflineSale(sale.localId, { status: "failed", lastError: message });
    }
  }

  const pendingCloses = (await listPendingOfflineShiftCloses(pharmacyId)).filter(
    (row) => row.status === "pending" || row.status === "failed",
  );

  for (const entry of pendingCloses) {
    try {
      await syncOnePendingShiftClose(entry);
      result.shiftClosesSynced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "shift_close_sync_failed";
      result.shiftClosesFailed += 1;
      result.errors.push({ localId: entry.localId, message });
      await updatePendingOfflineShiftClose(entry.localId, {
        status: "failed",
        lastError: message,
      });
    }
  }

  return result;
}
