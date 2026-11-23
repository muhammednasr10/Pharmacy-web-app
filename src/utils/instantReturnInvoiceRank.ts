import type { Invoice, InvoiceItem } from "../types";

type RankedInvoiceMatch = {
  invoice: Invoice;
  items: InvoiceItem[];
};

function invoiceRecencyScore(invoice: Invoice): number {
  const created = Date.parse(String(invoice.createdAt || ""));
  if (Number.isFinite(created)) return created;
  const numericId = Number(invoice.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

/** Prefer open-shift invoices, then newest returnable match. */
export function pickPreferredReturnInvoiceMatch(
  matches: RankedInvoiceMatch[],
  options: {
    preferredCashierShiftId?: number | null;
    getAvailableReturnQty: (invoice: Invoice, item: InvoiceItem) => number;
  },
): RankedInvoiceMatch | null {
  const returnable = matches
    .map((entry) => {
      const items = entry.items.filter(
        (item) => options.getAvailableReturnQty(entry.invoice, item) > 0,
      );
      return items.length > 0 ? { invoice: entry.invoice, items } : null;
    })
    .filter((entry): entry is RankedInvoiceMatch => entry !== null);

  if (returnable.length === 0) return null;

  const shiftId = options.preferredCashierShiftId;
  const ranked = [...returnable].sort((left, right) => {
    if (shiftId != null) {
      const leftShift = left.invoice.cashierShiftId === shiftId ? 0 : 1;
      const rightShift = right.invoice.cashierShiftId === shiftId ? 0 : 1;
      if (leftShift !== rightShift) return leftShift - rightShift;
    }
    return invoiceRecencyScore(right.invoice) - invoiceRecencyScore(left.invoice);
  });

  return ranked[0] || null;
}
