import { supabase } from "../supabaseClient";
import type { Medicine } from "../../types";
import { getAllRows, createManagedRealtimeChannel, disposeManagedRealtimeChannel } from "./dbHelpers";
import { setActivePharmacy, getActivePharmacy, resolveReadPharmacyId } from "./scope";
import {
  LARGE_MEDICINE_CATALOG,
  MEDICINES_REALTIME_REFETCH_MS,
} from "../../constants/medicineCatalog";

async function countMedicinesForPharmacy(pharmacyId: string): Promise<number | null> {
  if (!pharmacyId) return null;
  const { data, error } = await supabase.rpc("count_pharmacy_medicines", {
    p_pharmacy_id: pharmacyId,
    p_search: null,
    p_stock_filter: "all",
    p_low_stock_threshold: 10,
    p_expiring_soon_days: 90,
    p_in_stock_only: false,
  });
  if (error) return null;
  return Number(data ?? 0);
}

async function shouldSkipBulkMedicineLoad(pharmacyId: string): Promise<boolean> {
  const count = await countMedicinesForPharmacy(pharmacyId);
  if (count !== null) return count > LARGE_MEDICINE_CATALOG;
  // Avoid loading the full catalog when count RPC is unavailable (prevents statement timeout).
  return true;
}

export async function getMedicines(): Promise<Medicine[]> {
  const pharmacyId = resolveReadPharmacyId();
  if (pharmacyId && (await shouldSkipBulkMedicineLoad(pharmacyId))) {
    return [];
  }
  return getAllRows<Medicine>("medicines", "id", false, undefined, { pharmacyScoped: true });
}

export async function getMedicinesForPharmacy(pharmacyId: string): Promise<Medicine[]> {
  if (await shouldSkipBulkMedicineLoad(pharmacyId)) {
    return [];
  }
  return getAllRows<Medicine>("medicines", "id", false, undefined, {
    filter: { column: "pharmacy_id", value: pharmacyId },
  });
}

export async function getMedicinesForPharmacies(pharmacyIds: string[]): Promise<Medicine[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getMedicines();
  if (ids.length === 1) return getMedicinesForPharmacy(ids[0]);

  const counts = await Promise.all(ids.map((id) => countMedicinesForPharmacy(id)));
  if (counts.some((count) => count !== null && count > LARGE_MEDICINE_CATALOG)) {
    return [];
  }

  return getAllRows<Medicine>("medicines", "id", false, undefined, {
    inFilter: { column: "pharmacy_id", values: ids },
  });
}

export async function runWithPharmacyScope<T>(
  pharmacyId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = getActivePharmacy();
  setActivePharmacy(pharmacyId);
  try {
    return await fn();
  } finally {
    setActivePharmacy(previous);
  }
}

export function subscribeMedicines(callback: (medicines: Medicine[]) => void) {
  let refetchTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRefetch = () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(() => {
      refetchTimer = null;
      void getMedicines().then(callback);
    }, MEDICINES_REALTIME_REFETCH_MS);
  };

  const channelName = "realtime-medicines";
  const channel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "medicines" },
    scheduleRefetch,
  );

  void channel.subscribe();

  return () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    disposeManagedRealtimeChannel(channel);
  };
}
