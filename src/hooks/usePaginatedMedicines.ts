import { useCallback, useEffect, useRef, useState } from "react";
import type { Medicine } from "../types";
import {
  fetchMedicinesPage,
  INVENTORY_PAGE_SIZE,
  type StockCatalogFilter,
} from "../services/pharmacy/inventoryPaginationService";
import { filterMedicinesForInventoryView } from "../utils/offlineMedicineFilters";

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
};

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
}: UsePaginatedMedicinesOptions) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [search, stockFilter, lowStockThreshold, expiringSoonDays, pageSize, isOfflineMode]);

  const load = useCallback(async () => {
    if (!enabled && !isOfflineMode) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      if (isOfflineMode) {
        const filtered = filterMedicinesForInventoryView(offlineMedicines, {
          pharmacyId,
          search,
          stockFilter,
          lowStockThreshold,
          expiringSoonDays,
        });
        const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
        const safePage = Math.min(page, maxPage);
        if (safePage !== page) {
          setPage(safePage);
          return;
        }
        const start = (safePage - 1) * pageSize;
        if (currentRequest !== requestId.current) return;
        setRows(filtered.slice(start, start + pageSize));
        setTotal(filtered.length);
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
      if (page > maxPage) {
        setPage(maxPage);
        return;
      }

      setRows(result.rows);
      setTotal(result.total);
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      if (offlineMedicines.length > 0) {
        const filtered = filterMedicinesForInventoryView(offlineMedicines, {
          pharmacyId,
          search,
          stockFilter,
          lowStockThreshold,
          expiringSoonDays,
        });
        const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
        const safePage = Math.min(page, maxPage);
        const start = (safePage - 1) * pageSize;
        setRows(filtered.slice(start, start + pageSize));
        setTotal(filtered.length);
        setError(null);
        return;
      }
      setError(loadError instanceof Error ? loadError.message : String(loadError));
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
    offlineMedicines,
    pharmacyId,
    page,
    pageSize,
    search,
    stockFilter,
    lowStockThreshold,
    expiringSoonDays,
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
  };
}
