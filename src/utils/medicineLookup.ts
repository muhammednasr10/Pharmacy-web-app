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

export function normalizeMedicineText(value: unknown) {
  return String(value ?? "").trim();
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
    .filter((medicine) => {
      const barcode = normalizeMedicineText(medicine.barcode).toLowerCase();
      const nameAr = normalizeMedicineText(medicine.name_ar).toLowerCase();
      const nameEn = normalizeMedicineText(medicine.name_en).toLowerCase();
      return barcode.includes(value) || nameAr.includes(value) || nameEn.includes(value);
    })
    .slice(0, limit);
}

export function medicineToEntryValues(
  medicine: Medicine,
  current?: Partial<MedicineEntryValues>
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
