import type { StockMovement } from "../types";
export { getMovementTypeLabel } from "./stockMovementLabels";

export type MedicineStockSummary = {
  purchased: number;
  manualIn: number;
  returns: number;
  sold: number;
  wastage: number;
  adjustmentsOut: number;
};

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
      case "instant_sale_return":
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
