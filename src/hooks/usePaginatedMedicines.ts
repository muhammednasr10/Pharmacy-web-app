import { useCallback, useEffect, useRef, useState } from "react";
import type { Medicine } from "../types";
import {
  fetchMedicinesPage,
  INVENTORY_PAGE_SIZE,
  type StockCatalogFilter,
} from "../services/pharmacy/inventoryPaginationService";
import { filterMedicinesForInventoryView } from "../utils/offlineMedicineFilters";
import { formatInventoryLoadError } from "../utils/inventorySearchErrors";
import { loadCachedMedicines, cacheMedicinesSnapshot } from "../utils/offlinePosStorage";

type UsePaginatedMedicinesOptions = {
  enabled?: boolean;
  pageSize?: number;
  search?: string;
  stockFilter?: StockCatalogFilter;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  refreshKey?: number;
  isOfflineMode?: boolean;
  offlineMedicines?: Medicine[];
  pharmacyId?: string;
  isArabic?: boolean;
};

function filterOfflinePage(
  source: Medicine[],
  options: {
    pharmacyId?: string;
    search?: string;
    stockFilter?: StockCatalogFilter;
    lowStockThreshold?: number;
    expiringSoonDays?: number;
    page: number;
    pageSize: number;
  },
) {
  const filtered = filterMedicinesForInventoryView(source, {
    pharmacyId: options.pharmacyId,
    search: options.search,
    stockFilter: options.stockFilter,
    lowStockThreshold: options.lowStockThreshold,
    expiringSoonDays: options.expiringSoonDays,
  });
  const maxPage = Math.max(1, Math.ceil(filtered.length / options.pageSize) || 1);
  const safePage = Math.min(options.page, maxPage);
  const start = (safePage - 1) * options.pageSize;
  return {
    rows: filtered.slice(start, start + options.pageSize),
    total: filtered.length,
    page: safePage,
    maxPage,
  };
}

export function usePaginatedMedicines({
  enabled = true,
  pageSize = INVENTORY_PAGE_SIZE,
  search = "",
  stockFilter = "all",
  lowStockThreshold = 10,
  expiringSoonDays = 90,
  refreshKey = 0,
  isOfflineMode = false,
  offlineMedicines = [],
  pharmacyId,
  isArabic = true,
}: UsePaginatedMedicinesOptions) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSourceCount, setOfflineSourceCount] = useState(offlineMedicines.length);
  const offlineSourceRef = useRef<Medicine[]>(offlineMedicines);
  const requestId = useRef(0);

  useEffect(() => {
    offlineSourceRef.current = offlineMedicines;
    setOfflineSourceCount(offlineMedicines.length);
  }, [offlineMedicines]);

  useEffect(() => {
    if (!pharmacyId || offlineMedicines.length > 0) return;

    let cancelled = false;
    void loadCachedMedicines(pharmacyId).then(({ medicines }) => {
      if (cancelled || medicines.length === 0) return;
      offlineSourceRef.current = medicines;
      setOfflineSourceCount(medicines.length);
    });

    return () => {
      cancelled = true;
    };
  }, [pharmacyId, offlineMedicines.length]);

  useEffect(() => {
    setPage(1);
  }, [search, stockFilter, lowStockThreshold, expiringSoonDays, pageSize, isOfflineMode]);

  const mergeOfflineCache = useCallback(
    async (incoming: Medicine[]) => {
      if (!pharmacyId || incoming.length === 0) return;
      const { medicines: cached } = await loadCachedMedicines(pharmacyId);
      const merged = new Map<number, Medicine>();
      for (const medicine of cached) merged.set(medicine.id, medicine);
      for (const medicine of incoming) merged.set(medicine.id, medicine);
      const next = Array.from(merged.values()).slice(0, 2000);
      offlineSourceRef.current = next;
      setOfflineSourceCount(next.length);
      void cacheMedicinesSnapshot(pharmacyId, next);
    },
    [pharmacyId],
  );

  const load = useCallback(async () => {
    if (!enabled && !isOfflineMode) return;

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      if (isOfflineMode) {
        const offlineResult = filterOfflinePage(offlineSourceRef.current, {
          pharmacyId,
          search,
          stockFilter,
          lowStockThreshold,
          expiringSoonDays,
          page,
          pageSize,
        });
        if (currentRequest !== requestId.current) return;
        if (offlineResult.page !== page) {
          setPage(offlineResult.page);
          return;
        }
        setRows(offlineResult.rows);
        setTotal(offlineResult.total);
        return;
      }

      const result = await fetchMedicinesPage({
        page,
        pageSize,
        search,
        stockFilter,
        lowStockThreshold,
        expiringSoonDays,
      });

      if (currentRequest !== requestId.current) return;

      const maxPage = Math.max(1, Math.ceil(result.total / pageSize) || 1);
      const safePage = Math.min(page, maxPage);
      if (safePage !== page) {
        setPage(safePage);
        return;
      }

      setRows(result.rows);
      setTotal(result.total);
      void mergeOfflineCache(result.rows);
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;

      if (offlineSourceRef.current.length > 0) {
        const offlineResult = filterOfflinePage(offlineSourceRef.current, {
          pharmacyId,
          search,
          stockFilter,
          lowStockThreshold,
          expiringSoonDays,
          page,
          pageSize,
        });
        if (offlineResult.page !== page) {
          setPage(offlineResult.page);
          return;
        }
        setRows(offlineResult.rows);
        setTotal(offlineResult.total);
        setError(null);
        return;
      }

      setError(formatInventoryLoadError(loadError, isArabic));
      setRows([]);
      setTotal(0);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [
    enabled,
    isOfflineMode,
    mergeOfflineCache,
    pharmacyId,
    page,
    pageSize,
    search,
    stockFilter,
    lowStockThreshold,
    expiringSoonDays,
    isArabic,
  ]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return {
    rows,
    total,
    page,
    pageSize,
    loading,
    error,
    setPage,
    reload: load,
    offlineSourceCount,
  };
}
