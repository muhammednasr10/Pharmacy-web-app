import type { PharmacyCostPlan } from "../../types";
import type { InvestmentAnalysis, InvestmentPlanRow } from "../../utils/investmentAnalysis";
import { getCategoryLabel } from "../../utils/investmentAnalysis";
import { formatVariance, rowDraftKey } from "./costsFormatters";

type InvestmentPlanTableProps = {
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  loadingPlans: boolean;
  planRows: InvestmentPlanRow[];
  plans: PharmacyCostPlan[];
  analysis: InvestmentAnalysis;
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
  saving: boolean;
  deletingId: number | null;
  savingActualRowId: string | null;
  getActualDraftValue: (row: InvestmentPlanRow) => string;
  setActualDraftValue: (row: InvestmentPlanRow, value: string) => void;
  onSaveActualRow: (row: InvestmentPlanRow) => void;
  onEditPlan: (plan: PharmacyCostPlan) => void;
  onDeletePlan: (plan: PharmacyCostPlan) => void;
  onExportCSV: () => void;
};

export default function InvestmentPlanTable({
  isArabic,
  t,
  currency,
  loadingPlans,
  planRows,
  plans,
  analysis,
  canManageCosts,
  isSubscriptionExpired,
  saving,
  deletingId,
  savingActualRowId,
  getActualDraftValue,
  setActualDraftValue,
  onSaveActualRow,
  onEditPlan,
  onDeletePlan,
  onExportCSV,
}: InvestmentPlanTableProps) {
  return (
    <>
      <div className="cardHeader purchasesHistoryHeader">
        <h2>{isArabic ? "خطة التكاليف المتوقعة" : "Expected Cost Plan"}</h2>
        <button type="button" className="printBtn" onClick={onExportCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      {loadingPlans ? (
        <p className="empty">{isArabic ? "جاري تحميل الخطة..." : "Loading plan..."}</p>
      ) : planRows.length === 0 ? (
        <p className="empty">
          {isArabic
            ? "لا توجد بنود في خطة هذا الشهر — أضف بنداً أو انتظر إنشاء الخطة الافتراضية"
            : "No plan lines for this month"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التصنيف" : "Category"}</th>
                <th>{isArabic ? "المخطط" : "Planned"}</th>
                <th>{isArabic ? "الفعلي" : "Actual"}</th>
                <th>{isArabic ? "الفرق" : "Variance"}</th>
                {canManageCosts && <th>{t.action}</th>}
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.id} className={row.isOrphanActual ? "investmentOrphanRow" : ""}>
                  <td>
                    {row.title}
                    {row.isOrphanActual && (
                      <span className="investmentOrphanTag">
                        {isArabic ? "مصروف بدون خطة" : "Unplanned"}
                      </span>
                    )}
                  </td>
                  <td>{getCategoryLabel(row.category, isArabic)}</td>
                  <td>
                    {row.planned.toFixed(2)} {currency}
                  </td>
                  <td>
                    {canManageCosts && !isSubscriptionExpired ? (
                      <div className="investmentActualCell">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="investmentInlineInput"
                          value={getActualDraftValue(row)}
                          placeholder="0"
                          disabled={savingActualRowId === rowDraftKey(row)}
                          onChange={(e) => setActualDraftValue(row, e.target.value)}
                          onBlur={() => void onSaveActualRow(row)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        <span className="investmentInlineCurrency">{currency}</span>
                      </div>
                    ) : (
                      <>
                        {row.actual.toFixed(2)} {currency}
                      </>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        row.variance > 0
                          ? "investmentVariance investmentVariance--over"
                          : row.variance < 0
                            ? "investmentVariance investmentVariance--under"
                            : "investmentVariance"
                      }
                    >
                      {formatVariance(row.variance, currency)}
                    </span>
                  </td>
                  {canManageCosts && row.planId && (
                    <td>
                      <div className="actionButtons purchaseRowActions">
                        <button
                          type="button"
                          className="editBtn"
                          disabled={isSubscriptionExpired || saving}
                          onClick={() => {
                            const plan = plans.find((item) => item.id === row.planId);
                            if (plan) onEditPlan(plan);
                          }}
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={isSubscriptionExpired || deletingId === row.planId}
                          onClick={() => {
                            const plan = plans.find((item) => item.id === row.planId);
                            if (plan) void onDeletePlan(plan);
                          }}
                        >
                          {deletingId === row.planId ? "..." : t.delete}
                        </button>
                      </div>
                    </td>
                  )}
                  {canManageCosts && !row.planId && <td>-</td>}
                </tr>
              ))}
              <tr className="investmentTotalsRow">
                <td colSpan={2}>
                  <strong>{isArabic ? "الإجمالي" : "Total"}</strong>
                </td>
                <td>
                  <strong>
                    {analysis.plannedTotal.toFixed(2)} {currency}
                  </strong>
                </td>
                <td>
                  <strong>
                    {analysis.actualTotal.toFixed(2)} {currency}
                  </strong>
                </td>
                <td>
                  <strong
                    className={
                      analysis.actualTotal - analysis.plannedTotal > 0 ? "negative" : "positive"
                    }
                  >
                    {formatVariance(analysis.actualTotal - analysis.plannedTotal, currency)}
                  </strong>
                </td>
                {canManageCosts && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
