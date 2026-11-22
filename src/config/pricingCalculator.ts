export type PricingCalculatorConfig = {
  pricePerBranch: number;
  pricePerUser: number;
  staffAddonEnabled: boolean;
  staffAddonPrice: number;
  staffAddonTitleAr: string;
  staffAddonTitleEn: string;
  staffAddonDescAr: string;
  staffAddonDescEn: string;
};

export type PricingCalculatorQuote = {
  branches: number;
  users: number;
  staffAddon: boolean;
  monthlyPrice: number;
};

export const DEFAULT_PRICING_CALCULATOR_CONFIG: PricingCalculatorConfig = {
  pricePerBranch: 200,
  pricePerUser: 50,
  staffAddonEnabled: true,
  staffAddonPrice: 150,
  staffAddonTitleAr: "الموظفين",
  staffAddonTitleEn: "Staff",
  staffAddonDescAr: "إدارة الموظفين والحسابات والصلاحيات داخل الصيدلية",
  staffAddonDescEn: "Manage staff accounts and permissions inside the pharmacy",
};

export const PRICING_QUOTE_STORAGE_KEY = "victory_pricing_quote_v1";

export function clampPricingCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function computePricingQuote(
  config: PricingCalculatorConfig,
  input: { branches: number; users: number; staffAddon: boolean },
): PricingCalculatorQuote {
  const branches = clampPricingCount(input.branches, 1, 50);
  const users = clampPricingCount(input.users, 1, 200);
  const staffAddon = Boolean(config.staffAddonEnabled && input.staffAddon);
  const monthlyPrice =
    branches * Math.max(0, config.pricePerBranch) +
    users * Math.max(0, config.pricePerUser) +
    (staffAddon ? Math.max(0, config.staffAddonPrice) : 0);

  return {
    branches,
    users,
    staffAddon,
    monthlyPrice: Math.round(monthlyPrice),
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
      monthlyPrice: Math.max(0, Math.round(Number(parsed.monthlyPrice) || 0)),
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
