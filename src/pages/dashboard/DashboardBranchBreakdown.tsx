import { formatMoney } from "../../utils/formatMoney";
import type { BranchReportRow } from "../../utils/branchReports";
import type { Page } from "../../types";

type DashboardBranchBreakdownProps = {
  isArabic: boolean;
  t: Record<string, string>;
  dashboardBranchRows: BranchReportRow[];
  canAccessReports: boolean;
  onNavigate: (page: Page) => void;
};

export default function DashboardBranchBreakdown({
  isArabic,
  t,
  dashboardBranchRows,
  canAccessReports,
  onNavigate,
}: DashboardBranchBreakdownProps) {
  if (dashboardBranchRows.length <= 1) return null;

  return (
    <section className="card branchReportBreakdown dashboardBranchBreakdown">
      <h3>{isArabic ? "مبيعات الفروع — الفترة الحالية" : "Branch sales — current period"}</h3>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>{isArabic ? "الفرع" : "Branch"}</th>
              <th>{isArabic ? "فواتير" : "Inv."}</th>
              <th>{isArabic ? "مبيعات" : "Sales"}</th>
              <th>{isArabic ? "ربح" : "Profit"}</th>
            </tr>
          </thead>
          <tbody>
            {dashboardBranchRows.map((row) => (
              <tr key={row.branchId}>
                <td>{row.branchLabel}</td>
                <td>{row.invoiceCount}</td>
                <td>
                  {formatMoney(row.salesTotal)} {t.currency}
                </td>
                <td>
                  {formatMoney(row.profitTotal)} {t.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canAccessReports && (
        <button type="button" className="smallBtn" onClick={() => onNavigate("reports")}>
          {isArabic ? "التقرير المفصّل" : "Full report"}
        </button>
      )}
    </section>
  );
}
