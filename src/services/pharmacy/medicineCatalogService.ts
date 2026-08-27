import { supabase } from "../supabaseClient";
import { chunkCatalogRows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE } from "../../utils/medicineCatalogImport";

const CATALOG_REFERENCE_PAGE_SIZE = 400;

export type CatalogImportProgress = {
  done: number;
  total: number;
  phase: "clearing" | "importing";
};

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

type CatalogPageResult = {
  inserted: number;
  updated: number;
  lastId: number;
  done: boolean;
};

function parseCatalogPage(data: unknown): CatalogPageResult {
  const payload = (data || {}) as {
    inserted?: number;
    updated?: number;
    last_id?: number;
    done?: boolean;
  };
  return {
    inserted: Number(payload.inserted || 0),
    updated: Number(payload.updated || 0),
    lastId: Number(payload.last_id || 0),
    done: Boolean(payload.done),
  };
}

async function seedPharmacyFromCatalogReferencePage(
  pharmacyId: string,
  afterId: number,
  limit = CATALOG_REFERENCE_PAGE_SIZE,
): Promise<CatalogPageResult> {
  const { data, error } = await supabase.rpc("seed_pharmacy_from_catalog_reference_page", {
    p_pharmacy_id: pharmacyId,
    p_after_id: afterId,
    p_limit: limit,
  });

  if (error) {
    if (error.message.includes("seed_pharmacy_from_catalog_reference_page")) {
      throw new Error("catalog_reference_sql_required");
    }
    throw new Error(error.message);
  }

  return parseCatalogPage(data);
}

async function syncPharmacyFromCatalogReferencePage(
  pharmacyId: string,
  afterId: number,
  limit = CATALOG_REFERENCE_PAGE_SIZE,
): Promise<CatalogPageResult> {
  const { data, error } = await supabase.rpc("sync_pharmacy_from_catalog_reference_page", {
    p_pharmacy_id: pharmacyId,
    p_after_id: afterId,
    p_limit: limit,
  });

  if (error) {
    if (error.message.includes("sync_pharmacy_from_catalog_reference_page")) {
      throw new Error("catalog_reference_sql_required");
    }
    throw new Error(error.message);
  }

  return parseCatalogPage(data);
}

export async function seedPharmacyFromCatalogReference(
  pharmacyId: string,
  onProgress?: (progress: CatalogImportProgress) => void,
): Promise<{ deleted: number; inserted: number }> {
  const stats = await fetchMedicineCatalogReferenceStats();
  if (stats.total <= 0) {
    throw new Error("catalog_reference_empty");
  }

  onProgress?.({ done: 0, total: stats.total, phase: "clearing" });
  const deleted = await clearPharmacyMedicineCatalog(pharmacyId);

  let inserted = 0;
  let afterId = 0;
  let guard = 0;

  onProgress?.({ done: 0, total: stats.total, phase: "importing" });

  while (guard < 500) {
    guard += 1;
    const page = await seedPharmacyFromCatalogReferencePage(pharmacyId, afterId);
    inserted += page.inserted;
    afterId = page.lastId;
    onProgress?.({
      done: Math.min(stats.total, inserted),
      total: stats.total,
      phase: "importing",
    });
    if (page.done) break;
  }

  return { deleted, inserted };
}

export async function syncPharmacyFromCatalogReference(
  pharmacyId: string,
  onProgress?: (progress: CatalogImportProgress) => void,
): Promise<{ updated: number; inserted: number }> {
  const stats = await fetchMedicineCatalogReferenceStats();
  if (stats.total <= 0) {
    throw new Error("catalog_reference_empty");
  }

  let updated = 0;
  let inserted = 0;
  let afterId = 0;
  let guard = 0;
  let processed = 0;

  onProgress?.({ done: 0, total: stats.total, phase: "importing" });

  while (guard < 500) {
    guard += 1;
    const page = await syncPharmacyFromCatalogReferencePage(pharmacyId, afterId);
    updated += page.updated;
    inserted += page.inserted;
    afterId = page.lastId;
    processed = Math.min(stats.total, processed + CATALOG_REFERENCE_PAGE_SIZE);
    onProgress?.({
      done: page.done ? stats.total : processed,
      total: stats.total,
      phase: "importing",
    });
    if (page.done) break;
  }

  return { updated, inserted };
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
  onProgress?: (progress: CatalogImportProgress) => void,
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

export type MedicineCatalogReferenceStats = {
  total: number;
  updatedAt: string | null;
};

export async function fetchMedicineCatalogReferenceStats(): Promise<MedicineCatalogReferenceStats> {
  const { data, error } = await supabase.rpc("get_medicine_catalog_reference_stats");

  if (error) {
    if (error.message.includes("get_medicine_catalog_reference_stats")) {
      throw new Error("catalog_reference_sql_required");
    }
    throw new Error(error.message);
  }

  const payload = data as { total?: number; updated_at?: string | null } | null;
  return {
    total: Number(payload?.total ?? 0),
    updatedAt: payload?.updated_at ?? null,
  };
}
