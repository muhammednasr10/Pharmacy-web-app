import { PROGRAM_PAGES, type ProgramPageKey } from "../components/login-welcome/programPages";
import { getSubscriptionTier, type SubscriptionTier } from "../config/subscriptionTiers";
import { getTierPageLabel } from "../config/subscriptionTierPages";
import type { Page, PharmacySettings } from "../types";

export const LIMIT_CHANGE_PLAN_PREFIX = "limit_change:";

export type SubscriptionLimitChange = {
  branches: number;
  users: number;
  staffAddon: boolean;
  customersAddon: boolean;
  investmentAddon: boolean;
};

export function buildLimitChangePlan(input: SubscriptionLimitChange): string {
  const branches = Math.max(1, Math.floor(Number(input.branches) || 1));
  const users = Math.max(1, Math.floor(Number(input.users) || 1));
  return (
    `${LIMIT_CHANGE_PLAN_PREFIX}` +
    `b=${branches},u=${users},` +
    `staff=${input.staffAddon ? 1 : 0},` +
    `customers=${input.customersAddon ? 1 : 0},` +
    `investment=${input.investmentAddon ? 1 : 0}`
  );
}

export function parseLimitChangePlan(plan: string): SubscriptionLimitChange | null {
  if (!plan.startsWith(LIMIT_CHANGE_PLAN_PREFIX)) return null;
  const raw = plan.slice(LIMIT_CHANGE_PLAN_PREFIX.length);
  const parts = Object.fromEntries(
    raw.split(",").map((chunk) => {
      const [key, value] = chunk.split("=");
      return [String(key || "").trim(), String(value || "").trim()];
    }),
  );
  const branches = Number(parts.b || parts.branches);
  const users = Number(parts.u || parts.users);
  if (!Number.isFinite(branches) || branches < 1) return null;
  if (!Number.isFinite(users) || users < 1) return null;
  return {
    branches: Math.floor(branches),
    users: Math.floor(users),
    staffAddon: parts.staff === "1" || parts.staff === "true",
    customersAddon: parts.customers === "1" || parts.customers === "true",
    investmentAddon: parts.investment === "1" || parts.investment === "true",
  };
}

export function isLimitChangePlan(plan: string): boolean {
  return parseLimitChangePlan(plan) !== null;
}

export function resolvePharmacyAddonFlags(
  pharmacySettings: PharmacySettings | null | undefined,
  tier: SubscriptionTier,
): Pick<SubscriptionLimitChange, "staffAddon" | "customersAddon" | "investmentAddon"> {
  const enabled = new Set(getSubscriptionTier(tier).enabledPages);
  return {
    staffAddon:
      pharmacySettings?.staffAddon != null
        ? Boolean(pharmacySettings.staffAddon)
        : enabled.has("users") || enabled.has("employeePortal"),
    customersAddon:
      pharmacySettings?.customersAddon != null
        ? Boolean(pharmacySettings.customersAddon)
        : enabled.has("customers"),
    investmentAddon:
      pharmacySettings?.investmentAddon != null
        ? Boolean(pharmacySettings.investmentAddon)
        : enabled.has("costs"),
  };
}

export type SubscriptionPageAccessRow = {
  key: ProgramPageKey;
  label: string;
  included: boolean;
  isAddon: boolean;
};

export function buildSubscriptionPageAccessRows(input: {
  isArabic: boolean;
  tier: SubscriptionTier;
  staffAddon: boolean;
  customersAddon: boolean;
  investmentAddon: boolean;
}): SubscriptionPageAccessRow[] {
  const tierEnabled = new Set(getSubscriptionTier(input.tier).enabledPages);

  return PROGRAM_PAGES.map((page) => {
    let included = tierEnabled.has(page.key as Page);
    if (page.key === "dashboard" || page.key === "settings") included = true;
    if (page.key === "users" || page.key === "employeePortal") included = input.staffAddon;
    if (page.key === "customers") included = input.customersAddon;
    if (page.key === "costs") included = input.investmentAddon;

    return {
      key: page.key,
      label: input.isArabic ? page.ar : page.en,
      included,
      isAddon: Boolean(page.hasCheckbox),
    };
  });
}

export function filterPagesByPharmacyAddons(
  pages: Page[],
  pharmacySettings: PharmacySettings | null | undefined,
  rolePages: Page[] = pages,
): Page[] {
  if (!pharmacySettings) return pages;
  const next = new Set(pages);
  const roleSet = new Set(rolePages);

  const syncAddon = (flag: boolean | null | undefined, addonPages: Page[]) => {
    if (flag === true) {
      for (const page of addonPages) {
        if (roleSet.has(page)) next.add(page);
      }
      return;
    }
    if (flag === false) {
      for (const page of addonPages) next.delete(page);
    }
  };

  syncAddon(pharmacySettings.staffAddon, ["users", "employeePortal", "hr"]);
  syncAddon(pharmacySettings.customersAddon, ["customers"]);
  syncAddon(pharmacySettings.investmentAddon, ["costs"]);

  const ordered = rolePages.filter((page) => next.has(page));
  for (const page of next) {
    if (!ordered.includes(page)) ordered.push(page);
  }
  return ordered;
}

export function formatLimitChangeSummary(
  change: SubscriptionLimitChange,
  isArabic: boolean,
): string {
  const addons = [
    change.staffAddon ? (isArabic ? "موظفين" : "staff") : null,
    change.customersAddon ? (isArabic ? "عملاء" : "customers") : null,
    change.investmentAddon ? (isArabic ? "استثمار" : "investment") : null,
  ].filter(Boolean);

  const addonText = addons.length
    ? addons.join(isArabic ? " · " : " · ")
    : isArabic
      ? "بدون إضافات"
      : "no add-ons";

  return isArabic
    ? `${change.branches} فرع · ${change.users} مستخدم · ${addonText}`
    : `${change.branches} branches · ${change.users} users · ${addonText}`;
}

export function getPageAccessStatusLabel(included: boolean, isArabic: boolean): string {
  if (included) return isArabic ? "مشترك" : "Included";
  return isArabic ? "غير مشترك" : "Not included";
}

export function getProgramPageLabel(pageKey: string, isArabic: boolean): string {
  const fromProgram = PROGRAM_PAGES.find((page) => page.key === pageKey);
  if (fromProgram) return isArabic ? fromProgram.ar : fromProgram.en;
  return getTierPageLabel(pageKey as Page, isArabic);
}
