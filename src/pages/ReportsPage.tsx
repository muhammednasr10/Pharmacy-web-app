import { useEffect } from "react";
import ReportsFinancialPanel from "./reports/ReportsFinancialPanel";
import type { ReportsPageProps } from "./reports/types";

export type { ReportsPageProps } from "./reports/types";

export default function ReportsPage({
  isArabic,
  t,
  reportsTab,
  setReportsTab,
  showFinancialTab,
  showInvestmentTab,
  investmentPanel = null,
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
  useEffect(() => {
    if (!showFinancialTab && showInvestmentTab && reportsTab === "financial") {
      setReportsTab("investment");
    }
    if (showFinancialTab && !showInvestmentTab && reportsTab === "investment") {
      setReportsTab("financial");
    }
  }, [showFinancialTab, showInvestmentTab, reportsTab, setReportsTab]);

  const showReportsTabs = showFinancialTab && showInvestmentTab;
  const activeTab =
    reportsTab === "investment" && showInvestmentTab
      ? "investment"
      : showFinancialTab
        ? "financial"
        : "investment";

  return (
    <section className="card reportsPage reportsDashboard reportsHub">
      {showReportsTabs && (
        <div className="staffPageTabsBar reportsTabsBar">
          <nav
            className="settingsTabsNav"
            aria-label={isArabic ? "أقسام التقارير" : "Reports sections"}
          >
            <button
              type="button"
              className={`settingsTabBtn ${activeTab === "financial" ? "active" : ""}`}
              onClick={() => setReportsTab("financial")}
            >
              {isArabic ? "التقارير المالية" : "Financial Reports"}
            </button>
            <button
              type="button"
              className={`settingsTabBtn ${activeTab === "investment" ? "active" : ""}`}
              onClick={() => setReportsTab("investment")}
            >
              {isArabic ? "استثمارى" : "Investment"}
            </button>
          </nav>
        </div>
      )}

      {activeTab === "investment" ? (
        investmentPanel
      ) : (
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
      )}
    </section>
  );
}
