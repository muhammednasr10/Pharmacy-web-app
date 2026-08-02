import { supabase } from "../supabaseClient";
import type { Medicine } from "../../types";
import { getAllRows } from "./dbHelpers";
import { setActivePharmacy, getActivePharmacy } from "./scope";
import { MEDICINES_REALTIME_REFETCH_MS } from "../../constants/medicineCatalog";

export async function getMedicines(): Promise<Medicine[]> {
  return getAllRows<Medicine>("medicines", "id", false, undefined, { pharmacyScoped: true });
}

export async function getMedicinesForPharmacy(pharmacyId: string): Promise<Medicine[]> {
  return getAllRows<Medicine>("medicines", "id", false, undefined, {
    filter: { column: "pharmacy_id", value: pharmacyId },
  });
}

export async function getMedicinesForPharmacies(pharmacyIds: string[]): Promise<Medicine[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getMedicines();
  if (ids.length === 1) return getMedicinesForPharmacy(ids[0]);

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

  const channel = supabase
    .channel("realtime-medicines")
    .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, scheduleRefetch);

  void channel.subscribe();

  return () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    void channel.unsubscribe();
  };
}
