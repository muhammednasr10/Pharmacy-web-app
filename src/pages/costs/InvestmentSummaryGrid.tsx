import type { InvestmentAnalysis } from "../../utils/investmentAnalysis";
import { formatVariance } from "./costsFormatters";

type InvestmentSummaryGridProps = {
  isArabic: boolean;
  currency: string;
  analysis: InvestmentAnalysis;
  monthCostsCount: number;
};

export default function InvestmentSummaryGrid({
  isArabic,
  currency,
  analysis,
  monthCostsCount,
}: InvestmentSummaryGridProps) {
  return (
    <div className="costsSummaryGrid investmentSummaryGrid">
      <div className="costsSummaryCard">
        <span>{isArabic ? "مبيعات الشهر" : "Month sales"}</span>
        <strong className="investmentSales">
          {analysis.salesTotal.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="costsSummaryCard">
        <span>{isArabic ? "أرباح الشهر" : "Month profit"}</span>
        <strong className="investmentProfit">
          {analysis.profitTotal.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="costsSummaryCard">
        <span>{isArabic ? "التكلفة المخططة" : "Planned costs"}</span>
        <strong>
          {analysis.plannedTotal.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="costsSummaryCard">
        <span>{isArabic ? "التكلفة الفعلية" : "Actual costs"}</span>
        <strong className="investmentActual">
          {analysis.actualTotal.toFixed(2)} {currency}
        </strong>
      </div>
      <div className="costsSummaryCard">
        <span>{isArabic ? "فرق الخطة" : "Plan variance"}</span>
        <strong
          className={
            analysis.actualTotal - analysis.plannedTotal > 0 ? "negative" : "positive"
          }
        >
          {formatVariance(analysis.actualTotal - analysis.plannedTotal, currency)}
        </strong>
      </div>
      <div className="costsSummaryCard">
        <span>{isArabic ? "سجلات فعلية" : "Actual records"}</span>
        <strong>{monthCostsCount}</strong>
      </div>
    </div>
  );
}
