import type { Medicine } from "../types";

export type MedicineEntryValues = {
  barcode: string;
  name_ar: string;
  name_en: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

export function filterMedicinesForPharmacy(medicines: Medicine[], pharmacyId: string) {
  if (!pharmacyId) return [];
  return medicines.filter((medicine) => (medicine.pharmacyId || pharmacyId) === pharmacyId);
}

export function normalizeMedicineText(value: unknown) {
  return String(value ?? "").trim();
}

/** المادة الفعالة — من الحقل المخصص أو من صيغة الكتالوج: تجاري · علمي · مصنع */
export function resolveMedicineActiveIngredient(
  medicine: Pick<Medicine, "activeIngredient" | "name_en" | "name_ar">,
): string {
  const explicit = normalizeMedicineText(medicine.activeIngredient);
  if (explicit) return explicit;

  const segments = normalizeMedicineText(medicine.name_en)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    return segments[1];
  }

  return "";
}

/** الاسم التجاري بالإنجليزي — الجزء الأول من name_en في صيغة الكتالوج */
export function resolveMedicineEnglishName(
  medicine: Pick<Medicine, "name_en" | "name_ar">,
): string {
  const raw = normalizeMedicineText(medicine.name_en);
  if (!raw) return normalizeMedicineText(medicine.name_ar);

  const segments = raw
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  return segments[0] || raw;
}

export function resolveMedicineArabicName(medicine: Pick<Medicine, "name_ar" | "name_en">): string {
  return normalizeMedicineText(medicine.name_ar) || resolveMedicineEnglishName(medicine);
}

export function medicineMatchesInventorySearch(medicine: Medicine, query: string): boolean {
  const value = normalizeMedicineText(query).toLowerCase();
  if (!value) return true;

  const activeIngredient = resolveMedicineActiveIngredient(medicine);
  const nameEnSegments = normalizeMedicineText(medicine.name_en)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  const haystack = [
    medicine.name_ar,
    medicine.name_en,
    medicine.barcode,
    activeIngredient,
    ...nameEnSegments,
  ]
    .map((part) => normalizeMedicineText(part).toLowerCase())
    .filter(Boolean);

  return haystack.some((part) => part.includes(value));
}

export function findMedicineByBarcode(medicines: Medicine[], barcode: string) {
  const code = normalizeMedicineText(barcode);
  if (!code) return undefined;
  return medicines.find((medicine) => normalizeMedicineText(medicine.barcode) === code);
}

export function findMedicineByExactName(medicines: Medicine[], name: string) {
  const value = normalizeMedicineText(name).toLowerCase();
  if (!value) return undefined;

  return medicines.find((medicine) => {
    const ar = normalizeMedicineText(medicine.name_ar).toLowerCase();
    const en = normalizeMedicineText(medicine.name_en).toLowerCase();
    return ar === value || en === value;
  });
}

export function searchMedicines(medicines: Medicine[], query: string, limit = 8) {
  const value = normalizeMedicineText(query).toLowerCase();
  if (value.length < 1) return [];

  return medicines
    .filter((medicine) => medicineMatchesInventorySearch(medicine, query))
    .slice(0, limit);
}

export function medicineToEntryValues(
  medicine: Medicine,
  current?: Partial<MedicineEntryValues>,
): MedicineEntryValues {
  return {
    barcode: medicine.barcode,
    name_ar: medicine.name_ar,
    name_en: medicine.name_en,
    qty: current?.qty ?? 0,
    buyPrice: medicine.buyPrice || 0,
    price: medicine.price || 0,
    expiry: medicine.expiry || "",
  };
}

export function getMedicineDisplayName(medicine: Medicine, isArabic: boolean) {
  return (isArabic ? medicine.name_ar : medicine.name_en) || medicine.name_ar || medicine.name_en;
}
