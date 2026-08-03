import type { BuiltinUserRole, Page } from "../types";

const branchManagerPages: Page[] = [
  "dashboard",
  "employeePortal",
  "inventory",
  "pos",
  "invoices",
  "returns",
  "purchases",
  "costs",
  "customers",
  "reports",
  "stockMovements",
  "users",
  "settings",
];

const builtinDefaultPages: Record<BuiltinUserRole, Page[]> = {
  super_admin: [
    "dashboard",
    "employeePortal",
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
    "tenants",
    "sqlMigrations",
    "settings",
    "branches",
  ],
  pharmacy_admin: [...branchManagerPages, "branches"],
  branch_manager: branchManagerPages,
  cashier: ["dashboard", "employeePortal", "pos", "invoices", "returns", "customers"],
  inventory: ["dashboard", "employeePortal", "inventory", "purchases", "stockMovements"],
  accountant: [
    "dashboard",
    "employeePortal",
    "invoices",
    "returns",
    "customers",
    "costs",
    "reports",
    "stockMovements",
    "activityLogs",
    "users",
  ],
};

export type RolePermissionKey =
  | "delete_medicines"
  | "delete_returns"
  | "delete_purchases"
  | "delete_customer_payments"
  | "manage_users"
  | "edit_org_settings"
  | "edit_branch_settings"
  | "view_org_activity_logs"
  | "export_backup"
  | "manage_org_branches"
  | "review_branch_transfers"
  | "view_inventory_cost_profit"
  | "view_pos_cost_profit";

export type RolePermissionFlags = Partial<Record<RolePermissionKey, boolean>>;

export type RolePageOption = {
  page: Page;
  labelAr: string;
  labelEn: string;
};

export const ROLE_PAGE_OPTIONS: RolePageOption[] = [
  { page: "dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard" },
  { page: "employeePortal", labelAr: "بروفايلى", labelEn: "My profile" },
  { page: "inventory", labelAr: "المخزون", labelEn: "Inventory" },
  { page: "pos", labelAr: "نقطة البيع", labelEn: "POS" },
  { page: "invoices", labelAr: "المبيعات", labelEn: "Sales" },
  { page: "returns", labelAr: "المرتجعات", labelEn: "Returns" },
  { page: "purchases", labelAr: "المشتريات", labelEn: "Purchases" },
  { page: "costs", labelAr: "استثمارى", labelEn: "Investment" },
  { page: "customers", labelAr: "العملاء", labelEn: "Customers" },
  { page: "reports", labelAr: "التقارير", labelEn: "Reports" },
  { page: "stockMovements", labelAr: "حركات المخزون", labelEn: "Stock movements" },
  { page: "users", labelAr: "الموظفين", labelEn: "Staff" },
  { page: "activityLogs", labelAr: "سجل النشاط", labelEn: "Activity log" },
  { page: "settings", labelAr: "الإعدادات", labelEn: "Settings" },
  { page: "branches", labelAr: "الفروع", labelEn: "Branches" },
  { page: "sqlMigrations", labelAr: "ترحيل SQL", labelEn: "SQL migrations" },
];

export const ROLE_PERMISSION_OPTIONS: {
  key: RolePermissionKey;
  labelAr: string;
  labelEn: string;
}[] = [
  { key: "delete_medicines", labelAr: "حذف أدوية", labelEn: "Delete medicines" },
  { key: "delete_returns", labelAr: "حذف مرتجعات", labelEn: "Delete returns" },
  { key: "delete_purchases", labelAr: "حذف مشتريات", labelEn: "Delete purchases" },
  { key: "delete_customer_payments", labelAr: "حذف دفعات عملاء", labelEn: "Delete customer payments" },
  { key: "manage_users", labelAr: "إدارة الموظفين والمستخدمين", labelEn: "Manage staff & users" },
  { key: "edit_org_settings", labelAr: "إعدادات المنظمة (اشتراك…)", labelEn: "Organization settings" },
  { key: "edit_branch_settings", labelAr: "إعدادات الفرع", labelEn: "Branch settings" },
  { key: "view_org_activity_logs", labelAr: "سجل نشاط المنظمة", labelEn: "Organization activity logs" },
  { key: "export_backup", labelAr: "تصدير نسخة احتياطية", labelEn: "Export backup" },
  { key: "manage_org_branches", labelAr: "إدارة الفروع", labelEn: "Manage branches" },
  { key: "review_branch_transfers", labelAr: "اعتماد نقل مخزون بين الفروع", labelEn: "Approve branch transfers" },
  {
    key: "view_inventory_cost_profit",
    labelAr: "عرض سعر الشراء والربح في المخزون",
    labelEn: "View buy price & profit in inventory",
  },
  {
    key: "view_pos_cost_profit",
    labelAr: "عرض سعر الشراء والربح في نقطة البيع",
    labelEn: "View buy price & profit at POS",
  },
];

const ALL_PERMISSION_KEYS = ROLE_PERMISSION_OPTIONS.map((item) => item.key);

/** Hidden at POS by default for all roles — grant via staff permissions if needed */
const DEFAULT_WITHOUT_POS_COST_PROFIT = ALL_PERMISSION_KEYS.filter(
  (key) => key !== "view_pos_cost_profit",
);

/** Built-in pharmacy roles shown in the program roles catalog and permission UI. */
export const EDITABLE_BUILTIN_ROLES: BuiltinUserRole[] = [
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "accountant",
  "inventory",
];

function flags(keys: RolePermissionKey[]): RolePermissionFlags {
  return Object.fromEntries(keys.map((key) => [key, true])) as RolePermissionFlags;
}

export const defaultPermissionsByRole: Record<BuiltinUserRole, RolePermissionFlags> = {
  super_admin: flags(DEFAULT_WITHOUT_POS_COST_PROFIT),
  pharmacy_admin: flags(DEFAULT_WITHOUT_POS_COST_PROFIT),
  branch_manager: flags([
    "manage_users",
    "edit_branch_settings",
    "review_branch_transfers",
  ]),
  cashier: {},
  inventory: {},
  accountant: flags(["view_org_activity_logs"]),
};

export function defaultPagesForBuiltinRole(role: BuiltinUserRole): Page[] {
  return [...(builtinDefaultPages[role] || builtinDefaultPages.cashier)];
}

export function normalizeRolePermissionFlags(
  role: BuiltinUserRole,
  overrides?: RolePermissionFlags | null,
): RolePermissionFlags {
  const base = { ...defaultPermissionsByRole[role] };
  if (!overrides) return base;
  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof overrides[key] === "boolean") {
      base[key] = overrides[key];
    }
  }
  return base;
}

export function roleHasPermissionFlag(
  flags: RolePermissionFlags,
  key: RolePermissionKey,
): boolean {
  return Boolean(flags[key]);
}

export function summarizeRoleAccess(
  allowedPages: Page[],
  permissions: RolePermissionFlags,
  isArabic: boolean,
): string {
  const pageCount = allowedPages.length;
  const permCount = ALL_PERMISSION_KEYS.filter((key) => permissions[key]).length;
  const totalPages = ROLE_PAGE_OPTIONS.length;
  const totalPerms = ROLE_PERMISSION_OPTIONS.length;

  if (isArabic) {
    const pagesPart =
      pageCount === 0
        ? "0 صفحات"
        : pageCount === 1
          ? "صفحة واحدة"
          : pageCount === 2
            ? "صفحتان"
            : `${pageCount} صفحات`;
    const permsPart =
      permCount === 0
        ? "0 صلاحيات"
        : permCount === 1
          ? "صلاحية واحدة"
          : permCount === 2
            ? "صلاحيتان"
            : `${permCount} صلاحيات`;
    return `${pagesPart} · ${permsPart} (من ${totalPages} صفحة · ${totalPerms} صلاحية)`;
  }

  return `${pageCount} page${pageCount === 1 ? "" : "s"} · ${permCount} permission${permCount === 1 ? "" : "s"} (of ${totalPages} pages · ${totalPerms} permissions)`;
}

/** Tooltip: page names for summary cell title attribute */
export function roleAccessSummaryTitle(
  allowedPages: Page[],
  permissions: RolePermissionFlags,
  isArabic: boolean,
): string {
  const pageLabels = allowedPages.map((page) => {
    const option = ROLE_PAGE_OPTIONS.find((item) => item.page === page);
    return option ? (isArabic ? option.labelAr : option.labelEn) : page;
  });
  const permLabels = ROLE_PERMISSION_OPTIONS.filter((item) => permissions[item.key]).map((item) =>
    isArabic ? item.labelAr : item.labelEn,
  );

  const pagesLine = isArabic
    ? pageLabels.length > 0
      ? `الصفحات: ${pageLabels.join(" · ")}`
      : "الصفحات: —"
    : pageLabels.length > 0
      ? `Pages: ${pageLabels.join(" · ")}`
      : "Pages: —";

  const permsLine = isArabic
    ? permLabels.length > 0
      ? `الصلاحيات: ${permLabels.join(" · ")}`
      : "الصلاحيات: —"
    : permLabels.length > 0
      ? `Permissions: ${permLabels.join(" · ")}`
      : "Permissions: —";

  return `${pagesLine}\n${permsLine}`;
}
