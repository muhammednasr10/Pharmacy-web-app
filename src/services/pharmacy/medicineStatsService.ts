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
    return EMPTY_STATS;
  }

  return parseStatsPayload(data);
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
