import { supabase } from "../supabaseClient";
import type { Medicine } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import {
  countOpenPurchaseRequests,
  listLocalPurchaseRequests,
  removeLocalPurchaseRequest,
  updateLocalPurchaseRequest,
  upsertLocalPurchaseRequest,
  type PurchaseRequestItem,
  type PurchaseRequestStatus,
} from "../../utils/purchaseRequests";
import { suggestReorderQty } from "../../utils/reorderSuggestions";
import type { ReorderPurchaseDraft } from "../../utils/reorderSuggestions";

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("pharmacy_purchase_requests") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find"))
  );
}

function normalizeRow(row: PurchaseRequestItem): PurchaseRequestItem {
  return {
    ...row,
    id: String(row.id),
    pharmacyId: String(row.pharmacyId || ""),
    medicineId: Number(row.medicineId) || 0,
    barcode: String(row.barcode || ""),
    name_ar: String(row.name_ar || ""),
    name_en: String(row.name_en || ""),
    currentQty: Number(row.currentQty) || 0,
    requestedQty: Math.max(1, Number(row.requestedQty) || 1),
    requestCount: Math.max(1, Number(row.requestCount) || 1),
    buyPrice: Number(row.buyPrice) || 0,
    sellPrice: Number(row.sellPrice) || 0,
    expiry: String(row.expiry || ""),
    note: String(row.note || ""),
    status: (["open", "ordered", "done", "cancelled"].includes(String(row.status))
      ? row.status
      : "open") as PurchaseRequestStatus,
    createdAt: String(row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updatedAt || row.createdAt || new Date().toISOString()),
    createdByName: row.createdByName ? String(row.createdByName) : undefined,
  };
}

export async function listPurchaseRequests(
  pharmacyId: string,
  status: PurchaseRequestStatus | "all" = "open",
): Promise<PurchaseRequestItem[]> {
  if (!pharmacyId) return [];

  let query = supabase
    .from("pharmacy_purchase_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("request_count", { ascending: false })
    .order("updated_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) {
      return listLocalPurchaseRequests(pharmacyId, status);
    }
    throw new Error(error.message);
  }

  return (data || []).map((row) =>
    normalizeRow(toCamelCase<PurchaseRequestItem>(row as Record<string, unknown>)),
  );
}

export async function countPurchaseRequests(pharmacyId: string): Promise<number> {
  if (!pharmacyId) return 0;
  const { count, error } = await supabase
    .from("pharmacy_purchase_requests")
    .select("id", { count: "exact", head: true })
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "open");

  if (error) {
    if (isMissingTableError(error.message)) {
      return countOpenPurchaseRequests(pharmacyId);
    }
    throw new Error(error.message);
  }
  return count || 0;
}

export async function addMedicineToPurchaseRequests(params: {
  pharmacyId: string;
  medicine: Medicine;
  createdBy?: string;
  createdByName?: string;
  note?: string;
  lowStockThreshold?: number;
}): Promise<PurchaseRequestItem> {
  const { pharmacyId, medicine } = params;
  const local = upsertLocalPurchaseRequest({
    pharmacyId,
    medicine,
    note: params.note,
    createdByName: params.createdByName,
    lowStockThreshold: params.lowStockThreshold,
  });

  const now = new Date().toISOString();
  const suggested = suggestReorderQty(
    Number(medicine.qty) || 0,
    params.lowStockThreshold ?? 10,
  );

  // Prefer updating an existing open row for the same medicine/barcode.
  const { data: existingRows, error: existingError } = await supabase
    .from("pharmacy_purchase_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("status", "open")
    .or(
      [
        `medicine_id.eq.${Number(medicine.id) || 0}`,
        medicine.barcode ? `barcode.eq.${medicine.barcode}` : null,
      ]
        .filter(Boolean)
        .join(","),
    )
    .limit(1);

  if (existingError) {
    if (isMissingTableError(existingError.message)) return local;
    // Fall through to insert attempt with local already saved.
  }

  const existing = existingRows?.[0]
    ? normalizeRow(toCamelCase<PurchaseRequestItem>(existingRows[0] as Record<string, unknown>))
    : null;

  if (existing) {
    const payload = toSnakeCase({
      currentQty: Number(medicine.qty) || 0,
      requestedQty: Math.max(existing.requestedQty, suggested),
      requestCount: existing.requestCount + 1,
      buyPrice: Number(medicine.buyPrice) || existing.buyPrice,
      sellPrice: Number(medicine.price) || existing.sellPrice,
      expiry: medicine.expiry || existing.expiry || "",
      note: params.note?.trim() || existing.note,
      updatedAt: now,
      createdByName: params.createdByName || existing.createdByName,
    });
    const { data, error } = await supabase
      .from("pharmacy_purchase_requests")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    if (error) {
      if (isMissingTableError(error.message)) return local;
      throw new Error(error.message);
    }
    return data
      ? normalizeRow(toCamelCase<PurchaseRequestItem>(data as Record<string, unknown>))
      : local;
  }

  const insertPayload = toSnakeCase({
    id: Date.now(),
    pharmacyId,
    medicineId: Number(medicine.id) || null,
    barcode: medicine.barcode || "",
    name_ar: medicine.name_ar || "",
    name_en: medicine.name_en || "",
    currentQty: Number(medicine.qty) || 0,
    requestedQty: Math.max(1, suggested),
    requestCount: 1,
    buyPrice: Number(medicine.buyPrice) || 0,
    sellPrice: Number(medicine.price) || 0,
    expiry: medicine.expiry || "",
    note: params.note?.trim() || "",
    status: "open",
    createdBy: params.createdBy || null,
    createdByName: params.createdByName || null,
    createdAt: now,
    updatedAt: now,
  });

  const { data, error } = await supabase
    .from("pharmacy_purchase_requests")
    .insert([insertPayload])
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) return local;
    throw new Error(error.message);
  }

  return data
    ? normalizeRow(toCamelCase<PurchaseRequestItem>(data as Record<string, unknown>))
    : local;
}

export async function updatePurchaseRequest(
  pharmacyId: string,
  id: string,
  updates: Partial<
    Pick<PurchaseRequestItem, "requestedQty" | "note" | "status" | "currentQty">
  >,
): Promise<void> {
  updateLocalPurchaseRequest(pharmacyId, id, updates);
  const { error } = await supabase
    .from("pharmacy_purchase_requests")
    .update(
      toSnakeCase({
        ...updates,
        updatedAt: new Date().toISOString(),
      }),
    )
    .eq("id", id)
    .eq("pharmacy_id", pharmacyId);

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }
}

export async function deletePurchaseRequest(pharmacyId: string, id: string): Promise<void> {
  removeLocalPurchaseRequest(pharmacyId, id);
  const { error } = await supabase
    .from("pharmacy_purchase_requests")
    .delete()
    .eq("id", id)
    .eq("pharmacy_id", pharmacyId);

  if (error && !isMissingTableError(error.message)) {
    throw new Error(error.message);
  }
}

export function purchaseRequestsToDraft(
  items: PurchaseRequestItem[],
  branchId: string,
): ReorderPurchaseDraft {
  return {
    branchId,
    notes: `Purchase requests — ${items.length} items`,
    items: items.map((item) => ({
      barcode: item.barcode,
      name_ar: item.name_ar,
      name_en: item.name_en,
      qty: Math.max(1, item.requestedQty),
      buyPrice: item.buyPrice,
      price: item.sellPrice,
      expiry: item.expiry,
    })),
  };
}
