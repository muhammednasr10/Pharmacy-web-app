import { supabase } from "../supabaseClient";
import type { Medicine } from "../../types";
import { prepareMedicinePayload, prepareMedicinePayloadForPharmacy } from "./scope";
import { addStockMovement } from "./medicineStockActivityService";

export async function addMedicine(medicine: Medicine, pharmacyId?: string) {
  const payload = pharmacyId
    ? prepareMedicinePayloadForPharmacy(medicine, pharmacyId)
    : prepareMedicinePayload(medicine);
  const { error } = await supabase.from("medicines").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicine(id: number, medicine: Partial<Medicine>, pharmacyId?: string) {
  const payload = pharmacyId
    ? prepareMedicinePayloadForPharmacy(medicine, pharmacyId)
    : prepareMedicinePayload(medicine);
  delete payload.id;

  let query = supabase.from("medicines").update(payload).eq("id", id);
  if (pharmacyId) {
    query = query.eq("pharmacy_id", pharmacyId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteMedicine(id: number) {
  const { error } = await supabase.from("medicines").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicineStock(medicineId: number | string, newQty: number) {
  const id = String(medicineId ?? "").trim();
  const { error } = await supabase.from("medicines").update({ qty: newQty }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function applyStockCountAdjustments(params: {
  pharmacyId: string;
  userId?: string;
  userName?: string;
  notes?: string;
  lines: Array<{
    medicineId: number;
    medicineName_ar?: string;
    medicineName_en?: string;
    barcode?: string;
    systemQty: number;
    countedQty: number;
  }>;
}) {
  const varianceLines = params.lines.filter((line) => line.countedQty !== line.systemQty);
  if (varianceLines.length === 0) return { adjustedCount: 0, totalVariance: 0 };

  for (const line of varianceLines) {
    const variance = line.countedQty - line.systemQty;
    await updateMedicine(line.medicineId, { qty: line.countedQty }, params.pharmacyId);
    await addStockMovement({
      id: Date.now() + line.medicineId,
      type: "stock_count",
      medicineId: line.medicineId,
      medicineName_ar: line.medicineName_ar,
      medicineName_en: line.medicineName_en,
      barcode: line.barcode,
      quantityChange: variance,
      qtyBefore: line.systemQty,
      qtyAfter: line.countedQty,
      notes: params.notes || undefined,
      pharmacyId: params.pharmacyId,
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString(),
    });
  }

  const totalVariance = varianceLines.reduce(
    (sum, line) => sum + (line.countedQty - line.systemQty),
    0,
  );

  return { adjustedCount: varianceLines.length, totalVariance };
}
