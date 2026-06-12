import type { Invoice, InvoiceItem } from "../../types";
import { toSnakeCase } from "./mappers";

export function prepareInvoicePayload(invoice: Invoice): Record<string, any> {
  return toSnakeCase({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    total: invoice.total,
    paymentMethod: invoice.paymentMethod,
    customerName: invoice.customerName || "",
    cashierId: invoice.cashierId,
    cashierName: invoice.cashierName,
    pharmacyId: invoice.pharmacyId,
    totalCost: invoice.totalCost,
    totalProfit: invoice.totalProfit,
    createdAt: invoice.createdAt,
    shiftId: invoice.shiftId,
    cashierShiftId: invoice.cashierShiftId,
  } as Partial<Invoice>);
}

export function prepareInvoiceItemPayload(
  item: InvoiceItem,
  invoiceId: number,
  lineIndex = 0,
): Record<string, any> {
  const displayName = item.name_ar || item.name_en || "";
  const payload = toSnakeCase({
    id: item.id ?? Date.now() + lineIndex,
    invoiceId,
    medicineId: item.medicineId,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    buyPrice: item.buyPrice,
    costTotal: item.costTotal,
    profit: item.profit,
  } as Partial<InvoiceItem>);

  // دعم الجداول القديمة التي تستخدم medicine_name بدل name_ar/name_en
  payload.medicine_name = displayName;

  return payload;
}
