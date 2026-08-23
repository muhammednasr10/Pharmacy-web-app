import type { BranchReportRow } from "./branchReports";

type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type InventoryRow = {
  name_ar: string;
  name_en: string;
  barcode: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

export type ReportExportSnapshot = {
  isArabic: boolean;
  currency: string;
  reportFrom: string;
  reportTo: string;
  pharmacyName: string;
  pharmacyNameEn?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  logoSource?: string;
  invoiceFooter?: string;
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
  reportCostsByCategory: Array<{ category: string; label: string; total: number }>;
  reportCashierTotals: Record<string, number>;
  topSellingMedicines: SellingMedicine[];
  reportSalesTrend: Array<{ date: string; total: number }>;
  branchReportRows: BranchReportRow[];
  medicines: InventoryRow[];
  getPaymentLabel: (method: string) => string;
};
