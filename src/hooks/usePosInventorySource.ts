import { useCallback, useEffect, useMemo, useState } from "react";
import type { Medicine } from "../types";
import { isAllBranchesMode } from "../constants/branches";
import {
  fetchMedicinesPage,
  INVENTORY_PAGE_SIZE,
  lookupInventoryMedicineByBarcode,
  searchInventoryMedicines,
} from "../services/pharmacy/inventoryPaginationService";
import * as pharmacyService from "../services/pharmacyService";
import { LARGE_MEDICINE_CATALOG } from "../constants/medicineCatalog";
import {
  findMedicineByBarcode,
  medicineMatchesInventorySearch,
  sortMedicinesBySearchRelevance,
} from "../utils/medicineLookup";
import {
  loadCachedMedicines,
  mergeMedicinesIntoOfflineCache,
} from "../utils/offlinePosStorage";

type UsePosInventorySourceOptions = {
  pharmacyId: string;
  /** Limit search/page loads to these branches; defaults to active pharmacy scope. */
  searchPharmacyIds?: string[];
  enabled?: boolean;
  search?: string;
  refreshKey?: number | string;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  isOnline?: boolean;
};

export function usePosInventorySource({
  pharmacyId,
  searchPharmacyIds,
  enabled = true,
  search = "",
  refreshKey = 0,
  lowStockThreshold = 10,
  expiringSoonDays = 90,
  isOnline = typeof navigator === "undefined" ? true : navigator.onLine,
}: UsePosInventorySourceOptions) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchSnapshot, setBranchSnapshot] = useState<Medicine[]>([]);

  const trimmedSearch = search.trim();
  const scopedIds = useMemo(
    () => [...new Set((searchPharmacyIds || []).filter(Boolean))],
    [searchPharmacyIds],
  );
  const branchReady = enabled && Boolean(pharmacyId) && !isAllBranchesMode(pharmacyId);
  const usesInventoryPagination = catalogTotal > LARGE_MEDICINE_CATALOG || total > LARGE_MEDICINE_CATALOG;

  useEffect(() => {
    setPage(1);
  }, [trimmedSearch, pharmacyId, scopedIds.join("|"), lowStockThreshold, expiringSoonDays]);

  const rememberForOffline = useCallback(
    async (incoming: Medicine[]) => {
      if (!pharmacyId || isAllBranchesMode(pharmacyId) || incoming.length === 0) return;
      try {
        const { medicines } = await mergeMedicinesIntoOfflineCache(pharmacyId, incoming);
        setBranchSnapshot((current) => {
          if (current.length === 0) return medicines;
          const map = new Map<number, Medicine>();
          for (const medicine of current) map.set(medicine.id, medicine);
          for (const medicine of incoming) map.set(medicine.id, medicine);
          return Array.from(map.values());
        });
      } catch (cacheError) {
        console.warn("POS offline cache merge failed:", cacheError);
      }
    },
    [pharmacyId],
  );

  const loadPage = useCallback(async () => {
    if (!branchReady) {
      setRows([]);
      setTotal(0);
      setCatalogTotal(0);
      setError(null);
      return;
    }

    if (!isOnline) {
      setLoading(true);
      setError(null);
      try {
        const { medicines: cached } = await loadCachedMedicines(pharmacyId);
        const filtered = trimmedSearch
          ? sortMedicinesBySearchRelevance(
              cached.filter((medicine) => medicineMatchesInventorySearch(medicine, trimmedSearch)),
              trimmedSearch,
            )
          : cached.filter((medicine) => medicine.qty > 0);
        setRows(filtered.slice(0, INVENTORY_PAGE_SIZE));
        setTotal(filtered.length);
        setCatalogTotal(cached.length);
        setBranchSnapshot(cached);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [pageResult, allCountResult] = await Promise.all([
        fetchMedicinesPage({
          page,
          pageSize: INVENTORY_PAGE_SIZE,
          search: trimmedSearch,
          stockFilter: "all",
          lowStockThreshold,
          expiringSoonDays,
          inStockOnly: !trimmedSearch,
          pharmacyIds: scopedIds.length > 0 ? scopedIds : undefined,
        }),
        trimmedSearch
          ? Promise.resolve(null)
          : fetchMedicinesPage({
              page: 1,
              pageSize: 1,
              stockFilter: "all",
              lowStockThreshold,
              expiringSoonDays,
              pharmacyIds: scopedIds.length > 0 ? scopedIds : undefined,
            }),
      ]);

      setRows(pageResult.rows);
      setTotal(pageResult.total);
      if (allCountResult) {
        setCatalogTotal(allCountResult.total);
      }
      if (pageResult.rows.length > 0) {
        void rememberForOffline(pageResult.rows);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    branchReady,
    isOnline,
    pharmacyId,
    page,
    trimmedSearch,
    scopedIds,
    lowStockThreshold,
    expiringSoonDays,
    rememberForOffline,
  ]);

  useEffect(() => {
    void loadPage();
  }, [loadPage, refreshKey]);

  useEffect(() => {
    if (!branchReady) {
      setBranchSnapshot([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!isOnline) {
        const cached = await loadCachedMedicines(pharmacyId);
        if (!cancelled) setBranchSnapshot(cached.medicines);
        return;
      }

      const medicines = await pharmacyService.getMedicinesForPharmacy(pharmacyId);
      if (cancelled) return;

      if (medicines.length > 0) {
        setBranchSnapshot(medicines);
        void rememberForOffline(medicines);
        return;
      }

      const cached = await loadCachedMedicines(pharmacyId);
      if (!cancelled) setBranchSnapshot(cached.medicines);
    })();

    return () => {
      cancelled = true;
    };
  }, [branchReady, pharmacyId, refreshKey, isOnline, rememberForOffline]);

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      if (!branchReady) return null;
      const code = String(barcode ?? "").trim();
      if (!code) return null;

      if (!isOnline) {
        const pool =
          branchSnapshot.length > 0
            ? branchSnapshot
            : (await loadCachedMedicines(pharmacyId)).medicines;
        return findMedicineByBarcode(pool, code) || null;
      }

      const fromServer = await lookupInventoryMedicineByBarcode(code);
      if (fromServer) {
        void rememberForOffline([fromServer]);
        return fromServer;
      }
      return findMedicineByBarcode(branchSnapshot, code) || null;
    },
    [branchReady, branchSnapshot, isOnline, pharmacyId, rememberForOffline],
  );

  const lookupSearch = useCallback(
    async (query: string, limit = 8) => {
      if (!branchReady) return [];
      if (!isOnline) {
        const pool =
          branchSnapshot.length > 0
            ? branchSnapshot
            : (await loadCachedMedicines(pharmacyId)).medicines;
        return sortMedicinesBySearchRelevance(
          pool.filter((medicine) => medicineMatchesInventorySearch(medicine, query)),
          query,
        ).slice(0, limit);
      }
      if (branchSnapshot.length > 0 && branchSnapshot.length <= LARGE_MEDICINE_CATALOG) {
        return sortMedicinesBySearchRelevance(
          branchSnapshot.filter((medicine) => medicineMatchesInventorySearch(medicine, query)),
          query,
        ).slice(0, limit);
      }
      const rows = await searchInventoryMedicines(query, limit, true);
      if (rows.length > 0) void rememberForOffline(rows);
      return rows;
    },
    [branchReady, branchSnapshot, isOnline, pharmacyId, rememberForOffline],
  );

  const sellableCount = useMemo(
    () => branchSnapshot.filter((medicine) => medicine.qty > 0).length,
    [branchSnapshot],
  );

  return {
    rows,
    total,
    catalogTotal,
    page,
    pageSize: INVENTORY_PAGE_SIZE,
    loading,
    error,
    setPage,
    reload: loadPage,
    branchSnapshot,
    sellableCount,
    usesInventoryPagination,
    lookupBarcode,
    lookupSearch,
    branchReady,
  };
}
