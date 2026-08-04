import type { Page } from "../types";

export const pageIcons: Record<Page, string> = {
  dashboard: "🏠",
  inventory: "🧬",
  pos: "💳",
  invoices: "🧾",
  returns: "↩️",
  purchases: "📦",
  costs: "💸",
  customers: "👥",
  reports: "📊",
  stockMovements: "🔄",
  activityLogs: "📜",
  users: "👤",
  branches: "🏢",
  tenants: "🏪",
  sqlMigrations: "🗄️",
  settings: "⚙️",
  userGuide: "📖",
  hr: "👔",
  employeePortal: "🕐",
};

export const BILLING_NAV_PAGES: Page[] = ["invoices", "purchases", "returns"];
export const BILLING_NAV_GROUP_ID = "billing" as const;

export type NavItem = { page: Page; label: string; locked?: boolean };

export type NavPageEntry = { kind: "page"; page: Page; label: string; locked?: boolean };

export type NavGroupEntry = {
  kind: "group";
  id: typeof BILLING_NAV_GROUP_ID;
  label: string;
  icon: string;
  children: NavPageEntry[];
};

export type NavEntry = NavPageEntry | NavGroupEntry;

export function getPageLabel(page: Page, isArabic: boolean, t: Record<string, string>): string {
  switch (page) {
    case "dashboard":
      return t.dashboard;
    case "inventory":
      return isArabic ? "إدارة المخزن" : "Inventory Management";
    case "pos":
      return t.pos;
    case "invoices":
      return isArabic ? "المبيعات" : "Sales";
    case "returns":
      return isArabic ? "المرتجعات" : "Returns";
    case "purchases":
      return isArabic ? "المشتريات" : "Purchases";
    case "costs":
      return isArabic ? "استثمارى" : "Investment";
    case "customers":
      return isArabic ? "العملاء (CRM)" : "Customers (CRM)";
    case "reports":
      return t.reports;
    case "stockMovements":
      return isArabic ? "حركة المخزون" : "Stock Movements";
    case "activityLogs":
      return isArabic ? "سجل النشاط" : "Activity Log";
    case "users":
      return isArabic ? "الموظفين" : "Staff";
    case "branches":
      return isArabic ? "الفروع" : "Branches";
    case "tenants":
      return isArabic ? "الصيدليات (SaaS)" : "Pharmacies (SaaS)";
    case "sqlMigrations":
      return isArabic ? "حالة SQL" : "SQL status";
    case "settings":
      return isArabic ? "الإعدادات" : "Settings";
    case "userGuide":
      return isArabic ? "دليل الاستخدام" : "User guide";
    case "employeePortal":
      return isArabic ? "بروفايلى" : "My Profile";
    default:
      return page;
  }
}

function buildPageEntry(
  page: Page,
  isArabic: boolean,
  t: Record<string, string>,
  lockedPages?: Set<Page>,
): NavPageEntry {
  return {
    kind: "page",
    page,
    label: getPageLabel(page, isArabic, t),
    locked: lockedPages?.has(page) ?? false,
  };
}

export function isBillingNavPage(page: Page): boolean {
  return BILLING_NAV_PAGES.includes(page);
}

export function flattenNavigationEntries(entries: NavEntry[]): NavItem[] {
  const items: NavItem[] = [];
  for (const entry of entries) {
    if (entry.kind === "page") {
      items.push({ page: entry.page, label: entry.label, locked: entry.locked });
      continue;
    }
    for (const child of entry.children) {
      items.push({ page: child.page, label: child.label, locked: child.locked });
    }
  }
  return items;
}

export function buildNavigationTree(
  pages: Page[],
  isArabic: boolean,
  t: Record<string, string>,
  lockedPages?: Set<Page>,
): NavEntry[] {
  const mergedPages = pages.filter((page) => page !== "stockMovements" && page !== "costs");
  const billingChildren = BILLING_NAV_PAGES.filter((page) => mergedPages.includes(page)).map((page) =>
    buildPageEntry(page, isArabic, t, lockedPages),
  );

  const entries: NavEntry[] = [];
  let billingGroupInserted = false;

  for (const page of mergedPages) {
    if (isBillingNavPage(page)) {
      if (!billingGroupInserted && billingChildren.length > 0) {
        entries.push({
          kind: "group",
          id: BILLING_NAV_GROUP_ID,
          label: isArabic ? "الفواتير" : "Invoices",
          icon: "🧾",
          children: billingChildren,
        });
        billingGroupInserted = true;
      }
      continue;
    }

    entries.push(buildPageEntry(page, isArabic, t, lockedPages));
  }

  return entries;
}

export function buildNavigationItems(
  pages: Page[],
  isArabic: boolean,
  t: Record<string, string>,
  lockedPages?: Set<Page>,
): NavItem[] {
  return flattenNavigationEntries(buildNavigationTree(pages, isArabic, t, lockedPages));
}
