import type { ReactNode } from "react";
import DashboardCharts from "../components/DashboardCharts";

type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type SalesPoint = { date: string; total: number };
type PaymentSlice = { method: string; total: number };
type QuickRange = "today" | "7days" | "month" | "year";

type ReportsPageProps = {
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
  topSellingMedicines: SellingMedicine[];
  reportPaymentTotals: Record<string, number>;
  reportPaymentBreakdown: PaymentSlice[];
  reportSalesTrend: SalesPoint[];
  reportCashierTotals: Record<string, number>;
  getPaymentLabel: (method: string) => string;
  currency: string;
  invoiceTable: ReactNode;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

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
  topSellingMedicines,
  reportPaymentTotals,
  reportPaymentBreakdown,
  reportSalesTrend,
  reportCashierTotals,
  getPaymentLabel,
  currency,
  invoiceTable,
}: ReportsPageProps) {
  const avgInvoice = filteredReportInvoicesCount
    ? filteredReportTotal / filteredReportInvoicesCount
    : 0;
  const profitMargin = filteredReportTotal
    ? (filteredReportProfitTotal / filteredReportTotal) * 100
    : 0;
  const netSales = filteredReportTotal - reportReturnsTotal;

  const cashierRows = Object.entries(reportCashierTotals).sort((a, b) => b[1] - a[1]);
  const maxCashier = Math.max(1, ...cashierRows.map(([, amount]) => amount));

  const kpis = [
    {
      key: "sales",
      label: isArabic ? "إجمالي المبيعات" : "Total Sales",
      value: `${formatMoney(filteredReportTotal)} ${currency}`,
      tone: "primary",
    },
    {
      key: "profit",
      label: isArabic ? "صافي الربح" : "Net Profit",
      value: `${formatMoney(filteredReportProfitTotal)} ${currency}`,
      tone: "ok",
    },
    {
      key: "margin",
      label: isArabic ? "هامش الربح" : "Profit Margin",
      value: `${profitMargin.toFixed(1)}%`,
      tone: "ok",
    },
    {
      key: "invoices",
      label: isArabic ? "عدد الفواتير" : "Invoices",
      value: String(filteredReportInvoicesCount),
      tone: "neutral",
    },
    {
      key: "avg",
      label: isArabic ? "متوسط الفاتورة" : "Average Invoice",
      value: `${formatMoney(avgInvoice)} ${currency}`,
      tone: "neutral",
    },
    {
      key: "units",
      label: isArabic ? "وحدات مباعة" : "Units Sold",
      value: String(reportUnitsSold),
      tone: "neutral",
    },
    {
      key: "discount",
      label: isArabic ? "إجمالي الخصومات" : "Total Discounts",
      value: `${formatMoney(filteredReportDiscountTotal)} ${currency}`,
      tone: "warn",
    },
    {
      key: "returns",
      label: isArabic ? "قيمة المرتجعات" : "Returns Value",
      value: `${formatMoney(reportReturnsTotal)} ${currency}`,
      tone: "danger",
    },
    {
      key: "net",
      label: isArabic ? "صافي المبيعات" : "Net Sales",
      value: `${formatMoney(netSales)} ${currency}`,
      tone: "primary",
    },
  ];

  const quickRanges: { key: QuickRange; ar: string; en: string }[] = [
    { key: "today", ar: "اليوم", en: "Today" },
    { key: "7days", ar: "آخر 7 أيام", en: "Last 7 days" },
    { key: "month", ar: "هذا الشهر", en: "This month" },
    { key: "year", ar: "هذه السنة", en: "This year" },
  ];

  return (
    <section className="card reportsPage reportsDashboard">
      <div className="cardHeader">
        <h2>{isArabic ? "لوحة التقارير" : "Reports Dashboard"}</h2>
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

      <div className="reportKpiGrid">
        {kpis.map((kpi) => (
          <div className={`reportKpiCard tone-${kpi.tone}`} key={kpi.key}>
            <span className="reportKpiLabel">{kpi.label}</span>
            <strong className="reportKpiValue">{kpi.value}</strong>
          </div>
        ))}
      </div>

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

      {invoiceTable}
    </section>
  );
}
