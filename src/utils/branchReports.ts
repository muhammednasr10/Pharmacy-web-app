import type { Invoice, PharmacyCost, PharmacySettings, ReturnRecord } from "../types";
import { getBranchLabel } from "./branchLabel";

export type BranchReportRow = {
  branchId: string;
  branchLabel: string;
  invoiceCount: number;
  salesTotal: number;
  profitTotal: number;
  returnsTotal: number;
  costsTotal: number;
  netProfitAfterCosts: number;
};

function inReportRange(value: string | undefined, reportFrom: string, reportTo: string): boolean {
  const key = (value || "").slice(0, 10);
  return Boolean(key && key >= reportFrom && key <= reportTo);
}

function resolveBranchId(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function buildBranchReportRows(params: {
  branches: PharmacySettings[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  costs: PharmacyCost[];
  reportFrom: string;
  reportTo: string;
  isArabic: boolean;
  fallbackBranchId?: string;
}): BranchReportRow[] {
  const fallback = params.fallbackBranchId || "main";
  const branchOrder = params.branches.length > 0 ? params.branches.map((b) => b.id) : [];
  const branchIdSet = new Set<string>(branchOrder);

  for (const invoice of params.invoices) {
    branchIdSet.add(resolveBranchId(invoice.pharmacyId, fallback));
  }

  const rows: BranchReportRow[] = [];

  for (const branchId of branchIdSet) {
    const branchInvoices = params.invoices.filter(
      (invoice) =>
        resolveBranchId(invoice.pharmacyId, fallback) === branchId &&
        inReportRange(invoice.createdAt || invoice.date, params.reportFrom, params.reportTo),
    );

    const salesTotal = branchInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const profitTotal = branchInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalProfit || 0),
      0,
    );
    const returnsTotal = params.returns
      .filter(
        (record) =>
          resolveBranchId(record.pharmacyId, fallback) === branchId &&
          inReportRange(record.createdAt || record.date, params.reportFrom, params.reportTo),
      )
      .reduce((sum, record) => sum + Number(record.total || 0), 0);
    const costsTotal = params.costs
      .filter(
        (cost) =>
          resolveBranchId(cost.pharmacyId, fallback) === branchId &&
          inReportRange(cost.createdAt || cost.date, params.reportFrom, params.reportTo),
      )
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);

    rows.push({
      branchId,
      branchLabel: getBranchLabel(branchId, params.branches, params.isArabic),
      invoiceCount: branchInvoices.length,
      salesTotal,
      profitTotal,
      returnsTotal,
      costsTotal,
      netProfitAfterCosts: profitTotal - costsTotal,
    });
  }

  const orderIndex = new Map(branchOrder.map((id, index) => [id, index]));
  return rows.sort((a, b) => {
    if (b.salesTotal !== a.salesTotal) return b.salesTotal - a.salesTotal;
    return (orderIndex.get(a.branchId) ?? 999) - (orderIndex.get(b.branchId) ?? 999);
  });
}
