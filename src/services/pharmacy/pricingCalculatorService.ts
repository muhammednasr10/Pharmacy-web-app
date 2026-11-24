import { supabase } from "../supabaseClient";
import {
  DEFAULT_PRICING_CALCULATOR_CONFIG,
  type PricingCalculatorConfig,
} from "../../config/pricingCalculator";

type PricingCalculatorRow = {
  id?: string;
  price_per_branch?: number | string | null;
  price_per_user?: number | string | null;
  staff_addon_enabled?: boolean | null;
  staff_addon_price?: number | string | null;
  staff_addon_title_ar?: string | null;
  staff_addon_title_en?: string | null;
  staff_addon_desc_ar?: string | null;
  staff_addon_desc_en?: string | null;
  customers_addon_enabled?: boolean | null;
  customers_addon_price?: number | string | null;
  customers_addon_title_ar?: string | null;
  customers_addon_title_en?: string | null;
  customers_addon_desc_ar?: string | null;
  customers_addon_desc_en?: string | null;
  investment_addon_enabled?: boolean | null;
  investment_addon_price?: number | string | null;
  investment_addon_title_ar?: string | null;
  investment_addon_title_en?: string | null;
  investment_addon_desc_ar?: string | null;
  investment_addon_desc_en?: string | null;
};

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapPricingCalculatorRow(row?: PricingCalculatorRow | null): PricingCalculatorConfig {
  if (!row) return { ...DEFAULT_PRICING_CALCULATOR_CONFIG };
  return {
    pricePerBranch: Math.max(0, toNumber(row.price_per_branch, DEFAULT_PRICING_CALCULATOR_CONFIG.pricePerBranch)),
    pricePerUser: Math.max(0, toNumber(row.price_per_user, DEFAULT_PRICING_CALCULATOR_CONFIG.pricePerUser)),
    staffAddonEnabled: row.staff_addon_enabled !== false,
    staffAddonPrice: Math.max(0, toNumber(row.staff_addon_price, DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonPrice)),
    staffAddonTitleAr:
      String(row.staff_addon_title_ar || "").trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonTitleAr,
    staffAddonTitleEn:
      String(row.staff_addon_title_en || "").trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonTitleEn,
    staffAddonDescAr:
      String(row.staff_addon_desc_ar || "").trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonDescAr,
    staffAddonDescEn:
      String(row.staff_addon_desc_en || "").trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonDescEn,
    customersAddonEnabled: row.customers_addon_enabled !== false,
    customersAddonPrice: Math.max(
      0,
      toNumber(row.customers_addon_price, DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonPrice),
    ),
    customersAddonTitleAr:
      String(row.customers_addon_title_ar || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonTitleAr,
    customersAddonTitleEn:
      String(row.customers_addon_title_en || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonTitleEn,
    customersAddonDescAr:
      String(row.customers_addon_desc_ar || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonDescAr,
    customersAddonDescEn:
      String(row.customers_addon_desc_en || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonDescEn,
    investmentAddonEnabled: row.investment_addon_enabled !== false,
    investmentAddonPrice: Math.max(
      0,
      toNumber(row.investment_addon_price, DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonPrice),
    ),
    investmentAddonTitleAr:
      String(row.investment_addon_title_ar || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonTitleAr,
    investmentAddonTitleEn:
      String(row.investment_addon_title_en || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonTitleEn,
    investmentAddonDescAr:
      String(row.investment_addon_desc_ar || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonDescAr,
    investmentAddonDescEn:
      String(row.investment_addon_desc_en || "").trim() ||
      DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonDescEn,
  };
}

export async function loadPricingCalculatorConfig(): Promise<PricingCalculatorConfig> {
  const { data, error } = await supabase
    .from("pricing_calculator_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("loadPricingCalculatorConfig error:", error.message);
    return { ...DEFAULT_PRICING_CALCULATOR_CONFIG };
  }

  return mapPricingCalculatorRow(data as PricingCalculatorRow | null);
}

export async function savePricingCalculatorConfig(
  input: PricingCalculatorConfig,
  operatorUid?: string,
): Promise<PricingCalculatorConfig> {
  const payload = {
    id: "default",
    price_per_branch: Math.max(0, Number(input.pricePerBranch) || 0),
    price_per_user: Math.max(0, Number(input.pricePerUser) || 0),
    staff_addon_enabled: Boolean(input.staffAddonEnabled),
    staff_addon_price: Math.max(0, Number(input.staffAddonPrice) || 0),
    staff_addon_title_ar: input.staffAddonTitleAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonTitleAr,
    staff_addon_title_en: input.staffAddonTitleEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonTitleEn,
    staff_addon_desc_ar: input.staffAddonDescAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonDescAr,
    staff_addon_desc_en: input.staffAddonDescEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.staffAddonDescEn,
    customers_addon_enabled: Boolean(input.customersAddonEnabled),
    customers_addon_price: Math.max(0, Number(input.customersAddonPrice) || 0),
    customers_addon_title_ar:
      input.customersAddonTitleAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonTitleAr,
    customers_addon_title_en:
      input.customersAddonTitleEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonTitleEn,
    customers_addon_desc_ar:
      input.customersAddonDescAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonDescAr,
    customers_addon_desc_en:
      input.customersAddonDescEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.customersAddonDescEn,
    investment_addon_enabled: Boolean(input.investmentAddonEnabled),
    investment_addon_price: Math.max(0, Number(input.investmentAddonPrice) || 0),
    investment_addon_title_ar:
      input.investmentAddonTitleAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonTitleAr,
    investment_addon_title_en:
      input.investmentAddonTitleEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonTitleEn,
    investment_addon_desc_ar:
      input.investmentAddonDescAr.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonDescAr,
    investment_addon_desc_en:
      input.investmentAddonDescEn.trim() || DEFAULT_PRICING_CALCULATOR_CONFIG.investmentAddonDescEn,
    updated_at: new Date().toISOString(),
    updated_by: operatorUid || null,
  };

  const { data, error } = await supabase
    .from("pricing_calculator_config")
    .upsert([payload], { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPricingCalculatorRow(data as PricingCalculatorRow);
}
