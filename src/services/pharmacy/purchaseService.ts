import { supabase } from "../supabaseClient";
import type { PurchaseRecord } from "../../types";
import { stampPharmacy } from "./scope";
import { getRows, subscribeTable } from "./dbHelpers";

export async function getPurchases(): Promise<PurchaseRecord[]> {
  return getRows<PurchaseRecord>("purchases", "id", false, 100, undefined, true);
}

export function subscribePurchases(callback: (purchases: PurchaseRecord[]) => void) {
  return subscribeTable<PurchaseRecord>("purchases", callback, "id", false, 100, undefined, true);
}

function preparePurchasePayload(purchase: PurchaseRecord): Record<string, any> {
  const medicineNameAr = purchase.medicineName_ar || "";
  const medicineNameEn = purchase.medicineName_en || "";
  const medicineName = medicineNameAr || medicineNameEn || "—";

  return stampPharmacy({
    id: purchase.id,
    purchase_number: purchase.purchaseNumber,
    medicine_id: purchase.medicineId,
    medicine_name: medicineName,
    medicine_name_ar: medicineNameAr,
    medicine_name_en: medicineNameEn,
    barcode: purchase.barcode || "",
    quantity: purchase.quantity,
    buy_price: purchase.buyPrice ?? 0,
    sell_price: purchase.sellPrice ?? 0,
    total_cost: purchase.totalCost ?? 0,
    supplier_name: purchase.supplierName || "",
    notes: purchase.notes || "",
    pharmacy_id: purchase.pharmacyId,
    user_id: purchase.userId || "",
    user_name: purchase.userName || "",
    date: purchase.date || new Date().toLocaleString(),
    created_at: purchase.createdAt || new Date().toISOString(),
  });
}

export async function createPurchase(purchase: PurchaseRecord) {
  const payload = preparePurchasePayload(purchase);
  const { error } = await supabase.from("purchases").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}
