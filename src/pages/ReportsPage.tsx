import type { ReactNode } from "react";

type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type ReportsPageProps = {
  isArabic: boolean;
  t: Record<string, string>;
  reportFrom: string;
  reportTo: string;
  setReportFrom: (value: string) => void;
  setReportTo: (value: string) => void;
  filteredReportInvoicesCount: number;
  filteredReportProfitTotal: number;
  filteredReportTotal: number;
  filteredReportDiscountTotal: number;
  topSellingMedicines: SellingMedicine[];
  reportPaymentTotals: Record<string, number>;
  reportCashierTotals: Record<string, number>;
  getPaymentLabel: (method: string) => string;
  currency: string;
  invoiceTable: ReactNode;
};

export default function ReportsPage({
  isArabic,
  t,
  reportFrom,
  reportTo,
  setReportFrom,
  setReportTo,
  filteredReportInvoicesCount,
  filteredReportProfitTotal,
  filteredReportTotal,
  filteredReportDiscountTotal,
  topSellingMedicines,
  reportPaymentTotals,
  reportCashierTotals,
  getPaymentLabel,
  currency,
  invoiceTable,
}: ReportsPageProps) {
  return (
    <section className="card reportsPage">
      <div className="cardHeader">
        <h2>{t.reports}</h2>
      </div>

      <div className="reportFilters">
        <label>{t.fromDate}</label>
        <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />

        <label>{t.toDate}</label>
        <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
      </div>

      <div className="summaryGrid reportSummary">
        <div>
          <span>{t.filteredInvoices}</span>
          <strong>{filteredReportInvoicesCount}</strong>
        </div>
        <div>
          <span>{isArabic ? "صافي الربح" : "Net Profit"}</span>
          <strong>
            {filteredReportProfitTotal.toFixed(2)} {currency}
          </strong>
        </div>

        <div>
          <span>{t.filteredSales}</span>
          <strong>
            {filteredReportTotal.toFixed(2)} {currency}
          </strong>
        </div>

        <div>
          <span>{t.discount}</span>
          <strong>
            {filteredReportDiscountTotal.toFixed(2)} {currency}
          </strong>
        </div>

        <div>
          <span>{isArabic ? "متوسط الفاتورة" : "Average Invoice"}</span>
          <strong>
            {filteredReportInvoicesCount
              ? (filteredReportTotal / filteredReportInvoicesCount).toFixed(2)
              : "0.00"} {currency}
          </strong>
        </div>
      </div>

      <div className="reportsGrid">
        <div className="reportBox">
          <h3>{isArabic ? "المبيعات حسب طريقة الدفع" : "Sales by Payment Method"}</h3>
          {['cash', 'visa', 'wallet', 'credit'].map((method) => (
            <div className="reportLine" key={method}>
              <span>{getPaymentLabel(method)}</span>
              <strong>
                {(reportPaymentTotals[method] || 0).toFixed(2)} {currency}
              </strong>
            </div>
          ))}
        </div>

        <div className="reportBox">
          <h3>{isArabic ? "مبيعات الكاشير" : "Cashier Sales"}</h3>
          {Object.keys(reportCashierTotals).length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد بيانات" : "No data"}</p>
          ) : (
            Object.entries(reportCashierTotals).map(([cashierName, amount]) => (
              <div className="reportLine" key={cashierName}>
                <span>{cashierName}</span>
                <strong>{amount.toFixed(2)} {currency}</strong>
              </div>
            ))
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
                    <th>{t.medicine}</th>
                    <th>{t.qty}</th>
                    <th>{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingMedicines.map((medicine) => (
                    <tr key={medicine.medicineId}>
                      <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
                      <td>{medicine.quantity}</td>
                      <td>{medicine.total.toFixed(2)} {currency}</td>
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
