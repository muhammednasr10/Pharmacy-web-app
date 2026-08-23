import { getCostCategoryLabel } from "../../utils/costCategories";
import { formatMoney } from "../../utils/formatMoney";
import type { CostSlice, SellingMedicine } from "./types";

type ReportsBreakdownGridProps = {
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  reportPaymentTotals: Record<string, number>;
  reportCostsByCategory: CostSlice[];
  reportCashierTotals: Record<string, number>;
  topSellingMedicines: SellingMedicine[];
  getPaymentLabel: (method: string) => string;
};

export default function ReportsBreakdownGrid({
  isArabic,
  t,
  currency,
  reportPaymentTotals,
  reportCostsByCategory,
  reportCashierTotals,
  topSellingMedicines,
  getPaymentLabel,
}: ReportsBreakdownGridProps) {
  const cashierRows = Object.entries(reportCashierTotals).sort((a, b) => b[1] - a[1]);
  const maxCashier = Math.max(1, ...cashierRows.map(([, amount]) => amount));
  const maxCostCategory = Math.max(1, ...reportCostsByCategory.map((item) => item.total));

  return (
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
  );
}
