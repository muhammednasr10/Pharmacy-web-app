import type { Medicine } from "../types";
import type { StockCatalogFilter } from "../services/pharmacy/inventoryPaginationService";
import { formatDateInput } from "./date";

export function filterMedicinesForInventoryView(
  medicines: Medicine[],
  options: {
    pharmacyId?: string;
    search?: string;
    stockFilter?: StockCatalogFilter;
    lowStockThreshold?: number;
    expiringSoonDays?: number;
  },
): Medicine[] {
  const {
    pharmacyId,
    search = "",
    stockFilter = "all",
    lowStockThreshold = 10,
    expiringSoonDays = 90,
  } = options;

  const term = search.trim().toLowerCase();
  const today = formatDateInput(new Date());
  const expiringLimit = new Date();
  expiringLimit.setDate(expiringLimit.getDate() + Math.max(1, expiringSoonDays));
  const expiringLimitStr = formatDateInput(expiringLimit);

  return medicines.filter((medicine) => {
    if (pharmacyId && medicine.pharmacyId && medicine.pharmacyId !== pharmacyId) {
      return false;
    }

    if (term) {
      const haystack = [
        medicine.name_ar,
        medicine.name_en,
        medicine.barcode,
        medicine.activeIngredient,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (stockFilter === "low" && medicine.qty > Math.max(0, lowStockThreshold)) {
      return false;
    }
    if (stockFilter === "expired" && (!medicine.expiry || medicine.expiry >= today)) {
      return false;
    }
    if (
      stockFilter === "expiring" &&
      (!medicine.expiry || medicine.expiry < today || medicine.expiry > expiringLimitStr)
    ) {
      return false;
    }

    return true;
  });
}
