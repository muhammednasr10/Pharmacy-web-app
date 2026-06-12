import * as pharmacyService from "../services/pharmacyService";
import {
  listPendingOfflineSales,
  removePendingOfflineSale,
  updatePendingOfflineSale,
  type PendingOfflineSale,
} from "./offlinePosStorage";

export type OfflineSyncResult = {
  synced: number;
  failed: number;
  errors: Array<{ localId: string; message: string }>;
};

async function syncOnePendingSale(sale: PendingOfflineSale): Promise<void> {
  await updatePendingOfflineSale(sale.localId, { status: "syncing", lastError: undefined });
  await pharmacyService.completeSaleWithStockDeduction(sale.cart, sale.invoice, undefined);
  await removePendingOfflineSale(sale.localId);
}

export async function syncPendingOfflineSales(pharmacyId?: string): Promise<OfflineSyncResult> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const pending = (await listPendingOfflineSales(pharmacyId)).filter(
    (sale) => sale.status === "pending" || sale.status === "failed",
  );

  const result: OfflineSyncResult = { synced: 0, failed: 0, errors: [] };

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

  return result;
}
