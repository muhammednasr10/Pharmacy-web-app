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

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getMedicineCatalogFieldChanges(
  previous: Partial<Medicine> | null | undefined,
  next: Partial<Medicine>,
): {
  barcodeChanged: boolean;
  buyPriceChanged: boolean;
  sellPriceChanged: boolean;
  changed: boolean;
} {
  const oldBarcode = String(previous?.barcode || "").trim();
  const newBarcode = String(next.barcode || "").trim();
  const oldBuy = numOrNull(previous?.buyPrice);
  const newBuy = numOrNull(next.buyPrice);
  const oldSell = numOrNull(previous?.price);
  const newSell = numOrNull(next.price);

  const barcodeChanged = Boolean(newBarcode) && oldBarcode !== newBarcode;
  const buyPriceChanged = newBuy != null && oldBuy !== newBuy;
  const sellPriceChanged = newSell != null && oldSell !== newSell;

  return {
    barcodeChanged,
    buyPriceChanged,
    sellPriceChanged,
    changed: barcodeChanged || buyPriceChanged || sellPriceChanged,
  };
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

  const changes = getMedicineCatalogFieldChanges(input.previous, input.medicine);
  if (!changes.changed) return null;

  const payload = toSnakeCase({
    pharmacyId,
    medicineId: String(input.medicine.id),
    medicineName_ar: String(input.medicine.name_ar || "").trim(),
    medicineName_en: String(input.medicine.name_en || "").trim(),
    oldBarcode: String(input.previous?.barcode || "").trim(),
    newBarcode: String(input.medicine.barcode || "").trim(),
    oldBuyPrice: numOrNull(input.previous?.buyPrice),
    newBuyPrice: numOrNull(input.medicine.buyPrice),
    oldSellPrice: numOrNull(input.previous?.price),
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

export async function listPendingMedicineCatalogSuggestions(): Promise<MedicineCatalogSuggestion[]> {
  const { data, error } = await supabase
    .from("medicine_catalog_suggestions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toCamelCase<MedicineCatalogSuggestion>(row));
}

export async function countPendingMedicineCatalogSuggestions(): Promise<number> {
  const { count, error } = await supabase
    .from("medicine_catalog_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return count || 0;
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
