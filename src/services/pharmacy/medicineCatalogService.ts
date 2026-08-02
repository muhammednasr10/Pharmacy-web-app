import { supabase } from "../supabaseClient";
import { chunkCatalogRows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE } from "../../utils/medicineCatalogImport";

export async function clearPharmacyMedicineCatalog(pharmacyId: string): Promise<number> {
  const { data, error } = await supabase.rpc("clear_pharmacy_medicine_catalog", {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    if (error.message.includes("clear_pharmacy_medicine_catalog")) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }

  return Number(data || 0);
}

export async function importMedicineCatalogBatch(
  pharmacyId: string,
  rows: Array<{
    name_ar: string;
    name_en: string;
    barcode: string;
    qty: number;
    price: number;
    buy_price?: number;
    expiry: string;
  }>,
): Promise<number> {
  const { data, error } = await supabase.rpc("import_medicine_catalog_batch", {
    p_pharmacy_id: pharmacyId,
    p_rows: rows,
  });

  if (error) {
    if (error.message.includes("import_medicine_catalog_batch")) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }

  const payload = data as { inserted?: number } | null;
  return Number(payload?.inserted || 0);
}

export async function seedPharmacyFromCatalogReference(
  pharmacyId: string,
): Promise<{ deleted: number; inserted: number }> {
  const { data, error } = await supabase.rpc("seed_pharmacy_from_catalog_reference", {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    if (error.message.includes("seed_pharmacy_from_catalog_reference")) {
      throw new Error("catalog_reference_sql_required");
    }
    if (error.message.includes("catalog_reference_empty")) {
      throw new Error("catalog_reference_empty");
    }
    throw new Error(error.message);
  }

  const payload = data as { deleted?: number; inserted?: number } | null;
  return {
    deleted: Number(payload?.deleted || 0),
    inserted: Number(payload?.inserted || 0),
  };
}

export async function syncPharmacyFromCatalogReference(
  pharmacyId: string,
): Promise<{ updated: number; inserted: number }> {
  const { data, error } = await supabase.rpc("sync_pharmacy_from_catalog_reference", {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    if (error.message.includes("sync_pharmacy_from_catalog_reference")) {
      throw new Error("catalog_reference_sql_required");
    }
    if (error.message.includes("catalog_reference_empty")) {
      throw new Error("catalog_reference_empty");
    }
    throw new Error(error.message);
  }

  const payload = data as { updated?: number; inserted?: number } | null;
  return {
    updated: Number(payload?.updated || 0),
    inserted: Number(payload?.inserted || 0),
  };
}

export async function replacePharmacyMedicineCatalog(
  pharmacyId: string,
  rows: Array<{
    name_ar: string;
    name_en: string;
    barcode: string;
    qty: number;
    price: number;
    buy_price?: number;
    expiry: string;
  }>,
  onProgress?: (progress: { done: number; total: number; phase: "clearing" | "importing" }) => void,
): Promise<{ deleted: number; inserted: number }> {
  onProgress?.({ done: 0, total: rows.length, phase: "clearing" });
  const deleted = await clearPharmacyMedicineCatalog(pharmacyId);

  let inserted = 0;
  const chunks = chunkCatalogRows(rows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE);

  for (let index = 0; index < chunks.length; index += 1) {
    inserted += await importMedicineCatalogBatch(pharmacyId, chunks[index]);
    onProgress?.({
      done: Math.min(rows.length, (index + 1) * MEDICINE_CATALOG_IMPORT_BATCH_SIZE),
      total: rows.length,
      phase: "importing",
    });
  }

  return { deleted, inserted };
}
