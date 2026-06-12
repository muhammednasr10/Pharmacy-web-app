import { getBranchLabel } from "./branchLabel";
import { filterLowStockMedicines, getLowStockThresholdForBranch } from "./inventoryAlerts";
import type { Medicine, PharmacySettings } from "../types";

export type ReorderSuggestion = {
  medicineId: number;
  barcode: string;
  name_ar: string;
  name_en: string;
  currentQty: number;
  threshold: number;
  targetQty: number;
  suggestedQty: number;
  buyPrice: number;
  sellPrice: number;
  expiry: string;
  estimatedCost: number;
  pharmacyId?: string;
  branchLabel: string;
};

export type ReorderPurchaseDraft = {
  branchId: string;
  supplierName?: string;
  notes: string;
  items: Array<{
    barcode: string;
    name_ar: string;
    name_en: string;
    qty: number;
    buyPrice: number;
    price: number;
    expiry: string;
  }>;
};

export const REORDER_DRAFT_STORAGE_KEY = "focus-reorder-purchase-draft";
export const REORDER_MODAL_FLAG_KEY = "focus-show-reorder-modal";

export function suggestReorderQty(currentQty: number, threshold: number) {
  const safeThreshold = Math.max(0, Math.floor(threshold));
  const target = Math.max(safeThreshold * 2, safeThreshold + 10, 10);
  return Math.max(1, target - Math.max(0, Math.floor(currentQty)));
}

export function buildReorderSuggestions(params: {
  medicines: Medicine[];
  branches: PharmacySettings[];
  fallbackSettings?: PharmacySettings | null;
  isArabic: boolean;
  branchId?: string;
}): ReorderSuggestion[] {
  const scopedMedicines = params.branchId
    ? params.medicines.filter(
        (medicine) =>
          medicine.pharmacyId === params.branchId ||
          (!medicine.pharmacyId && params.branchId === "main"),
      )
    : params.medicines;

  return filterLowStockMedicines(scopedMedicines, params.branches, params.fallbackSettings)
    .map((medicine) => {
      const threshold = getLowStockThresholdForBranch(
        medicine.pharmacyId,
        params.branches,
        params.fallbackSettings,
      );
      const suggestedQty = suggestReorderQty(medicine.qty, threshold);
      const buyPrice = Number(medicine.buyPrice) || 0;
      const sellPrice = Number(medicine.price) || 0;

      return {
        medicineId: medicine.id,
        barcode: medicine.barcode || "",
        name_ar: medicine.name_ar,
        name_en: medicine.name_en,
        currentQty: medicine.qty,
        threshold,
        targetQty: medicine.qty + suggestedQty,
        suggestedQty,
        buyPrice,
        sellPrice,
        expiry: medicine.expiry || "",
        estimatedCost: suggestedQty * buyPrice,
        pharmacyId: medicine.pharmacyId,
        branchLabel: getBranchLabel(medicine.pharmacyId, params.branches, params.isArabic),
      };
    })
    .sort(
      (a, b) =>
        a.currentQty - b.currentQty ||
        b.suggestedQty - a.suggestedQty ||
        a.name_ar.localeCompare(b.name_ar),
    );
}

export function suggestionsToPurchaseDraft(
  suggestions: ReorderSuggestion[],
  params: { branchId: string; notes?: string },
): ReorderPurchaseDraft {
  return {
    branchId: params.branchId,
    notes: params.notes || `Reorder suggestions — ${suggestions.length} low-stock items`,
    items: suggestions.map((item) => ({
      barcode: item.barcode,
      name_ar: item.name_ar,
      name_en: item.name_en,
      qty: item.suggestedQty,
      buyPrice: item.buyPrice,
      price: item.sellPrice,
      expiry: item.expiry,
    })),
  };
}

export function saveReorderPurchaseDraft(draft: ReorderPurchaseDraft) {
  sessionStorage.setItem(REORDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function consumeReorderPurchaseDraft(): ReorderPurchaseDraft | null {
  try {
    const raw = sessionStorage.getItem(REORDER_DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(REORDER_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReorderPurchaseDraft;
    if (!parsed?.branchId || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requestOpenReorderModal() {
  sessionStorage.setItem(REORDER_MODAL_FLAG_KEY, "1");
}

export function consumeReorderModalFlag() {
  const value = sessionStorage.getItem(REORDER_MODAL_FLAG_KEY) === "1";
  sessionStorage.removeItem(REORDER_MODAL_FLAG_KEY);
  return value;
}
