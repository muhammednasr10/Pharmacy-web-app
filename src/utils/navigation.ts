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
  hr: "👔",
  employeePortal: "🕐",
};

export type NavItem = { page: Page; label: string };

export function buildNavigationItems(
  allowedPages: Page[],
  isArabic: boolean,
  t: Record<string, string>,
): NavItem[] {
  return allowedPages.map((page) => {
    switch (page) {
      case "dashboard":
        return { page, label: t.dashboard };
      case "inventory":
        return { page, label: t.inventory };
      case "pos":
        return { page, label: t.pos };
      case "invoices":
        return { page, label: t.invoices };
      case "returns":
        return { page, label: isArabic ? "المرتجعات" : "Returns" };
      case "purchases":
        return { page, label: isArabic ? "المشتريات" : "Purchases" };
      case "costs":
        return { page, label: isArabic ? "التكاليف" : "Costs" };
      case "customers":
        return { page, label: isArabic ? "العملاء" : "Customers" };
      case "reports":
        return { page, label: t.reports };
      case "stockMovements":
        return { page, label: isArabic ? "حركة المخزون" : "Stock Movements" };
      case "activityLogs":
        return { page, label: isArabic ? "سجل النشاط" : "Activity Log" };
      case "users":
        return { page, label: isArabic ? "الموظفين والمستخدمين" : "Staff & Accounts" };
      case "branches":
        return { page, label: isArabic ? "الفروع" : "Branches" };
      case "tenants":
        return { page, label: isArabic ? "الصيدليات (SaaS)" : "Pharmacies (SaaS)" };
      case "sqlMigrations":
        return { page, label: isArabic ? "حالة SQL" : "SQL status" };
      case "settings":
        return { page, label: isArabic ? "الإعدادات" : "Settings" };
      case "employeePortal":
        return { page, label: isArabic ? "حضوري" : "My Attendance" };
      default:
        return { page, label: page };
    }
  });
}
