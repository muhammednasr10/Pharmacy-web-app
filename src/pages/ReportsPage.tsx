import ReportsFinancialPanel from "./reports/ReportsFinancialPanel";
import type { ReportsPageProps } from "./reports/types";

export type { ReportsPageProps } from "./reports/types";

export default function ReportsPage({
  isArabic,
  t,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  onQuickRange,
  filteredReportInvoicesCount,
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
  currency,
  branchReportRows = [],
  showBranchBreakdown = false,
  branchBreakdownUpgradeNotice = null,
  onOpenSubscriptionSettings,
  pharmacyId = "",
  appUser = null,
  pharmacySettings = null,
  medicines = [],
}: ReportsPageProps) {
  return (
    <section className="card reportsPage reportsDashboard reportsHub">
      <ReportsFinancialPanel
        isArabic={isArabic}
        t={t}
        reportFrom={reportFrom}
        reportTo={reportTo}
        setReportFrom={setReportFrom}
        setReportTo={setReportTo}
        onQuickRange={onQuickRange}
        filteredReportInvoicesCount={filteredReportInvoicesCount}
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
        currency={currency}
        branchReportRows={branchReportRows}
        showBranchBreakdown={showBranchBreakdown}
        branchBreakdownUpgradeNotice={branchBreakdownUpgradeNotice}
        onOpenSubscriptionSettings={onOpenSubscriptionSettings}
        pharmacyId={pharmacyId}
        appUser={appUser}
        pharmacySettings={pharmacySettings}
        medicines={medicines}
      />
    </section>
  );
}
