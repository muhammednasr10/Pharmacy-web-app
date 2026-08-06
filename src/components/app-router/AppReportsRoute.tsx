import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import CostsPage from "../../pages/CostsPage";
import { ReportsPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppReportsRouteProps = Pick<
  AppPageRouterProps,
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "reportFrom"
  | "reportTo"
  | "setReportFrom"
  | "setReportTo"
  | "reportsTab"
  | "setReportsTab"
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
  | "user"
  | "pharmacySettings"
  | "medicines"
  | "pharmacyCosts"
  | "invoices"
  | "canManageCosts"
  | "isSubscriptionExpired"
  | "addActivityLog"
  | "safeNumber"
  | "downloadCSV"
  | "refreshPharmacyCostsFromDb"
>;

export default function AppReportsRoute({
  canOpenPage,
  isArabic,
  t,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  reportsTab,
  setReportsTab,
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
  user,
  pharmacySettings,
  medicines,
  pharmacyCosts,
  invoices,
  canManageCosts,
  isSubscriptionExpired,
  addActivityLog,
  safeNumber,
  downloadCSV,
  refreshPharmacyCostsFromDb,
}: AppReportsRouteProps) {
  const location = useLocation();
  const showFinancialTab = canOpenPage("reports");
  const showInvestmentTab = canOpenPage("costs");

  useEffect(() => {
    if (location.pathname.includes("/investment")) {
      setReportsTab("investment");
      return;
    }
    if (showFinancialTab) {
      setReportsTab("financial");
    }
  }, [location.pathname, setReportsTab, showFinancialTab]);

  if (!showFinancialTab && !showInvestmentTab) {
    return null;
  }

  return (
    <ReportsPage
      isArabic={isArabic}
      t={t}
      reportsTab={reportsTab}
      setReportsTab={setReportsTab}
      showFinancialTab={showFinancialTab}
      showInvestmentTab={showInvestmentTab}
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
      investmentPanel={
        showInvestmentTab ? (
          <CostsPage
            embedded
            costs={pharmacyCosts}
            invoices={invoices}
            isArabic={isArabic}
            t={t}
            currency={t.currency}
            pharmacyId={getPharmacyId()}
            canManageCosts={canManageCosts()}
            isSubscriptionExpired={isSubscriptionExpired}
            userId={user?.uid}
            userName={appUser?.name}
            onActivityLog={addActivityLog}
            safeNumber={safeNumber}
            downloadCSV={downloadCSV}
            onRefreshCosts={refreshPharmacyCostsFromDb}
          />
        ) : null
      }
    />
  );
}
