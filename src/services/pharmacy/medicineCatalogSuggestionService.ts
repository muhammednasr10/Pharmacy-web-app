import { supabase } from "../supabaseClient";
import type { Medicine } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";

export type MedicineCatalogSuggestionStatus = "pending" | "approved" | "rejected";

export type MedicineCatalogSuggestion = {
  id: string;
  pharmacyId: string;
  medicineId: string;
  medicineName_ar: string;
  medicineName_en: string;
  /** Catalog value at review time (الحالي = قاعدة الأدوية). */
  oldBarcode: string;
  newBarcode: string;
  oldBuyPrice: number | null;
  newBuyPrice: number | null;
  oldSellPrice: number | null;
  newSellPrice: number | null;
  status: MedicineCatalogSuggestionStatus;
  requestedById?: string | null;
  requestedByName?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

type CatalogBaseline = {
  barcode: string;
  buyPrice: number | null;
  sellPrice: number | null;
};

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function moneyEqual(a: number | null, b: number | null) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function textEqual(a: string, b: string) {
  return String(a || "").trim() === String(b || "").trim();
}

async function lookupCatalogBaseline(barcode: string): Promise<CatalogBaseline | null> {
  const code = String(barcode || "").trim();
  if (!code) return null;
  const { data, error } = await supabase
    .from("medicine_catalog_reference")
    .select("barcode,buy_price,price")
    .eq("barcode", code)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    barcode: String(data.barcode || "").trim(),
    buyPrice: numOrNull(data.buy_price),
    sellPrice: numOrNull(data.price),
  };
}

/** Real suggestion = proposed values differ from the shared medicine catalog. */
export function getCatalogSuggestionDiff(
  catalog: CatalogBaseline | null,
  next: Partial<Medicine>,
): {
  barcodeChanged: boolean;
  buyPriceChanged: boolean;
  sellPriceChanged: boolean;
  changed: boolean;
  current: CatalogBaseline;
} {
  const current: CatalogBaseline = catalog || {
    barcode: "",
    buyPrice: null,
    sellPrice: null,
  };
  const newBarcode = String(next.barcode || "").trim();
  const newBuy = numOrNull(next.buyPrice);
  const newSell = numOrNull(next.price);

  const barcodeChanged = Boolean(newBarcode) && !textEqual(current.barcode, newBarcode);
  const buyPriceChanged = newBuy != null && !moneyEqual(current.buyPrice, newBuy);
  const sellPriceChanged = newSell != null && !moneyEqual(current.sellPrice, newSell);

  return {
    barcodeChanged,
    buyPriceChanged,
    sellPriceChanged,
    changed: barcodeChanged || buyPriceChanged || sellPriceChanged,
    current,
  };
}

/** @deprecated kept for older imports/tests — compares against catalog only. */
export function getMedicineCatalogFieldChanges(
  _previous: Partial<Medicine> | null | undefined,
  next: Partial<Medicine>,
  catalog?: CatalogBaseline | null,
) {
  const diff = getCatalogSuggestionDiff(catalog || null, next);
  return {
    barcodeChanged: diff.barcodeChanged,
    buyPriceChanged: diff.buyPriceChanged,
    sellPriceChanged: diff.sellPriceChanged,
    changed: diff.changed,
    baseline: {
      barcode: diff.current.barcode,
      buyPrice: diff.current.buyPrice,
      sellPrice: diff.current.sellPrice,
    },
  };
}

function suggestionMatchesCatalog(
  row: MedicineCatalogSuggestion,
  catalog: CatalogBaseline | null,
): boolean {
  const current = catalog || { barcode: "", buyPrice: null, sellPrice: null };
  const barcodeIsChange =
    Boolean(row.newBarcode) && !textEqual(current.barcode || "", row.newBarcode || "");
  const buyIsChange =
    row.newBuyPrice != null && !moneyEqual(current.buyPrice, row.newBuyPrice);
  const sellIsChange =
    row.newSellPrice != null && !moneyEqual(current.sellPrice, row.newSellPrice);
  return !(barcodeIsChange || buyIsChange || sellIsChange);
}

async function autoDismissNoOpSuggestion(row: MedicineCatalogSuggestion): Promise<void> {
  await supabase
    .from("medicine_catalog_suggestions")
    .update({
      status: "rejected",
      review_note: "auto_dismissed_matches_catalog",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending");
}

export async function submitMedicineCatalogSuggestion(input: {
  pharmacyId: string;
  medicine: Medicine;
  previous?: Partial<Medicine> | null;
  requestedById?: string;
  requestedByName?: string;
}): Promise<MedicineCatalogSuggestion | null> {
  const pharmacyId = String(input.pharmacyId || "").trim();
  if (!pharmacyId || !input.medicine) return null;

  const catalog =
    (await lookupCatalogBaseline(String(input.previous?.barcode || ""))) ||
    (await lookupCatalogBaseline(String(input.medicine.barcode || "")));

  // Only create a suggestion when it would change the shared catalog.
  const diff = getCatalogSuggestionDiff(catalog, input.medicine);
  if (!diff.changed) return null;

  const payload = toSnakeCase({
    pharmacyId,
    medicineId: String(input.medicine.id),
    medicineName_ar: String(input.medicine.name_ar || "").trim(),
    medicineName_en: String(input.medicine.name_en || "").trim(),
    oldBarcode: diff.current.barcode,
    newBarcode: String(input.medicine.barcode || "").trim(),
    oldBuyPrice: diff.current.buyPrice,
    newBuyPrice: numOrNull(input.medicine.buyPrice),
    oldSellPrice: diff.current.sellPrice,
    newSellPrice: numOrNull(input.medicine.price),
    status: "pending",
    requestedById: input.requestedById || null,
    requestedByName: input.requestedByName || null,
  });

  const { data, error } = await supabase
    .from("medicine_catalog_suggestions")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toCamelCase<MedicineCatalogSuggestion>(data);
}

async function hydratePendingSuggestion(
  row: MedicineCatalogSuggestion,
): Promise<MedicineCatalogSuggestion | null> {
  const catalog =
    (await lookupCatalogBaseline(row.newBarcode)) ||
    (await lookupCatalogBaseline(row.oldBarcode));

  if (suggestionMatchesCatalog(row, catalog)) {
    await autoDismissNoOpSuggestion(row);
    return null;
  }

  return {
    ...row,
    // الحالي = live catalog (source of truth for approve).
    oldBarcode: catalog?.barcode || row.oldBarcode || "",
    oldBuyPrice: catalog?.buyPrice ?? row.oldBuyPrice ?? null,
    oldSellPrice: catalog?.sellPrice ?? row.oldSellPrice ?? null,
  };
}

export async function listPendingMedicineCatalogSuggestions(): Promise<MedicineCatalogSuggestion[]> {
  const { data, error } = await supabase
    .from("medicine_catalog_suggestions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []).map((row) => toCamelCase<MedicineCatalogSuggestion>(row));
  const hydrated = await Promise.all(rows.map((row) => hydratePendingSuggestion(row)));
  return hydrated.filter((row): row is MedicineCatalogSuggestion => Boolean(row));
}

export async function countPendingMedicineCatalogSuggestions(): Promise<number> {
  // Keep badge accurate: count only suggestions that still differ from catalog.
  const rows = await listPendingMedicineCatalogSuggestions();
  return rows.length;
}

export async function approveMedicineCatalogSuggestion(input: {
  suggestionId: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("approve_medicine_catalog_suggestion", {
    p_suggestion_id: input.suggestionId,
    p_reviewer_id: input.reviewerId || null,
    p_reviewer_name: input.reviewerName || null,
    p_review_note: input.reviewNote || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function rejectMedicineCatalogSuggestion(input: {
  suggestionId: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("reject_medicine_catalog_suggestion", {
    p_suggestion_id: input.suggestionId,
    p_reviewer_id: input.reviewerId || null,
    p_reviewer_name: input.reviewerName || null,
    p_review_note: input.reviewNote || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
