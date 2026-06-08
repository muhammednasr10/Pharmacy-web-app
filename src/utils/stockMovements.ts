import type { StockMovement } from "../types";

export type MedicineStockSummary = {
  purchased: number;
  manualIn: number;
  returns: number;
  sold: number;
  wastage: number;
  adjustmentsOut: number;
};

export function getMovementTypeLabel(type: string, isArabic: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    sale: { ar: "بيع", en: "Sale" },
    return: { ar: "مرتجع", en: "Return" },
    sale_return: { ar: "مرتجع فوري", en: "Instant Return" },
    purchase: { ar: "توريد", en: "Purchase" },
    purchase_delete: { ar: "حذف توريد", en: "Purchase Deleted" },
    medicine_create: { ar: "إضافة يدوية", en: "Manual Add" },
    medicine_update: { ar: "تعديل كمية", en: "Qty Update" },
    medicine_delete: { ar: "حذف دواء", en: "Medicine Deleted" },
    return_delete: { ar: "حذف مرتجع", en: "Return Deleted" },
    wastage: { ar: "هالك", en: "Wastage" },
    shrinkage: { ar: "هالك", en: "Wastage" },
    adjustment: { ar: "تسوية", en: "Adjustment" },
  };

  const entry = labels[type];
  if (entry) {
    return isArabic ? entry.ar : entry.en;
  }

  return type;
}

export function buildMedicineStockSummary(movements: StockMovement[]): MedicineStockSummary {
  const summary: MedicineStockSummary = {
    purchased: 0,
    manualIn: 0,
    returns: 0,
    sold: 0,
    wastage: 0,
    adjustmentsOut: 0,
  };

  for (const movement of movements) {
    const change = Number(movement.quantityChange) || 0;
    if (!change) continue;

    switch (movement.type) {
      case "purchase":
        if (change > 0) summary.purchased += change;
        else summary.adjustmentsOut += Math.abs(change);
        break;
      case "medicine_create":
        summary.manualIn += change;
        break;
      case "medicine_update":
        if (change > 0) summary.manualIn += change;
        else summary.adjustmentsOut += Math.abs(change);
        break;
      case "return":
      case "sale_return":
        if (change > 0) summary.returns += change;
        else summary.adjustmentsOut += Math.abs(change);
        break;
      case "sale":
        summary.sold += Math.abs(change);
        break;
      case "wastage":
      case "shrinkage":
        summary.wastage += Math.abs(change);
        break;
      case "purchase_delete":
      case "medicine_delete":
      case "return_delete":
        summary.adjustmentsOut += Math.abs(change);
        break;
      default:
        if (change > 0) summary.manualIn += change;
        else summary.adjustmentsOut += Math.abs(change);
        break;
    }
  }

  return summary;
}

export function getMovementReference(movement: StockMovement, isArabic: boolean): string {
  if (movement.purchaseNumber) {
    return isArabic ? `توريد ${movement.purchaseNumber}` : `Purchase ${movement.purchaseNumber}`;
  }
  if (movement.invoiceNumber) {
    return isArabic ? `فاتورة ${movement.invoiceNumber}` : `Invoice ${movement.invoiceNumber}`;
  }
  if (movement.returnNumber) {
    return isArabic ? `مرتجع ${movement.returnNumber}` : `Return ${movement.returnNumber}`;
  }
  if (movement.supplierName) {
    return movement.supplierName;
  }
  if (movement.notes) {
    return movement.notes;
  }
  return "-";
}
