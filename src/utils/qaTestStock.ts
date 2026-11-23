import type { Medicine } from "../types";
import { supabase } from "../services/supabaseClient";
import * as pharmacyService from "../services/pharmacyService";
import { toCamelCase } from "../services/pharmacy/mappers";

export const QA_TEST_BRANCH_ID = "qa-test";
export const QA_TEST_BARCODE = "6221000000010";

/** Known sellable sample used across QA journeys. */
export const QA_TEST_MEDICINE_SEED: Omit<Medicine, "id"> = {
  name_ar: "ون تو ثري شراب 120 مل",
  name_en: "One Two Three Syrup 120 ml",
  barcode: QA_TEST_BARCODE,
  qty: 100,
  price: 40,
  buyPrice: 32,
  expiry: "2027-12-31",
  pharmacyId: QA_TEST_BRANCH_ID,
};

export function isQaTestBranch(pharmacyId: string | null | undefined): boolean {
  return String(pharmacyId || "").trim().toLowerCase() === QA_TEST_BRANCH_ID;
}

async function findQaBarcodeMedicine(pharmacyId: string): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("barcode", QA_TEST_BARCODE)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("findQaBarcodeMedicine:", error.message);
    return null;
  }
  return data ? toCamelCase<Medicine>(data) : null;
}

/**
 * Ensure the QA branch has the standard test medicine in stock.
 * Safe to re-run: tops up qty when the barcode already exists.
 */
export async function ensureQaTestStock(pharmacyId: string): Promise<{
  created: boolean;
  medicineId: number;
  qty: number;
}> {
  if (!isQaTestBranch(pharmacyId)) {
    throw new Error("qa_branch_required");
  }

  const existing = await findQaBarcodeMedicine(pharmacyId);
  if (existing) {
    const nextQty = Math.max(Number(existing.qty || 0), QA_TEST_MEDICINE_SEED.qty);
    if (nextQty !== existing.qty) {
      await pharmacyService.updateMedicineStock(existing.id, nextQty);
    }
    return { created: false, medicineId: existing.id, qty: nextQty };
  }

  const id = Date.now();
  await pharmacyService.addMedicine(
    {
      id,
      ...QA_TEST_MEDICINE_SEED,
      pharmacyId,
    },
    pharmacyId,
  );
  return { created: true, medicineId: id, qty: QA_TEST_MEDICINE_SEED.qty };
}
