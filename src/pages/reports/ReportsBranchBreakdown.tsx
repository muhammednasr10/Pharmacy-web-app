import type { BranchReportRow } from "../../utils/branchReports";
import { formatMoney } from "../../utils/formatMoney";

type ReportsBranchBreakdownProps = {
  isArabic: boolean;
  currency: string;
  branchReportRows: BranchReportRow[];
};

export default function ReportsBranchBreakdown({
  isArabic,
  currency,
  branchReportRows,
}: ReportsBranchBreakdownProps) {
  if (branchReportRows.length <= 1) return null;

  return (
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
                {formatMoney(branchReportRows.reduce((s, r) => s + r.profitTotal, 0))} {currency}
              </td>
              <td>
                {formatMoney(branchReportRows.reduce((s, r) => s + r.returnsTotal, 0))} {currency}
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
  );
}
