import type { InvestmentAnalysis } from "../../utils/investmentAnalysis";
import { formatRatioPercent } from "./costsFormatters";

type InvestmentVerdictProps = {
  isArabic: boolean;
  currency: string;
  analysis: InvestmentAnalysis;
};

export default function InvestmentVerdict({
  isArabic,
  currency,
  analysis,
}: InvestmentVerdictProps) {
  const verdictLabel = isArabic ? analysis.verdictLabelAr : analysis.verdictLabelEn;
  const verdictHint = isArabic ? analysis.verdictHintAr : analysis.verdictHintEn;

  return (
    <div className={`investmentVerdict investmentVerdict--${analysis.verdict}`} role="status">
      <div className="investmentVerdictMain">
        <strong>{verdictLabel}</strong>
        <p>{verdictHint}</p>
      </div>
      <div className="investmentVerdictStats">
        <span>
          {isArabic ? "نسبة التكلفة للمبيعات" : "Cost / sales"}:{" "}
          <strong>{formatRatioPercent(analysis.costToSalesRatio)}%</strong>
        </span>
        <span>
          {isArabic ? "صافي بعد التكاليف" : "Net after costs"}:{" "}
          <strong className={analysis.netAfterCosts >= 0 ? "positive" : "negative"}>
            {analysis.netAfterCosts.toFixed(2)} {currency}
          </strong>
        </span>
      </div>
    </div>
  );
}
