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

type UsePosInventorySourceOptions = {
  pharmacyId: string;
  enabled?: boolean;
  search?: string;
  refreshKey?: number;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
};

export function usePosInventorySource({
  pharmacyId,
  enabled = true,
  search = "",
  refreshKey = 0,
  lowStockThreshold = 10,
  expiringSoonDays = 90,
}: UsePosInventorySourceOptions) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchSnapshot, setBranchSnapshot] = useState<Medicine[]>([]);

  const trimmedSearch = search.trim();
  const branchReady = enabled && Boolean(pharmacyId) && !isAllBranchesMode(pharmacyId);
  const usesInventoryPagination = catalogTotal > LARGE_MEDICINE_CATALOG || total > LARGE_MEDICINE_CATALOG;

  useEffect(() => {
    setPage(1);
  }, [trimmedSearch, pharmacyId, lowStockThreshold, expiringSoonDays]);

  const loadPage = useCallback(async () => {
    if (!branchReady) {
      setRows([]);
      setTotal(0);
      setCatalogTotal(0);
      setError(null);
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
        }),
        trimmedSearch
          ? Promise.resolve(null)
          : fetchMedicinesPage({
              page: 1,
              pageSize: 1,
              stockFilter: "all",
              lowStockThreshold,
              expiringSoonDays,
            }),
      ]);

      setRows(pageResult.rows);
      setTotal(pageResult.total);
      if (allCountResult) {
        setCatalogTotal(allCountResult.total);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [branchReady, page, trimmedSearch, lowStockThreshold, expiringSoonDays]);

  useEffect(() => {
    void loadPage();
  }, [loadPage, refreshKey]);

  useEffect(() => {
    if (!branchReady) {
      setBranchSnapshot([]);
      return;
    }

    let cancelled = false;
    void pharmacyService.getMedicinesForPharmacy(pharmacyId).then((medicines) => {
      if (!cancelled) setBranchSnapshot(medicines);
    });

    return () => {
      cancelled = true;
    };
  }, [branchReady, pharmacyId, refreshKey]);

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      if (!branchReady) return null;
      const fromServer = await lookupInventoryMedicineByBarcode(barcode);
      if (fromServer) return fromServer;
      return branchSnapshot.find((medicine) => medicine.barcode === barcode.trim()) || null;
    },
    [branchReady, branchSnapshot],
  );

  const lookupSearch = useCallback(
    async (query: string, limit = 8) => {
      if (!branchReady) return [];
      if (branchSnapshot.length > 0 && branchSnapshot.length <= LARGE_MEDICINE_CATALOG) {
        const value = query.trim().toLowerCase();
        return branchSnapshot
          .filter((medicine) => {
            const haystack = [medicine.name_ar, medicine.name_en, medicine.barcode]
              .join(" ")
              .toLowerCase();
            return haystack.includes(value);
          })
          .slice(0, limit);
      }
      return searchInventoryMedicines(query, limit, true);
    },
    [branchReady, branchSnapshot],
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
