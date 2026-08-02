import { ReportsPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppReportsRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "reportFrom"
  | "reportTo"
  | "setReportFrom"
  | "setReportTo"
  | "applyReportQuickRange"
  | "filteredReportInvoices"
  | "filteredReportProfitTotal"
  | "filteredReportTotal"
  | "filteredReportDiscountTotal"
  | "reportUnitsSold"
  | "reportReturnsTotal"
  | "reportCostsTotal"
  | "reportCostsCount"
  | "reportCostsByCategory"
  | "netProfitAfterCosts"
  | "topSellingMedicines"
  | "reportPaymentTotals"
  | "reportPaymentBreakdown"
  | "reportSalesTrend"
  | "reportCashierTotals"
  | "getPaymentLabel"
  | "reportBranchRows"
  | "showBranchBreakdown"
  | "branchBreakdownUpgradeNotice"
  | "openSubscriptionSettings"
  | "getPharmacyId"
  | "appUser"
  | "pharmacySettings"
  | "medicines"
>;

export default function AppReportsRoute({
  displayPage,
  canOpenPage,
  isArabic,
  t,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  applyReportQuickRange,
  filteredReportInvoices,
  filteredReportProfitTotal,
  filteredReportTotal,
  filteredReportDiscountTotal,
  reportUnitsSold,
  reportReturnsTotal,
  reportCostsTotal,
  reportCostsCount,
  reportCostsByCategory,
  netProfitAfterCosts,
  topSellingMedicines,
  reportPaymentTotals,
  reportPaymentBreakdown,
  reportSalesTrend,
  reportCashierTotals,
  getPaymentLabel,
  reportBranchRows,
  showBranchBreakdown,
  branchBreakdownUpgradeNotice,
  openSubscriptionSettings,
  getPharmacyId,
  appUser,
  pharmacySettings,
  medicines,
}: AppReportsRouteProps) {
  if (displayPage !== "reports" || !canOpenPage("reports")) return null;

  return (
    <ReportsPage
      isArabic={isArabic}
      t={t}
      reportFrom={reportFrom}
      reportTo={reportTo}
      setReportFrom={setReportFrom}
      setReportTo={setReportTo}
      onQuickRange={applyReportQuickRange}
      filteredReportInvoicesCount={filteredReportInvoices.length}
      filteredReportProfitTotal={filteredReportProfitTotal}
      filteredReportTotal={filteredReportTotal}
      filteredReportDiscountTotal={filteredReportDiscountTotal}
      reportUnitsSold={reportUnitsSold}
      reportReturnsTotal={reportReturnsTotal}
      reportCostsTotal={reportCostsTotal}
      reportCostsCount={reportCostsCount}
      reportCostsByCategory={reportCostsByCategory}
      netProfitAfterCosts={netProfitAfterCosts}
      topSellingMedicines={topSellingMedicines}
      reportPaymentTotals={reportPaymentTotals}
      reportPaymentBreakdown={reportPaymentBreakdown}
      reportSalesTrend={reportSalesTrend}
      reportCashierTotals={reportCashierTotals}
      getPaymentLabel={getPaymentLabel}
      currency={t.currency}
      branchReportRows={reportBranchRows}
      showBranchBreakdown={showBranchBreakdown}
      branchBreakdownUpgradeNotice={branchBreakdownUpgradeNotice}
      onOpenSubscriptionSettings={openSubscriptionSettings}
      pharmacyId={getPharmacyId()}
      appUser={appUser}
      pharmacySettings={pharmacySettings}
      medicines={medicines}
    />
  );
}
