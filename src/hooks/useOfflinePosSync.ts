import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AppUser, CashierShift, Medicine } from "../types";
import { isAllBranchesMode } from "../constants/branches";
import {
  OFFLINE_MEDICINES_CACHE_MS,
  OFFLINE_POS_STOCK_SEED_PAGES,
} from "../constants/medicineCatalog";
import { fetchMedicinesPage, INVENTORY_PAGE_SIZE } from "../services/pharmacy/inventoryPaginationService";
import {
  cacheOpenCashierShift,
  clearCachedOpenCashierShift,
  countPendingOfflineSales,
  loadCachedMedicines,
  loadCachedOpenCashierShift,
  mergeMedicinesIntoOfflineCache,
} from "../utils/offlinePosStorage";
import { syncPendingOfflineSales } from "../utils/offlinePosSync";
import { readRecentBarcodes } from "../utils/offlineRecentMedicines";
import { lookupInventoryMedicineByBarcode } from "../services/pharmacy/inventoryPaginationService";

type UseOfflinePosSyncParams = {
  isOnline: boolean;
  isArabic: boolean;
  appUser: AppUser | null;
  activeBranchId: string | null;
  medicines: Medicine[];
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  activeCashierShift: CashierShift | null;
  setActiveCashierShift?: Dispatch<SetStateAction<CashierShift | null>>;
  getPharmacyId: () => string;
  refreshMedicinesFromDb: () => Promise<void>;
  reloadAppDataFromDb?: () => Promise<void>;
  refreshActiveCashierShift: () => Promise<unknown>;
};

export function useOfflinePosSync({
  isOnline,
  isArabic,
  appUser,
  activeBranchId,
  medicines,
  setMedicines,
  activeCashierShift,
  setActiveCashierShift,
  getPharmacyId,
  refreshMedicinesFromDb,
  reloadAppDataFromDb,
  refreshActiveCashierShift,
}: UseOfflinePosSyncParams) {
  const [pendingOfflineSalesCount, setPendingOfflineSalesCount] = useState(0);
  const [offlineMedicinesCacheAt, setOfflineMedicinesCacheAt] = useState<string | null>(null);
  const [isSyncingOfflineSales, setIsSyncingOfflineSales] = useState(false);
  const wasOfflineRef = useRef(false);
  const seededPharmacyRef = useRef<string | null>(null);

  const refreshOfflinePosMeta = useCallback(async () => {
    const pharmacyId = getPharmacyId();
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) {
      setPendingOfflineSalesCount(0);
      setOfflineMedicinesCacheAt(null);
      return;
    }
    try {
      const [pendingCount, cached] = await Promise.all([
        countPendingOfflineSales(pharmacyId),
        loadCachedMedicines(pharmacyId),
      ]);
      setPendingOfflineSalesCount(pendingCount);
      setOfflineMedicinesCacheAt(cached.updatedAt);
    } catch (error) {
      console.warn("refreshOfflinePosMeta:", error);
    }
  }, [getPharmacyId, activeBranchId]);

  useEffect(() => {
    if (!appUser) return;
    void refreshOfflinePosMeta();
  }, [appUser?.uid, activeBranchId, refreshOfflinePosMeta]);

  useEffect(() => {
    const pharmacyId = getPharmacyId();
    const uid = appUser?.uid;
    if (!pharmacyId || !uid || isAllBranchesMode(pharmacyId)) return;

    if (activeCashierShift?.status === "open") {
      void cacheOpenCashierShift(activeCashierShift);
      return;
    }

    void clearCachedOpenCashierShift(pharmacyId, uid);
  }, [activeCashierShift, appUser?.uid, getPharmacyId, activeBranchId]);

  useEffect(() => {
    if (isOnline || !appUser || !setActiveCashierShift) return;
    if (activeCashierShift) return;
    const pharmacyId = getPharmacyId();
    const uid = appUser.uid;
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

    void loadCachedOpenCashierShift(pharmacyId, uid).then((cached) => {
      if (cached) setActiveCashierShift(cached);
    });
  }, [
    isOnline,
    appUser,
    activeCashierShift,
    setActiveCashierShift,
    getPharmacyId,
    activeBranchId,
  ]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (!wasOfflineRef.current || !appUser) return;
    wasOfflineRef.current = false;

    const pharmacyId = getPharmacyId();
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

    setIsSyncingOfflineSales(true);
    void syncPendingOfflineSales(pharmacyId)
      .then(async (result) => {
        const anySynced = result.synced > 0 || result.shiftClosesSynced > 0;
        const anyFailed = result.failed > 0 || result.shiftClosesFailed > 0;
        if (reloadAppDataFromDb) {
          await reloadAppDataFromDb();
        } else if (result.synced > 0) {
          await refreshMedicinesFromDb();
        }
        if (anySynced) {
          await refreshActiveCashierShift();
        }
        if (anySynced || anyFailed) {
          await refreshOfflinePosMeta();
        }
        if (result.synced > 0) {
          alert(
            isArabic
              ? `تمت مزامنة ${result.synced} فاتورة محفوظة محلياً`
              : `Synced ${result.synced} locally saved invoice(s)`,
          );
        }
        if (result.shiftClosesSynced > 0) {
          alert(
            isArabic
              ? `تمت مزامنة ${result.shiftClosesSynced} إغلاق وردية محفوظ محلياً`
              : `Synced ${result.shiftClosesSynced} queued shift close(s)`,
          );
        }
        if (anyFailed) {
          const firstError = result.errors[0]?.message || "";
          alert(
            isArabic
              ? `تعذرت مزامنة بعض العناصر المحلية. ${firstError}`
              : `Could not sync some local items. ${firstError}`,
          );
        }
      })
      .catch((error) => {
        console.error("Offline sync error:", error);
      })
      .finally(() => {
        setIsSyncingOfflineSales(false);
      });
  }, [
    isOnline,
    appUser?.uid,
    activeBranchId,
    getPharmacyId,
    activeCashierShift,
    refreshMedicinesFromDb,
    reloadAppDataFromDb,
    refreshActiveCashierShift,
    refreshOfflinePosMeta,
    isArabic,
  ]);

  useEffect(() => {
    if (isOnline || !appUser) return;
    const pharmacyId = getPharmacyId();
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

    void loadCachedMedicines(pharmacyId).then(({ medicines: cached, updatedAt }) => {
      if (cached.length > 0) {
        setMedicines(cached);
      }
      setOfflineMedicinesCacheAt(updatedAt);
    });
  }, [isOnline, appUser?.uid, activeBranchId, getPharmacyId, setMedicines]);

  useEffect(() => {
    if (!isOnline || medicines.length === 0 || !appUser) return;
    const pharmacyId = getPharmacyId();
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;

    const timer = setTimeout(() => {
      void mergeMedicinesIntoOfflineCache(pharmacyId, medicines).then(({ updatedAt }) => {
        setOfflineMedicinesCacheAt(updatedAt);
      });
    }, OFFLINE_MEDICINES_CACHE_MS);

    return () => clearTimeout(timer);
  }, [isOnline, medicines, appUser?.uid, activeBranchId, getPharmacyId]);

  // Prefetch in-stock pages + recently sold barcodes into IndexedDB for offline POS.
  useEffect(() => {
    if (!isOnline || !appUser) return;
    const pharmacyId = getPharmacyId();
    if (!pharmacyId || isAllBranchesMode(pharmacyId)) return;
    if (seededPharmacyRef.current === pharmacyId) return;

    let cancelled = false;
    seededPharmacyRef.current = pharmacyId;

    void (async () => {
      try {
        const collected: Medicine[] = [];
        const recentCodes = readRecentBarcodes(pharmacyId);
        for (const code of recentCodes.slice(0, 60)) {
          if (cancelled) return;
          try {
            const row = await lookupInventoryMedicineByBarcode(code);
            if (row && (!row.pharmacyId || row.pharmacyId === pharmacyId)) {
              collected.push(row);
            }
          } catch {
            // Individual barcode lookup failures should not abort the seed.
          }
        }
        for (let page = 1; page <= OFFLINE_POS_STOCK_SEED_PAGES; page += 1) {
          if (cancelled) return;
          const result = await fetchMedicinesPage({
            page,
            pageSize: INVENTORY_PAGE_SIZE,
            stockFilter: "all",
            inStockOnly: true,
            pharmacyIds: [pharmacyId],
          });
          collected.push(...result.rows);
          if (result.rows.length === 0 || collected.length >= result.total) break;
          if (result.rows.length < INVENTORY_PAGE_SIZE) break;
        }
        if (cancelled || collected.length === 0) return;
        const { updatedAt } = await mergeMedicinesIntoOfflineCache(pharmacyId, collected);
        if (!cancelled) setOfflineMedicinesCacheAt(updatedAt);
      } catch (error) {
        console.warn("Offline POS stock seed failed:", error);
        if (!cancelled) seededPharmacyRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, appUser?.uid, activeBranchId, getPharmacyId]);

  return {
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    refreshOfflinePosMeta,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  };
}
