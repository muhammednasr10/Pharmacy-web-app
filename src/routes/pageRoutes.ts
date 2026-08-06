import type { Page } from "../types";

/** URL paths for app pages (without basename). Most specific paths first for parsing. */
export const PATH_TO_PAGE: readonly { path: string; page: Page }[] = [
  { path: "/inventory/movements", page: "stockMovements" },
  { path: "/reports/investment", page: "costs" },
  { path: "/admin/tenants", page: "tenants" },
  { path: "/admin/sql", page: "sqlMigrations" },
  { path: "/activity-logs", page: "activityLogs" },
  { path: "/employee-portal", page: "employeePortal" },
  { path: "/dashboard", page: "dashboard" },
  { path: "/inventory", page: "inventory" },
  { path: "/pos", page: "pos" },
  { path: "/invoices", page: "invoices" },
  { path: "/returns", page: "returns" },
  { path: "/purchases", page: "purchases" },
  { path: "/customers", page: "customers" },
  { path: "/reports", page: "reports" },
  { path: "/staff", page: "users" },
  { path: "/branches", page: "branches" },
  { path: "/settings", page: "settings" },
  { path: "/guide", page: "userGuide" },
] as const;

const PAGE_TO_PATH: Partial<Record<Page, string>> = {
  dashboard: "/dashboard",
  inventory: "/inventory",
  stockMovements: "/inventory/movements",
  pos: "/pos",
  invoices: "/invoices",
  returns: "/returns",
  purchases: "/purchases",
  costs: "/reports/investment",
  customers: "/customers",
  reports: "/reports",
  activityLogs: "/activity-logs",
  users: "/staff",
  hr: "/staff",
  tenants: "/admin/tenants",
  sqlMigrations: "/admin/sql",
  branches: "/branches",
  settings: "/settings",
  userGuide: "/guide",
  employeePortal: "/employee-portal",
};

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

export function pageFromPath(pathname: string): Page {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return "dashboard";

  for (const entry of PATH_TO_PAGE) {
    if (normalized === entry.path) return entry.page;
  }

  return "dashboard";
}

export function pageToPath(page: Page): string {
  return PAGE_TO_PATH[page] ?? "/dashboard";
}

export function isPathForPage(pathname: string, page: Page): boolean {
  return normalizePathname(pathname) === normalizePathname(pageToPath(page));
}
