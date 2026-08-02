import { supabase } from "../supabaseClient";
import type { PurchaseRecord } from "../../types";
import { toCamelCase } from "./mappers";
import { getPurchases } from "./purchaseService";
import { getMedicinesForPharmacy, runWithPharmacyScope } from "./medicineQueryService";
import { updateMedicine } from "./medicineCrudService";
import { addStockMovement } from "./medicineStockActivityService";
import { createIdAllocator } from "./dbHelpers";

export type PurchaseBatchItem = {
  barcode: string;
  name_ar: string;
  name_en: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

function formatPurchaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("purchases") && lower.includes("barcode") && lower.includes("schema")) {
    return "عمود barcode غير موجود في جدول purchases. شغّل supabase/add-purchases-columns.sql في Supabase SQL Editor ثم أعد المحاولة.";
  }
  if (lower.includes("column") && lower.includes("does not exist") && lower.includes("purchases")) {
    return "أعمدة جدول purchases ناقصة. شغّل supabase/add-purchases-columns.sql في Supabase SQL Editor.";
  }
  if (lower.includes("medicine_name") && lower.includes("not-null")) {
    return "عمود medicine_name مطلوب في جدول purchases. حدّث التطبيق (refresh) أو شغّل add-purchases-columns.sql.";
  }
  if (
    lower.includes("medicines_barcode_key") ||
    lower.includes("medicines_pharmacy_barcode_unique") ||
    (lower.includes("duplicate key") && lower.includes("barcode"))
  ) {
    return "الباركود مسجّل مسبقاً في هذا الفرع أو فرع آخر. تأكد من الباركود أو شغّل supabase/fix-purchases-complete.sql.";
  }
  if (lower.includes("purchases_purchase_number_key")) {
    return "رقم التوريد مربوط بقيد فريد في قاعدة البيانات. شغّل supabase/fix-purchases-complete.sql في Supabase (قسم إزالة unique على purchase_number).";
  }
  if (lower.includes("duplicate key")) {
    return `تعارض في رقم السجل: ${message}`;
  }
  if (lower.includes("already_saved")) {
    return "تم حفظ أصناف هذا التوريد مسبقاً بنفس رقم التوريد";
  }
  if (lower.includes("invalid_item")) {
    return "بيانات الصنف غير مكتملة (الباركود أو الاسم أو الصلاحية)";
  }
  if (lower.includes("empty_items")) {
    return "لا توجد أصناف في التوريد";
  }
  if (lower.includes("not_authorized")) {
    return "غير مصرح بحفظ التوريد لهذا الفرع";
  }
  if (lower.includes("complete_purchase_with_stock_addition")) {
    return "دالة حفظ التوريد غير مفعّلة في قاعدة البيانات. شغّل supabase/complete-purchase-rpc.sql في Supabase SQL Editor.";
  }
  return message;
}

function parsePurchaseRpcError(message: string): string {
  const known = [
    "pharmacy_required",
    "purchase_number_required",
    "not_authorized",
    "empty_items",
    "invalid_item",
    "already_saved",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message;
}

export async function getPurchasesForPharmacies(pharmacyIds: string[]): Promise<PurchaseRecord[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getPurchases();

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .in("pharmacy_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("getPurchasesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PurchaseRecord>(row));
}

export async function savePurchaseBatch(params: {
  pharmacyId: string;
  purchaseNumber: string;
  supplierName?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  items: PurchaseBatchItem[];
}) {
  if (!params.items.length) {
    throw new Error("No purchase items");
  }

  if (!params.pharmacyId) {
    throw new Error("Target pharmacy is required");
  }

  const itemsPayload = params.items.map((item) => ({
    barcode: String(item.barcode ?? "").trim(),
    name_ar: String(item.name_ar ?? "").trim(),
    name_en: String(item.name_en ?? "").trim(),
    qty: Number(item.qty),
    buy_price: Number(item.buyPrice),
    sell_price: Number(item.price),
    expiry: item.expiry,
  }));

  const { error } = await supabase.rpc("complete_purchase_with_stock_addition", {
    p_pharmacy_id: params.pharmacyId,
    p_purchase_number: params.purchaseNumber,
    p_supplier_name: params.supplierName || null,
    p_notes: params.notes || null,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
    p_items: itemsPayload,
  });

  if (error) {
    const code = parsePurchaseRpcError(error.message);
    if (code === "already_saved") {
      throw new Error("تم حفظ أصناف هذا التوريد مسبقاً بنفس رقم التوريد");
    }
    if (code === "invalid_item") {
      throw new Error("بيانات الصنف غير مكتملة (الباركود أو الاسم أو الصلاحية)");
    }
    if (code === "empty_items") {
      throw new Error("No purchase items");
    }
    if (code === "pharmacy_required") {
      throw new Error("Target pharmacy is required");
    }
    if (code === "not_authorized") {
      throw new Error("غير مصرح بحفظ التوريد لهذا الفرع");
    }
    throw new Error(formatPurchaseError(error.message));
  }
}

export async function deletePurchaseBatch(
  purchaseNumber: string,
  pharmacyId: string,
  userId?: string,
  userName?: string,
) {
  if (!purchaseNumber || !pharmacyId) {
    throw new Error("Purchase number and pharmacy are required");
  }

  await runWithPharmacyScope(pharmacyId, async () => {
    const { data: rows, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("purchase_number", purchaseNumber)
      .eq("pharmacy_id", pharmacyId);

    if (error) {
      throw new Error(error.message);
    }

    if (!rows?.length) {
      return;
    }

    const branchMedicines = await getMedicinesForPharmacy(pharmacyId);
    const nextMovementId = await createIdAllocator("stock_movements");
    const nowIso = new Date().toISOString();

    for (const row of rows) {
      const purchase = toCamelCase<PurchaseRecord>(row);
      const barcode = String(purchase.barcode ?? "").trim();
      const purchaseQty = Number(purchase.quantity) || 0;

      const medicine =
        branchMedicines.find((item) => String(item.barcode ?? "").trim() === barcode) ||
        branchMedicines.find((item) => item.id === purchase.medicineId);

      if (medicine && purchaseQty > 0) {
        const qtyBefore = medicine.qty || 0;
        const qtyAfter = Math.max(0, qtyBefore - purchaseQty);
        await updateMedicine(medicine.id, { ...medicine, qty: qtyAfter }, pharmacyId);
        medicine.qty = qtyAfter;

        await addStockMovement({
          id: nextMovementId(),
          type: "purchase_delete",
          purchaseNumber,
          medicineId: medicine.id,
          medicineName_ar: medicine.name_ar,
          medicineName_en: medicine.name_en,
          barcode: medicine.barcode,
          quantityChange: -purchaseQty,
          qtyBefore,
          qtyAfter,
          supplierName: purchase.supplierName,
          notes: purchase.notes,
          pharmacyId,
          userId,
          userName,
          createdAt: nowIso,
        });
      }

      const { error: deleteError } = await supabase.from("purchases").delete().eq("id", row.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }
  });
}

export async function replacePurchaseBatch(params: {
  pharmacyId: string;
  purchaseNumber: string;
  supplierName?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  items: PurchaseBatchItem[];
}) {
  await deletePurchaseBatch(
    params.purchaseNumber,
    params.pharmacyId,
    params.userId,
    params.userName,
  );
  await savePurchaseBatch(params);
}
