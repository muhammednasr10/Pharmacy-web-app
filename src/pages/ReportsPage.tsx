import DashboardCharts from "../components/DashboardCharts";
import TierUpgradeNotice from "../components/TierUpgradeNotice";
import CashierShiftsReport from "../components/CashierShiftsReport";
import { getCostCategoryLabel } from "../utils/costCategories";
import type { BranchReportRow } from "../utils/branchReports";
import type { AppUser, Medicine, PharmacySettings, ReportsTab } from "../types";
import {
  downloadFinancialReportCsv,
  downloadFinancialReportPdf,
  type ReportExportSnapshot,
} from "../utils/reportExport";
import { formatMoney } from "../utils/formatMoney";
import { useEffect, type ReactNode } from "react";

type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type SalesPoint = { date: string; total: number };
type PaymentSlice = { method: string; total: number };
type CostSlice = { category: string; total: number };
type QuickRange = "today" | "7days" | "month" | "year";

type ReportsPageProps = {
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

  const profitMargin = filteredReportTotal
    ? (filteredReportProfitTotal / filteredReportTotal) * 100
    : 0;
  const netSales = filteredReportTotal - reportReturnsTotal;

  function buildExportSnapshot(): ReportExportSnapshot {
    return {
      isArabic,
      currency,
      reportFrom,
      reportTo,
      pharmacyName: pharmacySettings?.name || "الصيدلية",
      pharmacyNameEn: pharmacySettings?.name_en,
      pharmacyPhone: pharmacySettings?.phone,
      pharmacyAddress: pharmacySettings?.address,
      invoiceFooter: pharmacySettings?.invoiceFooter,
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
      reportCostsByCategory: reportCostsByCategory.map((item) => ({
        category: item.category,
        label: getCostCategoryLabel(item.category, isArabic),
        total: item.total,
      })),
      reportCashierTotals,
      topSellingMedicines,
      reportSalesTrend,
      branchReportRows: showBranchBreakdown ? branchReportRows : [],
      medicines: medicines.map((medicine) => ({
        name_ar: medicine.name_ar,
        name_en: medicine.name_en,
        barcode: medicine.barcode,
        qty: medicine.qty,
        buyPrice: medicine.buyPrice,
        price: medicine.price,
        expiry: medicine.expiry,
      })),
      getPaymentLabel,
    };
  }

  const cashierRows = Object.entries(reportCashierTotals).sort((a, b) => b[1] - a[1]);
  const maxCashier = Math.max(1, ...cashierRows.map(([, amount]) => amount));
  const maxCostCategory = Math.max(1, ...reportCostsByCategory.map((item) => item.total));

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

  const quickRanges: { key: QuickRange; ar: string; en: string }[] = [
    { key: "today", ar: "اليوم", en: "Today" },
    { key: "7days", ar: "آخر 7 أيام", en: "Last 7 days" },
    { key: "month", ar: "هذا الشهر", en: "This month" },
    { key: "year", ar: "هذه السنة", en: "This year" },
  ];

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
              onClick={() => downloadFinancialReportPdf(buildExportSnapshot())}
            >
              {isArabic ? "تصدير PDF" : "Export PDF"}
            </button>
            <button
              type="button"
              className="printBtn"
              onClick={() => downloadFinancialReportCsv(buildExportSnapshot())}
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

      {showBranchBreakdown && branchReportRows.length > 1 && (
        <div className="reportBox fullWidth branchReportBreakdown">
          <h3>{isArabic ? "مقارنة الفروع" : "Branch Comparison"}</h3>
          <p className="returnsSectionHint">
            {isArabic
              ? "ملخص المبيعات والأرباح لكل فرع في الفترة المحددة"
              : "Sales and profit summary per branch for the selected period"}
          </p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الفرع" : "Branch"}</th>
                  <th>{isArabic ? "فواتير" : "Invoices"}</th>
                  <th>{isArabic ? "مبيعات" : "Sales"}</th>
                  <th>{isArabic ? "ربح" : "Profit"}</th>
                  <th>{isArabic ? "مرتجعات" : "Returns"}</th>
                  <th>{isArabic ? "تكاليف" : "Costs"}</th>
                  <th>{isArabic ? "صافي بعد التكاليف" : "Net after costs"}</th>
                </tr>
              </thead>
              <tbody>
                {branchReportRows.map((row) => (
                  <tr key={row.branchId}>
                    <td>
                      <strong>{row.branchLabel}</strong>
                    </td>
                    <td>{row.invoiceCount}</td>
                    <td>
                      {formatMoney(row.salesTotal)} {currency}
                    </td>
                    <td>
                      {formatMoney(row.profitTotal)} {currency}
                    </td>
                    <td>
                      {formatMoney(row.returnsTotal)} {currency}
                    </td>
                    <td>
                      {formatMoney(row.costsTotal)} {currency}
                    </td>
                    <td>
                      <span className={row.netProfitAfterCosts >= 0 ? "badge ok" : "badge danger"}>
                        {formatMoney(row.netProfitAfterCosts)} {currency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="branchReportTotalsRow">
                  <td>
                    <strong>{isArabic ? "الإجمالي" : "Total"}</strong>
                  </td>
                  <td>{branchReportRows.reduce((s, r) => s + r.invoiceCount, 0)}</td>
                  <td>
                    {formatMoney(branchReportRows.reduce((s, r) => s + r.salesTotal, 0))} {currency}
                  </td>
                  <td>
                    {formatMoney(branchReportRows.reduce((s, r) => s + r.profitTotal, 0))}{" "}
                    {currency}
                  </td>
                  <td>
                    {formatMoney(branchReportRows.reduce((s, r) => s + r.returnsTotal, 0))}{" "}
                    {currency}
                  </td>
                  <td>
                    {formatMoney(branchReportRows.reduce((s, r) => s + r.costsTotal, 0))} {currency}
                  </td>
                  <td>
                    {formatMoney(branchReportRows.reduce((s, r) => s + r.netProfitAfterCosts, 0))}{" "}
                    {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <DashboardCharts
        isArabic={isArabic}
        currency={currency}
        salesTrend={reportSalesTrend}
        paymentBreakdown={reportPaymentBreakdown}
        topSelling={topSellingMedicines}
      />

      <div className="reportsGrid">
        <div className="reportBox">
          <h3>{isArabic ? "المبيعات حسب طريقة الدفع" : "Sales by Payment Method"}</h3>
          {["cash", "visa", "wallet", "credit"].map((method) => (
            <div className="reportLine" key={method}>
              <span>{getPaymentLabel(method)}</span>
              <strong>
                {formatMoney(reportPaymentTotals[method] || 0)} {currency}
              </strong>
            </div>
          ))}
        </div>

        <div className="reportBox">
          <h3>{isArabic ? "التكاليف حسب التصنيف" : "Costs by Category"}</h3>
          {reportCostsByCategory.length === 0 ? (
            <p className="empty">
              {isArabic ? "لا توجد تكاليف في الفترة" : "No costs in this period"}
            </p>
          ) : (
            <div className="cashierBars">
              {reportCostsByCategory.map((item) => {
                const pct = Math.round((item.total / maxCostCategory) * 100);
                return (
                  <div className="cashierBarRow" key={item.category}>
                    <div className="cashierBarTop">
                      <span>{getCostCategoryLabel(item.category, isArabic)}</span>
                      <strong>
                        {formatMoney(item.total)} {currency}
                      </strong>
                    </div>
                    <div className="barTrack barTrackCosts">
                      <div className="barFill barFillCosts" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="reportBox">
          <h3>{isArabic ? "أداء الكاشير" : "Cashier Performance"}</h3>
          {cashierRows.length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد بيانات" : "No data"}</p>
          ) : (
            <div className="cashierBars">
              {cashierRows.map(([cashierName, amount]) => {
                const pct = Math.round((amount / maxCashier) * 100);
                return (
                  <div className="cashierBarRow" key={cashierName}>
                    <div className="cashierBarTop">
                      <span>{cashierName}</span>
                      <strong>
                        {formatMoney(amount)} {currency}
                      </strong>
                    </div>
                    <div className="barTrack">
                      <div className="barFill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="reportBox fullWidth">
          <h3>{isArabic ? "أكثر الأدوية مبيعًا" : "Top Selling Medicines"}</h3>
          {topSellingMedicines.length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد بيانات" : "No data"}</p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.medicine}</th>
                    <th>{t.qty}</th>
                    <th>{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingMedicines.map((medicine, index) => (
                    <tr key={medicine.medicineId}>
                      <td>{index + 1}</td>
                      <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
                      <td>{medicine.quantity}</td>
                      <td>
                        {formatMoney(medicine.total)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
      )}
    </section>
  );
}
