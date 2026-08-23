import type { ReactNode } from "react";
import type { BranchReportRow } from "../../utils/branchReports";
import type { AppUser, Medicine, PharmacySettings, ReportsTab } from "../../types";

export type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

export type SalesPoint = { date: string; total: number };
export type PaymentSlice = { method: string; total: number };
export type CostSlice = { category: string; total: number };
export type QuickRange = "today" | "7days" | "month" | "year";

export type ReportsPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  reportsTab: ReportsTab;
  setReportsTab: (tab: ReportsTab) => void;
  showFinancialTab: boolean;
  showInvestmentTab: boolean;
  investmentPanel?: ReactNode;
  reportFrom: string;
  reportTo: string;
  setReportFrom: (value: string) => void;
  setReportTo: (value: string) => void;
  onQuickRange: (preset: QuickRange) => void;
  filteredReportInvoicesCount: number;
  filteredReportProfitTotal: number;
  filteredReportTotal: number;
  filteredReportDiscountTotal: number;
  reportUnitsSold: number;
  reportReturnsTotal: number;
  reportCostsTotal: number;
  reportCostsCount: number;
  reportCostsByCategory: CostSlice[];
  netProfitAfterCosts: number;
  topSellingMedicines: SellingMedicine[];
  reportPaymentTotals: Record<string, number>;
  reportPaymentBreakdown: PaymentSlice[];
  reportSalesTrend: SalesPoint[];
  reportCashierTotals: Record<string, number>;
  getPaymentLabel: (method: string) => string;
  currency: string;
  branchReportRows?: BranchReportRow[];
  showBranchBreakdown?: boolean;
  branchBreakdownUpgradeNotice?: string | null;
  onOpenSubscriptionSettings?: () => void;
  pharmacyId?: string;
  appUser?: AppUser | null;
  pharmacySettings?: PharmacySettings | null;
  medicines?: Medicine[];
};
