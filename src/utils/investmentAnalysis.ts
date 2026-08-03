import type { Invoice, PharmacyCost, PharmacyCostPlan } from "../types";
import { getCostCategoryLabel } from "./costCategories";

export type InvestmentPlanRow = {
  id: number | string;
  planId?: number;
  costId?: number;
  title: string;
  category: string;
  planned: number;
  actual: number;
  variance: number;
  isOrphanActual?: boolean;
};

export type InvestmentVerdict = "success" | "warning" | "fail";

export type InvestmentAnalysis = {
  salesTotal: number;
  profitTotal: number;
  plannedTotal: number;
  actualTotal: number;
  netAfterCosts: number;
  costToSalesRatio: number;
  profitCoversCosts: boolean;
  withinBudget: boolean;
  verdict: InvestmentVerdict;
  verdictLabelAr: string;
  verdictLabelEn: string;
  verdictHintAr: string;
  verdictHintEn: string;
};

export function formatPlanMonthInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getYearPlanMonths(year: string | number) {
  const yearText = String(year);
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return `${yearText}-${month}`;
  });
}

export function getPlanYear(planMonth: string) {
  return planMonth.split("-")[0] || String(new Date().getFullYear());
}

function matchCostToPlan(plan: PharmacyCostPlan, monthCosts: PharmacyCost[]) {
  const title = plan.title.trim().toLowerCase();
  return monthCosts.find(
    (cost) =>
      cost.category === plan.category && String(cost.title ?? "").trim().toLowerCase() === title,
  );
}

export function getPlanMonthBounds(planMonth: string) {
  const [yearText, monthText] = planMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month) {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

function parseCostDate(cost: PharmacyCost) {
  return new Date(cost.createdAt || cost.date || 0);
}

export function filterCostsForMonth(costs: PharmacyCost[], planMonth: string) {
  const { from, to } = getPlanMonthBounds(planMonth);
  return costs.filter((cost) => {
    const date = parseCostDate(cost);
    return date >= from && date <= to;
  });
}

export function filterInvoicesForMonth(invoices: Invoice[], planMonth: string) {
  const { from, to } = getPlanMonthBounds(planMonth);
  return invoices.filter((invoice) => {
    const date = new Date(invoice.createdAt || invoice.date || 0);
    return date >= from && date <= to;
  });
}

export function sumActualByCategory(costs: PharmacyCost[]) {
  return costs.reduce<Record<string, number>>((result, cost) => {
    const key = cost.category || "other";
    result[key] = (result[key] || 0) + Number(cost.amount || 0);
    return result;
  }, {});
}

export function buildInvestmentPlanRows(
  plans: PharmacyCostPlan[],
  monthCosts: PharmacyCost[],
): InvestmentPlanRow[] {
  const usedCostIds = new Set<number>();

  const rows: InvestmentPlanRow[] = plans.map((plan) => {
    const matched = matchCostToPlan(plan, monthCosts);
    if (matched?.id) usedCostIds.add(matched.id);
    const actual = matched ? Number(matched.amount || 0) : 0;
    const planned = Number(plan.plannedAmount || 0);
    return {
      id: plan.id,
      planId: plan.id,
      costId: matched?.id,
      title: plan.title,
      category: plan.category,
      planned,
      actual,
      variance: actual - planned,
    };
  });

  for (const cost of monthCosts) {
    if (cost.id && usedCostIds.has(cost.id)) continue;
    rows.push({
      id: `orphan-${cost.id ?? cost.costNumber}`,
      costId: cost.id,
      title: cost.title,
      category: cost.category || "other",
      planned: 0,
      actual: Number(cost.amount || 0),
      variance: Number(cost.amount || 0),
      isOrphanActual: true,
    });
  }

  return rows.sort((a, b) => b.actual - a.actual || b.planned - a.planned);
}

export function analyzeInvestment(input: {
  planMonth: string;
  plans: PharmacyCostPlan[];
  costs: PharmacyCost[];
  invoices: Invoice[];
  safeNumber: (value: unknown) => number;
}): InvestmentAnalysis {
  const monthCosts = filterCostsForMonth(input.costs, input.planMonth);
  const monthInvoices = filterInvoicesForMonth(input.invoices, input.planMonth);

  const salesTotal = monthInvoices.reduce(
    (sum, invoice) => sum + input.safeNumber(invoice.total),
    0,
  );
  const profitTotal = monthInvoices.reduce(
    (sum, invoice) => sum + input.safeNumber(invoice.totalProfit),
    0,
  );
  const plannedTotal = input.plans.reduce(
    (sum, plan) => sum + input.safeNumber(plan.plannedAmount),
    0,
  );
  const actualTotal = monthCosts.reduce(
    (sum, cost) => sum + input.safeNumber(cost.amount),
    0,
  );
  const netAfterCosts = profitTotal - actualTotal;
  const costToSalesRatio =
    salesTotal > 0 ? actualTotal / salesTotal : actualTotal > 0 ? 1 : 0;
  const profitCoversCosts = netAfterCosts > 0;
  const withinBudget = plannedTotal <= 0 ? actualTotal === 0 : actualTotal <= plannedTotal * 1.05;

  let verdict: InvestmentVerdict = "fail";
  if (profitCoversCosts && withinBudget) {
    verdict = "success";
  } else if (profitCoversCosts || salesTotal > actualTotal) {
    verdict = "warning";
  }

  const verdictLabels = {
    success: {
      ar: "استثمار ناجح",
      en: "Successful investment",
      hintAr: "الأرباح تغطي التكاليف الفعلية وأنت ضمن الخطة المتوقعة.",
      hintEn: "Profit covers actual costs and you are within the planned budget.",
    },
    warning: {
      ar: "استثمار مقبول مع ملاحظات",
      en: "Acceptable with notes",
      hintAr: "الوضع المالي مقبول لكن راجع تجاوز الخطة أو ضغط التكاليف على الأرباح.",
      hintEn: "Financially acceptable but review budget overrun or cost pressure on profit.",
    },
    fail: {
      ar: "استثمار غير ناجح",
      en: "Investment not successful",
      hintAr: "التكاليف الفعلية أعلى من الأرباح أو المبيعات لا تغطي المصروفات.",
      hintEn: "Actual costs exceed profit or sales do not cover expenses.",
    },
  }[verdict];

  return {
    salesTotal,
    profitTotal,
    plannedTotal,
    actualTotal,
    netAfterCosts,
    costToSalesRatio,
    profitCoversCosts,
    withinBudget,
    verdict,
    verdictLabelAr: verdictLabels.ar,
    verdictLabelEn: verdictLabels.en,
    verdictHintAr: verdictLabels.hintAr,
    verdictHintEn: verdictLabels.hintEn,
  };
}

export function formatPlanMonthLabel(planMonth: string, isArabic: boolean) {
  const [yearText, monthText] = planMonth.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  if (Number.isNaN(date.getTime())) return planMonth;
  return date.toLocaleDateString(isArabic ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getCategoryLabel(category: string, isArabic: boolean) {
  return getCostCategoryLabel(category, isArabic);
}
