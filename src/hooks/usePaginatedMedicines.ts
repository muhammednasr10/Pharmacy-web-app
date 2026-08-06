import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Medicine } from "../types";
import {
  fetchMedicinesPage,
  INVENTORY_PAGE_SIZE,
  type StockCatalogFilter,
} from "../services/pharmacy/inventoryPaginationService";
import { pharmacyQueryKeys } from "../queries/queryKeys";
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
  const [offlineRows, setOfflineRows] = useState<Medicine[]>([]);
  const [offlineTotal, setOfflineTotal] = useState(0);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineSourceCount, setOfflineSourceCount] = useState(offlineMedicines.length);
  const offlineSourceRef = useRef<Medicine[]>(offlineMedicines);

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

  const pageQueryKey = useMemo(
    () =>
      pharmacyQueryKeys.medicinesPage({
        page,
        pageSize,
        search,
        stockFilter,
        lowStockThreshold,
        expiringSoonDays,
        pharmacyId,
        refreshKey,
      }),
    [
      page,
      pageSize,
      search,
      stockFilter,
      lowStockThreshold,
      expiringSoonDays,
      pharmacyId,
      refreshKey,
    ],
  );

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

  const onlineQuery = useQuery({
    queryKey: pageQueryKey,
    enabled: enabled && !isOfflineMode,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await fetchMedicinesPage({
        page,
        pageSize,
        search,
        stockFilter,
        lowStockThreshold,
        expiringSoonDays,
      });
      void mergeOfflineCache(result.rows);
      return result;
    },
  });

  useEffect(() => {
    if (!onlineQuery.data || isOfflineMode) return;
    const maxPage = Math.max(1, Math.ceil(onlineQuery.data.total / pageSize) || 1);
    if (page > maxPage) setPage(maxPage);
  }, [onlineQuery.data, isOfflineMode, page, pageSize]);

  useEffect(() => {
    if (!isOfflineMode && !enabled) return;

    let cancelled = false;
    setOfflineLoading(true);
    setOfflineError(null);

    try {
      const offlineResult = filterOfflinePage(offlineSourceRef.current, {
        pharmacyId,
        search,
        stockFilter,
        lowStockThreshold,
        expiringSoonDays,
        page,
        pageSize,
      });
      if (cancelled) return;
      if (offlineResult.page !== page) {
        setPage(offlineResult.page);
        return;
      }
      setOfflineRows(offlineResult.rows);
      setOfflineTotal(offlineResult.total);
    } catch (loadError) {
      if (cancelled) return;
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
        setOfflineRows(offlineResult.rows);
        setOfflineTotal(offlineResult.total);
        setOfflineError(null);
        return;
      }
      setOfflineError(formatInventoryLoadError(loadError, isArabic));
      setOfflineRows([]);
      setOfflineTotal(0);
    } finally {
      if (!cancelled) setOfflineLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    isOfflineMode,
    isArabic,
    page,
    pageSize,
    pharmacyId,
    search,
    stockFilter,
    lowStockThreshold,
    expiringSoonDays,
    refreshKey,
  ]);

  const rows = isOfflineMode ? offlineRows : (onlineQuery.data?.rows ?? []);
  const total = isOfflineMode ? offlineTotal : (onlineQuery.data?.total ?? 0);
  const loading = isOfflineMode ? offlineLoading : onlineQuery.isFetching;
  const error = isOfflineMode
    ? offlineError
    : onlineQuery.error
      ? formatInventoryLoadError(onlineQuery.error, isArabic)
      : null;

  const reload = useCallback(async () => {
    if (isOfflineMode) return;
    await onlineQuery.refetch();
  }, [isOfflineMode, onlineQuery]);

  return {
    rows,
    total,
    page,
    pageSize,
    loading,
    error,
    setPage,
    reload,
    offlineSourceCount,
  };
}
