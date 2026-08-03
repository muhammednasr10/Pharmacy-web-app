import { useEffect, useState } from "react";
import {
  fetchOrgMedicineStats,
  fetchPharmacyMedicineStats,
  type PharmacyMedicineStats,
} from "../services/pharmacy/medicineStatsService";
import {
  getExpiringSoonDays,
  getLowStockThreshold,
} from "../utils/inventoryAlerts";
import type { PharmacySettings } from "../types";

const EMPTY_STATS: PharmacyMedicineStats = {
  total: 0,
  lowStock: 0,
  outOfStock: 0,
  expiring: 0,
  expired: 0,
  inStock: 0,
};

type UseMedicineCatalogStatsOptions = {
  pharmacyId: string;
  branches: Array<{ id: string }>;
  pharmacySettings: PharmacySettings | null;
  showOrgStats: boolean;
  refreshKey?: number;
};

export function useMedicineCatalogStats({
  pharmacyId,
  branches,
  pharmacySettings,
  showOrgStats,
  refreshKey = 0,
}: UseMedicineCatalogStatsOptions) {
  const [scopedStats, setScopedStats] = useState<PharmacyMedicineStats>(EMPTY_STATS);
  const [branchStats, setBranchStats] = useState<Record<string, PharmacyMedicineStats>>({});

  const lowStockThreshold = getLowStockThreshold(pharmacySettings);
  const expiringSoonDays = getExpiringSoonDays(pharmacySettings);

  useEffect(() => {
    if (!pharmacyId) {
      setScopedStats(EMPTY_STATS);
      return;
    }

    let cancelled = false;
    void fetchPharmacyMedicineStats(pharmacyId, lowStockThreshold, expiringSoonDays).then(
      (stats) => {
        if (!cancelled) setScopedStats(stats);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [pharmacyId, lowStockThreshold, expiringSoonDays, refreshKey]);

  useEffect(() => {
    if (!showOrgStats || branches.length === 0) {
      setBranchStats({});
      return;
    }

    let cancelled = false;
    void fetchOrgMedicineStats(
      branches.map((branch) => branch.id),
      lowStockThreshold,
      expiringSoonDays,
    ).then((stats) => {
      if (!cancelled) setBranchStats(stats);
    });

    return () => {
      cancelled = true;
    };
  }, [showOrgStats, branches, lowStockThreshold, expiringSoonDays, refreshKey]);

  return {
    scopedStats,
    branchStats,
    lowStockThreshold,
    expiringSoonDays,
  };
}
