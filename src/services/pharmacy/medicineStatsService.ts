import { supabase } from "../supabaseClient";

export type PharmacyMedicineStats = {
  total: number;
  lowStock: number;
  outOfStock: number;
  expiring: number;
  expired: number;
  inStock: number;
};

const EMPTY_STATS: PharmacyMedicineStats = {
  total: 0,
  lowStock: 0,
  outOfStock: 0,
  expiring: 0,
  expired: 0,
  inStock: 0,
};

function parseStatsPayload(data: unknown): PharmacyMedicineStats {
  if (!data || typeof data !== "object") return EMPTY_STATS;
  const row = data as Record<string, unknown>;
  return {
    total: Number(row.total ?? 0),
    lowStock: Number(row.low_stock ?? 0),
    outOfStock: Number(row.out_of_stock ?? 0),
    expiring: Number(row.expiring ?? 0),
    expired: Number(row.expired ?? 0),
    inStock: Number(row.in_stock ?? 0),
  };
}

async function fetchPharmacyMedicineCountFallback(pharmacyId: string): Promise<number> {
  const { data, error } = await supabase.rpc("count_pharmacy_medicines", {
    p_pharmacy_id: pharmacyId,
    p_search: null,
    p_stock_filter: "all",
    p_low_stock_threshold: 10,
    p_expiring_soon_days: 90,
    p_in_stock_only: false,
  });
  if (error) {
    console.error("count_pharmacy_medicines fallback error:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

export async function fetchPharmacyMedicineStats(
  pharmacyId: string,
  lowStockThreshold: number,
  expiringSoonDays: number,
): Promise<PharmacyMedicineStats> {
  const { data, error } = await supabase.rpc("pharmacy_medicine_stats", {
    p_pharmacy_id: pharmacyId,
    p_low_stock_threshold: lowStockThreshold,
    p_expiring_soon_days: expiringSoonDays,
  });

  if (error) {
    console.error("fetchPharmacyMedicineStats error:", error.message);
    const total = await fetchPharmacyMedicineCountFallback(pharmacyId);
    if (total > 0) {
      return { ...EMPTY_STATS, total };
    }
    return EMPTY_STATS;
  }

  const parsed = parseStatsPayload(data);
  if (parsed.total > 0) return parsed;

  // Stats RPC can return zeros while the catalog exists (auth/scope race). Prefer count.
  const total = await fetchPharmacyMedicineCountFallback(pharmacyId);
  if (total > 0) {
    return { ...parsed, total };
  }
  return parsed;
}

export async function fetchOrgMedicineStats(
  branchIds: string[],
  lowStockThreshold: number,
  expiringSoonDays: number,
): Promise<Record<string, PharmacyMedicineStats>> {
  const ids = [...new Set(branchIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const entries = await Promise.all(
    ids.map(async (branchId) => {
      const stats = await fetchPharmacyMedicineStats(
        branchId,
        lowStockThreshold,
        expiringSoonDays,
      );
      return [branchId, stats] as const;
    }),
  );

  return Object.fromEntries(entries);
}
