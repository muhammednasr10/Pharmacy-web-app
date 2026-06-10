import type { Invoice } from "../types";

export type CashierCommissionIdentity = {
  userId: string;
  employeeId?: string;
  userName?: string;
};

export function currentMonthPeriodBounds(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthValue = String(month + 1).padStart(2, "0");
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    periodStart: `${year}-${monthValue}-01`,
    periodEnd: `${year}-${monthValue}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function parseInvoiceDate(invoice: Invoice): Date | null {
  const raw = invoice.createdAt || invoice.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isInvoiceInPeriod(invoice: Invoice, periodStart: string, periodEnd: string) {
  const parsed = parseInvoiceDate(invoice);
  if (!parsed) return false;
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T23:59:59`);
  return parsed >= start && parsed <= end;
}

export function invoiceMatchesCashier(invoice: Invoice, identity: CashierCommissionIdentity) {
  const cashierId = String(invoice.cashierId || "").trim();
  if (!cashierId) return false;
  if (cashierId === identity.userId) return true;
  if (identity.employeeId && cashierId === identity.employeeId) return true;
  return false;
}

export function computeCashierCommissionFromInvoices(
  invoices: Invoice[],
  identity: CashierCommissionIdentity,
  commissionRate: number,
  options?: {
    periodStart?: string;
    periodEnd?: string;
    basis?: "total" | "profit";
  }
) {
  const rate = Math.max(0, Number(commissionRate) || 0);
  const basis = options?.basis || "total";
  let salesTotal = 0;
  let profitTotal = 0;
  let invoiceCount = 0;

  for (const invoice of invoices) {
    if (
      options?.periodStart &&
      options?.periodEnd &&
      !isInvoiceInPeriod(invoice, options.periodStart, options.periodEnd)
    ) {
      continue;
    }
    if (!invoiceMatchesCashier(invoice, identity)) continue;

    salesTotal += Math.max(0, Number(invoice.total) || 0);
    profitTotal += Math.max(0, Number(invoice.totalProfit) || 0);
    invoiceCount += 1;
  }

  const baseAmount = basis === "profit" ? profitTotal : salesTotal;
  const commission = Math.round((baseAmount * rate) / 100 * 100) / 100;

  return {
    commission,
    salesTotal: Math.round(salesTotal * 100) / 100,
    profitTotal: Math.round(profitTotal * 100) / 100,
    invoiceCount,
    commissionRate: rate,
  };
}
