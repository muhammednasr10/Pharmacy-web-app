import type { InvestmentPlanRow } from "../../utils/investmentAnalysis";

export function formatVariance(value: number, currency: string) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)} ${currency}`;
}

export function formatRatioPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return (value * 100).toFixed(1);
}

export function rowDraftKey(row: InvestmentPlanRow) {
  return String(row.id);
}
