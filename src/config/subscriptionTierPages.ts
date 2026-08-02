import type { Page } from "../types";
import type { SubscriptionTier } from "./subscriptionTiers";

/** Pages a Super Admin may enable/disable per subscription package (tenant-facing). */
export const TIER_CONFIGURABLE_PAGES: Page[] = [
  "dashboard",
  "inventory",
  "pos",
  "invoices",
  "returns",
  "purchases",
  "costs",
  "customers",
  "reports",
  "stockMovements",
  "activityLogs",
  "users",
  "branches",
  "employeePortal",
  "settings",
  "userGuide",
];

const TIER_PAGE_LABELS: Record<Page, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  inventory: { ar: "إدارة المخزن", en: "Inventory Management" },
  pos: { ar: "نقطة البيع", en: "POS" },
  invoices: { ar: "المبيعات", en: "Sales" },
  returns: { ar: "المرتجعات", en: "Returns" },
  purchases: { ar: "المشتريات", en: "Purchases" },
  costs: { ar: "التكاليف", en: "Costs" },
  customers: { ar: "العملاء", en: "Customers" },
  reports: { ar: "التقارير", en: "Reports" },
  stockMovements: { ar: "حركة المخزون", en: "Stock movements" },
  activityLogs: { ar: "سجل النشاط", en: "Activity log" },
  users: { ar: "الموظفين والمستخدمين", en: "Staff & accounts" },
  branches: { ar: "الفروع", en: "Branches" },
  employeePortal: { ar: "حضوري", en: "My attendance" },
  settings: { ar: "الإعدادات", en: "Settings" },
  userGuide: { ar: "دليل الاستخدام", en: "User guide" },
  tenants: { ar: "الصيدليات", en: "Pharmacies" },
  sqlMigrations: { ar: "SQL", en: "SQL" },
  hr: { ar: "الموارد البشرية", en: "HR" },
};

const basicDefaultPages: Page[] = TIER_CONFIGURABLE_PAGES.filter((page) => page !== "branches");

export const defaultTierEnabledPages: Record<SubscriptionTier, Page[]> = {
  basic: [...basicDefaultPages],
  professional: [...TIER_CONFIGURABLE_PAGES],
  premium: [...TIER_CONFIGURABLE_PAGES],
};

export function getTierPageLabel(page: Page, isArabic: boolean): string {
  const labels = TIER_PAGE_LABELS[page];
  if (!labels) return page;
  return isArabic ? labels.ar : labels.en;
}

export function isTierConfigurablePage(page: Page): boolean {
  return TIER_CONFIGURABLE_PAGES.includes(page);
}

export function normalizeTierEnabledPages(
  value: unknown,
  tierId: SubscriptionTier,
): Page[] {
  const allowed = new Set(TIER_CONFIGURABLE_PAGES);
  const fallback = defaultTierEnabledPages[tierId];
  if (!Array.isArray(value)) return [...fallback];

  const pages = value
    .map((entry) => String(entry).trim())
    .filter((entry): entry is Page => allowed.has(entry as Page));

  if (!pages.length) return [...fallback];
  if (!pages.includes("dashboard")) pages.unshift("dashboard");
  return [...new Set(pages)];
}

export function sanitizeTierEnabledPagesSelection(pages: Page[]): Page[] {
  const allowed = new Set(TIER_CONFIGURABLE_PAGES);
  const normalized = pages.filter((page) => allowed.has(page));
  if (!normalized.includes("dashboard")) normalized.unshift("dashboard");
  return [...new Set(normalized)];
}
