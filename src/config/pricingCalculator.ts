import { getYearlyPlanAmount, YEARLY_SUBSCRIPTION_DISCOUNT } from "./subscription";

export type PricingBillingCycle = "monthly" | "yearly";

export type PricingCalculatorConfig = {
  pricePerBranch: number;
  pricePerUser: number;
  staffAddonEnabled: boolean;
  staffAddonPrice: number;
  staffAddonTitleAr: string;
  staffAddonTitleEn: string;
  staffAddonDescAr: string;
  staffAddonDescEn: string;
  customersAddonEnabled: boolean;
  customersAddonPrice: number;
  customersAddonTitleAr: string;
  customersAddonTitleEn: string;
  customersAddonDescAr: string;
  customersAddonDescEn: string;
  investmentAddonEnabled: boolean;
  investmentAddonPrice: number;
  investmentAddonTitleAr: string;
  investmentAddonTitleEn: string;
  investmentAddonDescAr: string;
  investmentAddonDescEn: string;
};

export type PricingCalculatorQuote = {
  branches: number;
  users: number;
  staffAddon: boolean;
  customersAddon: boolean;
  investmentAddon: boolean;
  monthlyPrice: number;
  billingCycle: PricingBillingCycle;
};

export const DEFAULT_PRICING_CALCULATOR_CONFIG: PricingCalculatorConfig = {
  pricePerBranch: 200,
  pricePerUser: 50,
  staffAddonEnabled: true,
  staffAddonPrice: 150,
  staffAddonTitleAr: "الموظفين",
  staffAddonTitleEn: "Staff",
  staffAddonDescAr: "إدارة الموظفين والصلاحيات + صفحة بروفايلى (نفس السعر)",
  staffAddonDescEn: "Staff management and permissions + My Profile (same price)",
  customersAddonEnabled: true,
  customersAddonPrice: 100,
  customersAddonTitleAr: "العملاء",
  customersAddonTitleEn: "Customers",
  customersAddonDescAr: "دفتر العملاء والمديونية والتحصيل داخل الصيدلية",
  customersAddonDescEn: "Customer book, credit balances, and collections inside the pharmacy",
  investmentAddonEnabled: true,
  investmentAddonPrice: 100,
  investmentAddonTitleAr: "الاستثمار",
  investmentAddonTitleEn: "Investment",
  investmentAddonDescAr: "خطة الاستثمار والتكاليف التشغيلية ومتابعة العائد داخل الصيدلية",
  investmentAddonDescEn: "Investment plan, operating costs, and return tracking inside the pharmacy",
};

export const PRICING_QUOTE_STORAGE_KEY = "victory_pricing_quote_v1";

export function clampPricingCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function normalizePricingBillingCycle(value: unknown): PricingBillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

export function getYearlyDiscountPercent() {
  return Math.round(YEARLY_SUBSCRIPTION_DISCOUNT * 100);
}

/** Total charged for the selected billing cycle (yearly = 12 months with discount). */
export function getQuoteBillingAmount(
  monthlyPrice: number,
  billingCycle: PricingBillingCycle = "monthly",
): number {
  const monthly = Math.max(0, Math.round(monthlyPrice));
  if (billingCycle === "yearly") return getYearlyPlanAmount(monthly);
  return monthly;
}

export function computePricingQuote(
  config: PricingCalculatorConfig,
  input: {
    branches: number;
    users: number;
    staffAddon: boolean;
    customersAddon?: boolean;
    investmentAddon?: boolean;
    billingCycle?: PricingBillingCycle;
  },
): PricingCalculatorQuote {
  const branches = clampPricingCount(input.branches, 1, 50);
  const users = clampPricingCount(input.users, 1, 200);
  const staffAddon = Boolean(config.staffAddonEnabled && input.staffAddon);
  const customersAddon = Boolean(config.customersAddonEnabled && input.customersAddon);
  const investmentAddon = Boolean(config.investmentAddonEnabled && input.investmentAddon);
  const monthlyPrice =
    branches * Math.max(0, config.pricePerBranch) +
    users * Math.max(0, config.pricePerUser) +
    (staffAddon ? Math.max(0, config.staffAddonPrice) : 0) +
    (customersAddon ? Math.max(0, config.customersAddonPrice) : 0) +
    (investmentAddon ? Math.max(0, config.investmentAddonPrice) : 0);

  return {
    branches,
    users,
    staffAddon,
    customersAddon,
    investmentAddon,
    monthlyPrice: Math.round(monthlyPrice),
    billingCycle: normalizePricingBillingCycle(input.billingCycle),
  };
}

export function savePricingQuote(quote: PricingCalculatorQuote) {
  try {
    sessionStorage.setItem(PRICING_QUOTE_STORAGE_KEY, JSON.stringify(quote));
  } catch {
    // ignore storage failures
  }
}

export function loadPricingQuote(): PricingCalculatorQuote | null {
  try {
    const raw = sessionStorage.getItem(PRICING_QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PricingCalculatorQuote>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      branches: clampPricingCount(Number(parsed.branches) || 1, 1, 50),
      users: clampPricingCount(Number(parsed.users) || 1, 1, 200),
      staffAddon: Boolean(parsed.staffAddon),
      customersAddon: Boolean(parsed.customersAddon),
      investmentAddon: Boolean(parsed.investmentAddon),
      monthlyPrice: Math.max(0, Math.round(Number(parsed.monthlyPrice) || 0)),
      billingCycle: normalizePricingBillingCycle(parsed.billingCycle),
    };
  } catch {
    return null;
  }
}

export function clearPricingQuote() {
  try {
    sessionStorage.removeItem(PRICING_QUOTE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
