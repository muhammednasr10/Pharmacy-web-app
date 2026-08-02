import { useCallback, useEffect, useRef, useState } from "react";
import type { StockMovement } from "../types";
import {
  fetchStockMovementsPage,
  MOVEMENTS_PAGE_SIZE,
} from "../services/pharmacy/inventoryPaginationService";

type UsePaginatedStockMovementsOptions = {
  enabled?: boolean;
  pageSize?: number;
  search?: string;
  typeFilter?: string;
  fromDate?: string;
  toDate?: string;
  refreshKey?: number;
};

export function usePaginatedStockMovements({
  enabled = true,
  pageSize = MOVEMENTS_PAGE_SIZE,
  search = "",
  typeFilter = "all",
  fromDate = "",
  toDate = "",
  refreshKey = 0,
}: UsePaginatedStockMovementsOptions) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, fromDate, toDate, pageSize]);

  const load = useCallback(async () => {
    if (!enabled) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchStockMovementsPage({
        page,
        pageSize,
        search,
        typeFilter,
        fromDate,
        toDate,
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
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setRows([]);
      setTotal(0);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [enabled, page, pageSize, search, typeFilter, fromDate, toDate]);

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
