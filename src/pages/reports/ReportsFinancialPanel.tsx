import DashboardCharts from "../../components/DashboardCharts";
import TierUpgradeNotice from "../../components/TierUpgradeNotice";
import CashierShiftsReport from "../../components/CashierShiftsReport";
import { formatMoney } from "../../utils/formatMoney";
import type { AppUser, Medicine, PharmacySettings } from "../../types";
import type { BranchReportRow } from "../../utils/branchReports";
import { buildReportExportSnapshot } from "./buildReportExportSnapshot";
import ReportsBranchBreakdown from "./ReportsBranchBreakdown";
import ReportsBreakdownGrid from "./ReportsBreakdownGrid";
import type {
  CostSlice,
  PaymentSlice,
  QuickRange,
  SalesPoint,
  SellingMedicine,
} from "./types";

type ReportsFinancialPanelProps = {
  isArabic: boolean;
  t: Record<string, string>;
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
  branchReportRows: BranchReportRow[];
  showBranchBreakdown: boolean;
  branchBreakdownUpgradeNotice: string | null;
  onOpenSubscriptionSettings?: () => void;
  pharmacyId: string;
  appUser: AppUser | null;
  pharmacySettings: PharmacySettings | null;
  medicines: Medicine[];
};

const quickRanges: { key: QuickRange; ar: string; en: string }[] = [
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "7days", ar: "آخر 7 أيام", en: "Last 7 days" },
  { key: "month", ar: "هذا الشهر", en: "This month" },
  { key: "year", ar: "هذه السنة", en: "This year" },
];

export default function ReportsFinancialPanel({
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
  branchReportRows,
  showBranchBreakdown,
  branchBreakdownUpgradeNotice,
  onOpenSubscriptionSettings,
  pharmacyId,
  appUser,
  pharmacySettings,
  medicines,
}: ReportsFinancialPanelProps) {
  const profitMargin = filteredReportTotal
    ? (filteredReportProfitTotal / filteredReportTotal) * 100
    : 0;
  const netSales = filteredReportTotal - reportReturnsTotal;

  function buildExportSnapshot() {
    return buildReportExportSnapshot({
      isArabic,
      currency,
      reportFrom,
      reportTo,
      pharmacySettings,
      filteredReportInvoicesCount,
      filteredReportTotal,
      filteredReportProfitTotal,
      filteredReportDiscountTotal,
      reportUnitsSold,
      reportReturnsTotal,
      reportCostsTotal,
      reportCostsCount,
      netProfitAfterCosts,
      netSales,
      profitMargin,
      reportPaymentTotals,
      reportCostsByCategory,
      reportCashierTotals,
      topSellingMedicines,
      reportSalesTrend,
      showBranchBreakdown,
      branchReportRows,
      medicines,
      getPaymentLabel,
    });
  }

  const heroCards = [
    {
      key: "sales",
      label: isArabic ? "إجمالي المبيعات" : "Total Sales",
      value: `${formatMoney(filteredReportTotal)} ${currency}`,
      sub: isArabic
        ? `${filteredReportInvoicesCount} فاتورة`
        : `${filteredReportInvoicesCount} invoices`,
      tone: "sales",
    },
    {
      key: "profit",
      label: isArabic ? "مجمل الربح" : "Gross Profit",
      value: `${formatMoney(filteredReportProfitTotal)} ${currency}`,
      sub: `${profitMargin.toFixed(1)}% ${isArabic ? "هامش" : "margin"}`,
      tone: "profit",
    },
    {
      key: "costs",
      label: isArabic ? "التكاليف التشغيلية" : "Operating Costs",
      value: `${formatMoney(reportCostsTotal)} ${currency}`,
      sub: isArabic ? `${reportCostsCount} بند` : `${reportCostsCount} entries`,
      tone: "costs",
    },
    {
      key: "net",
      label: isArabic ? "صافي الربح بعد التكاليف" : "Net Profit After Costs",
      value: `${formatMoney(netProfitAfterCosts)} ${currency}`,
      sub: isArabic ? "بعد خصم التكاليف التشغيلية" : "After operating costs",
      tone: netProfitAfterCosts >= 0 ? "net" : "net-negative",
    },
  ];

  const detailKpis = [
    {
      key: "net-sales",
      label: isArabic ? "صافي المبيعات" : "Net Sales",
      value: `${formatMoney(netSales)} ${currency}`,
      tone: "primary",
    },
    {
      key: "returns",
      label: isArabic ? "قيمة المرتجعات" : "Returns",
      value: `${formatMoney(reportReturnsTotal)} ${currency}`,
      tone: "danger",
    },
    {
      key: "discount",
      label: isArabic ? "إجمالي الخصومات" : "Discounts",
      value: `${formatMoney(filteredReportDiscountTotal)} ${currency}`,
      tone: "warn",
    },
    {
      key: "units",
      label: isArabic ? "وحدات مباعة" : "Units Sold",
      value: String(reportUnitsSold),
      tone: "neutral",
    },
  ];

  return (
    <>
      <div className="cardHeader reportsPageHeader">
        <div>
          <h2>{isArabic ? "التقارير المالية" : "Financial Reports"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "ملخص المبيعات والأرباح والتكاليف للفترة المحددة"
              : "Sales, profit, and costs summary for the selected period"}
          </p>
        </div>
        <div className="reportsHeaderActions">
          <div className="reportsPeriodBadge">
            <span>{t.fromDate}</span>
            <strong>{reportFrom || "—"}</strong>
            <span>{t.toDate}</span>
            <strong>{reportTo || "—"}</strong>
          </div>
          <div className="reportExportActions">
            <button
              type="button"
              className="secondaryBtn"
              onClick={() =>
                void import("../../utils/reportExport").then((m) =>
                  m.downloadFinancialReportPdf(buildExportSnapshot()),
                )
              }
            >
              {isArabic ? "تصدير PDF" : "Export PDF"}
            </button>
            <button
              type="button"
              className="printBtn"
              onClick={() =>
                void import("../../utils/reportExport").then((m) =>
                  m.downloadFinancialReportCsv(buildExportSnapshot()),
                )
              }
            >
              {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
          </div>
        </div>
      </div>

      <div className="reportControls">
        <div className="reportQuickRanges">
          {quickRanges.map((range) => (
            <button
              key={range.key}
              type="button"
              className="rangeChip"
              onClick={() => onQuickRange(range.key)}
            >
              {isArabic ? range.ar : range.en}
            </button>
          ))}
        </div>

        <div className="reportFilters">
          <label>{t.fromDate}</label>
          <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
          <label>{t.toDate}</label>
          <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
        </div>
      </div>

      <div className="reportHeroGrid">
        {heroCards.map((card) => (
          <div className={`reportHeroCard tone-${card.tone}`} key={card.key}>
            <span className="reportHeroLabel">{card.label}</span>
            <strong className="reportHeroValue">{card.value}</strong>
            <span className="reportHeroSub">{card.sub}</span>
          </div>
        ))}
      </div>

      <div className="reportKpiGrid reportDetailKpiGrid">
        {detailKpis.map((kpi) => (
          <div className={`reportKpiCard tone-${kpi.tone}`} key={kpi.key}>
            <span className="reportKpiLabel">{kpi.label}</span>
            <strong className="reportKpiValue">{kpi.value}</strong>
          </div>
        ))}
      </div>

      {branchBreakdownUpgradeNotice && onOpenSubscriptionSettings && (
        <TierUpgradeNotice
          isArabic={isArabic}
          message={branchBreakdownUpgradeNotice}
          onAction={onOpenSubscriptionSettings}
        />
      )}

      {showBranchBreakdown && (
        <ReportsBranchBreakdown
          isArabic={isArabic}
          currency={currency}
          branchReportRows={branchReportRows}
        />
      )}

      <DashboardCharts
        isArabic={isArabic}
        currency={currency}
        salesTrend={reportSalesTrend}
        paymentBreakdown={reportPaymentBreakdown}
        topSelling={topSellingMedicines}
      />

      <ReportsBreakdownGrid
        isArabic={isArabic}
        t={t}
        currency={currency}
        reportPaymentTotals={reportPaymentTotals}
        reportCostsByCategory={reportCostsByCategory}
        reportCashierTotals={reportCashierTotals}
        topSellingMedicines={topSellingMedicines}
        getPaymentLabel={getPaymentLabel}
      />

      {pharmacyId && (
        <CashierShiftsReport
          isArabic={isArabic}
          currency={currency}
          pharmacyId={pharmacyId}
          appUser={appUser}
          pharmacySettings={pharmacySettings}
          getPaymentLabel={getPaymentLabel}
        />
      )}
    </>
  );
}
