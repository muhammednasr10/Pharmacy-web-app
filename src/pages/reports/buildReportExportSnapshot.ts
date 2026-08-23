import type { ReportExportSnapshot } from "../../utils/reportExportTypes";
import { getCostCategoryLabel } from "../../utils/costCategories";
import { resolveAppLogoUrl } from "../../utils/appLogoAsset";
import type { Medicine, PharmacySettings } from "../../types";
import type { BranchReportRow } from "../../utils/branchReports";
import type { CostSlice, SellingMedicine, SalesPoint } from "./types";

type BuildExportSnapshotArgs = {
  isArabic: boolean;
  currency: string;
  reportFrom: string;
  reportTo: string;
  pharmacySettings: PharmacySettings | null;
  filteredReportInvoicesCount: number;
  filteredReportTotal: number;
  filteredReportProfitTotal: number;
  filteredReportDiscountTotal: number;
  reportUnitsSold: number;
  reportReturnsTotal: number;
  reportCostsTotal: number;
  reportCostsCount: number;
  netProfitAfterCosts: number;
  netSales: number;
  profitMargin: number;
  reportPaymentTotals: Record<string, number>;
  reportCostsByCategory: CostSlice[];
  reportCashierTotals: Record<string, number>;
  topSellingMedicines: SellingMedicine[];
  reportSalesTrend: SalesPoint[];
  showBranchBreakdown: boolean;
  branchReportRows: BranchReportRow[];
  medicines: Medicine[];
  getPaymentLabel: (method: string) => string;
};

export function buildReportExportSnapshot(args: BuildExportSnapshotArgs): ReportExportSnapshot {
  return {
    isArabic: args.isArabic,
    currency: args.currency,
    reportFrom: args.reportFrom,
    reportTo: args.reportTo,
    pharmacyName: args.pharmacySettings?.name || "الصيدلية",
    pharmacyNameEn: args.pharmacySettings?.name_en,
    pharmacyPhone: args.pharmacySettings?.phone,
    pharmacyAddress: args.pharmacySettings?.address,
    logoSource: resolveAppLogoUrl(args.pharmacySettings?.logoBase64),
    invoiceFooter: args.pharmacySettings?.invoiceFooter,
    filteredReportInvoicesCount: args.filteredReportInvoicesCount,
    filteredReportTotal: args.filteredReportTotal,
    filteredReportProfitTotal: args.filteredReportProfitTotal,
    filteredReportDiscountTotal: args.filteredReportDiscountTotal,
    reportUnitsSold: args.reportUnitsSold,
    reportReturnsTotal: args.reportReturnsTotal,
    reportCostsTotal: args.reportCostsTotal,
    reportCostsCount: args.reportCostsCount,
    netProfitAfterCosts: args.netProfitAfterCosts,
    netSales: args.netSales,
    profitMargin: args.profitMargin,
    reportPaymentTotals: args.reportPaymentTotals,
    reportCostsByCategory: args.reportCostsByCategory.map((item) => ({
      category: item.category,
      label: getCostCategoryLabel(item.category, args.isArabic),
      total: item.total,
    })),
    reportCashierTotals: args.reportCashierTotals,
    topSellingMedicines: args.topSellingMedicines,
    reportSalesTrend: args.reportSalesTrend,
    branchReportRows: args.showBranchBreakdown ? args.branchReportRows : [],
    medicines: args.medicines.map((medicine) => ({
      name_ar: medicine.name_ar,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      qty: medicine.qty,
      buyPrice: medicine.buyPrice ?? 0,
      price: medicine.price,
      expiry: medicine.expiry,
    })),
    getPaymentLabel: args.getPaymentLabel,
  };
}
