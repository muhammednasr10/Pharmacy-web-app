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
  cacheMedicinesSnapshot,
  countPendingOfflineSales,
  loadCachedMedicines,
} from "../utils/offlinePosStorage";
import { syncPendingOfflineSales } from "../utils/offlinePosSync";
import { OFFLINE_MEDICINES_CACHE_MS } from "../constants/medicineCatalog";

type UseOfflinePosSyncParams = {
  isOnline: boolean;
  isArabic: boolean;
  appUser: AppUser | null;
  activeBranchId: string | null;
  medicines: Medicine[];
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  activeCashierShift: CashierShift | null;
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
  getPharmacyId,
  refreshMedicinesFromDb,
  reloadAppDataFromDb,
  refreshActiveCashierShift,
}: UseOfflinePosSyncParams) {
  const [pendingOfflineSalesCount, setPendingOfflineSalesCount] = useState(0);
  const [offlineMedicinesCacheAt, setOfflineMedicinesCacheAt] = useState<string | null>(null);
  const [isSyncingOfflineSales, setIsSyncingOfflineSales] = useState(false);
  const wasOfflineRef = useRef(false);

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
        if (reloadAppDataFromDb) {
          await reloadAppDataFromDb();
        } else if (result.synced > 0) {
          await refreshMedicinesFromDb();
        }
        if (result.synced > 0) {
          if (activeCashierShift) {
            await refreshActiveCashierShift();
          }
        }
        if (result.synced > 0 || result.failed > 0) {
          await refreshOfflinePosMeta();
        }
        if (result.synced > 0) {
          alert(
            isArabic
              ? `تمت مزامنة ${result.synced} فاتورة محفوظة محلياً`
              : `Synced ${result.synced} locally saved invoice(s)`,
          );
        }
        if (result.failed > 0) {
          const firstError = result.errors[0]?.message || "";
          alert(
            isArabic
              ? `تعذرت مزامنة ${result.failed} فاتورة. ${firstError}`
              : `Could not sync ${result.failed} invoice(s). ${firstError}`,
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
      void cacheMedicinesSnapshot(pharmacyId, medicines).then(() => {
        setOfflineMedicinesCacheAt(new Date().toISOString());
      });
    }, OFFLINE_MEDICINES_CACHE_MS);

    return () => clearTimeout(timer);
  }, [isOnline, medicines, appUser?.uid, activeBranchId, getPharmacyId]);

  return {
    pendingOfflineSalesCount,
    offlineMedicinesCacheAt,
    isSyncingOfflineSales,
    refreshOfflinePosMeta,
    setOfflineMedicinesCacheAt,
    setPendingOfflineSalesCount,
  };
}
