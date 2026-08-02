import type { AppUser, BuiltinUserRole, Page, UserRole } from "../types";
import { getPharmacyCustomRoleByKey } from "../services/pharmacy/customRoleCache";
import { getEffectiveRoleAccess, roleHasConfiguredPermission } from "./roleAccess";
import type { RolePermissionKey } from "./rolePermissions";

const BUILTIN_ROLES: BuiltinUserRole[] = [
  "super_admin",
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "inventory",
  "accountant",
];

export function isCustomRole(role: string | undefined | null): boolean {
  return Boolean(role?.trim().toLowerCase().startsWith("custom_"));
}

export function isBuiltinRole(role: string): role is BuiltinUserRole {
  return BUILTIN_ROLES.includes(role as BuiltinUserRole);
}

/** Map legacy DB roles to current roles; preserve custom_* keys */
export function normalizeRole(role: string): UserRole {
  const trimmed = role?.trim() || "";
  if (isCustomRole(trimmed)) return trimmed.toLowerCase();
  if (trimmed === "admin" || trimmed === "pharmacy_admin") return "pharmacy_admin";
  if (trimmed === "manager") return "accountant";
  if (isBuiltinRole(trimmed)) return trimmed;
  return "cashier";
}

export function normalizeAppUser(user: AppUser): AppUser {
  return { ...user, role: normalizeRole(user.role) };
}

export function isSuperAdmin(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "super_admin";
}

/** Organization-wide manager — all branches in the group. */
export function isOrgPharmacyAdmin(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "pharmacy_admin" || isSuperAdmin(appUser);
}

/** صفحة حالة SQL — مالك النظام فقط */
export function canAccessSqlMigrationsPage(appUser: AppUser | null | undefined): boolean {
  return isSuperAdmin(appUser);
}

/** Single-branch manager. */
export function isBranchManager(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "branch_manager";
}

export function isAccountant(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "accountant";
}

/** Any pharmacy manager (org or branch). */
export function isPharmacyManager(appUser: AppUser | null | undefined): boolean {
  return isOrgPharmacyAdmin(appUser) || isBranchManager(appUser);
}

/** @deprecated use isOrgPharmacyAdmin — kept for existing imports */
export function isPharmacyAdmin(appUser: AppUser | null | undefined): boolean {
  return isOrgPharmacyAdmin(appUser);
}

/** Org admin or accountant can switch branches or view all at once (accountant: read-only). */
export function canSwitchOrganizationBranches(
  appUser: AppUser | null | undefined,
  branchCount: number,
): boolean {
  if (branchCount <= 1) return false;
  return isOrgPharmacyAdmin(appUser) || isAccountant(appUser);
}

export function canViewBranchBreakdownReports(
  appUser: AppUser | null | undefined,
  branchCount: number,
): boolean {
  return (isOrgPharmacyAdmin(appUser) || isAccountant(appUser)) && branchCount > 1;
}

function userHasPermission(
  appUser: AppUser | null | undefined,
  permission: RolePermissionKey,
): boolean {
  if (!appUser) return false;
  if (isSuperAdmin(appUser)) return true;
  return roleHasConfiguredPermission(
    normalizeRole(appUser.role),
    appUser.pharmacyId,
    permission,
  );
}

export function canManageUsers(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "manage_users");
}

/** Org general manager (or platform admin) — edit role/page permissions for staff. */
export function canManageStaffRolePermissions(appUser: AppUser | null | undefined): boolean {
  if (!appUser) return false;
  return isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser);
}

/** Whether this role's permission template may be edited (org admin cannot edit pharmacy_admin). */
export function canEditRolePermissionsForRole(
  appUser: AppUser | null | undefined,
  roleKey: string,
): boolean {
  if (!canManageStaffRolePermissions(appUser)) return false;
  if (isSuperAdmin(appUser)) return true;
  return normalizeRole(roleKey) !== "pharmacy_admin";
}

/** Org-wide settings: subscription, alert rules, payroll, backup. */
export function canEditOrgWideSettings(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "edit_org_settings");
}

/** Branch contact + invoice footer for own branch. */
export function canEditBranchSettings(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "edit_branch_settings");
}

export function canDeleteMedicines(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "delete_medicines");
}

export function canDeleteReturns(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "delete_returns");
}

export function canDeletePurchases(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "delete_purchases");
}

export function canDeleteCustomerPayments(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "delete_customer_payments");
}

export function canRequestSubscription(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "edit_org_settings");
}

export function canExportPharmacyBackup(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "export_backup");
}

export function canViewOrgActivityLogs(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "view_org_activity_logs");
}

export function canManageOrgBranches(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "manage_org_branches");
}

/** Can approve or reject pending branch stock transfers (incoming at own branch for branch managers). */
export function canReviewPendingBranchTransfers(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "review_branch_transfers");
}

export function canViewInventoryCostProfit(appUser: AppUser | null | undefined): boolean {
  return userHasPermission(appUser, "view_inventory_cost_profit");
}

export function canViewPosCostProfit(appUser: AppUser | null | undefined): boolean {
  if (!appUser) return false;
  return roleHasConfiguredPermission(
    normalizeRole(appUser.role),
    appUser.pharmacyId,
    "view_pos_cost_profit",
  );
}

export function canApproveBranchStockTransfer(
  appUser: AppUser | null | undefined,
  toPharmacyId: string,
): boolean {
  if (!appUser) return false;
  if (isOrgPharmacyAdmin(appUser)) return true;
  return isBranchManager(appUser) && appUser.pharmacyId === toPharmacyId;
}

export function canManageTenants(appUser: AppUser | null | undefined): boolean {
  return isSuperAdmin(appUser);
}

export function hasRole(appUser: AppUser | null | undefined, roles: UserRole[]): boolean {
  if (!appUser) return false;
  const role = normalizeRole(appUser.role);
  if (roles.includes(role)) return true;
  if (isCustomRole(role)) {
    const custom = getPharmacyCustomRoleByKey(role, appUser.pharmacyId);
    if (custom && roles.includes(custom.baseRole)) return true;
  }
  return false;
}

export function getRoleLabel(role: UserRole | string, isArabic: boolean): string {
  const raw = role?.trim() || "";
  if (isCustomRole(raw)) {
    const custom = getPharmacyCustomRoleByKey(raw);
    if (custom) return isArabic ? custom.nameAr : custom.nameEn;
    return raw;
  }
  const normalized = normalizeRole(role) as BuiltinUserRole;
  if (!isArabic) {
    const en: Record<UserRole, string> = {
      super_admin: "System Owner",
      pharmacy_admin: "General Manager",
      branch_manager: "Branch Manager",
      cashier: "Cashier",
      inventory: "Inventory Manager",
      accountant: "Accountant",
    };
    return en[normalized] || normalized;
  }
  const labels: Record<UserRole, string> = {
    super_admin: "مالك النظام",
    pharmacy_admin: "مدير عام",
    branch_manager: "مدير فرع",
    cashier: "كاشير",
    inventory: "مسؤول مخزن",
    accountant: "محاسب",
  };
  return labels[normalized] || normalized;
}

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

export const allowedPagesByRole: Record<BuiltinUserRole, Page[]> = {
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

export function getAllowedPages(appUser: AppUser | null): Page[] {
  if (!appUser) return [];
  const pages = getEffectiveRoleAccess(
    normalizeRole(appUser.role),
    appUser.pharmacyId,
  ).allowedPages;
  return pages.includes("userGuide") ? pages : [...pages, "userGuide"];
}

export const pharmacyAdminRoleOptions: UserRole[] = [
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "inventory",
  "accountant",
];

/** Roles available when creating pharmacy login accounts. */
export const loginAccountRoleOptions: UserRole[] = [
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "accountant",
  "inventory",
];

export function loginAccountRoleOptionsFor(appUser: AppUser | null | undefined): UserRole[] {
  if (isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)) {
    return loginAccountRoleOptions;
  }
  if (isBranchManager(appUser)) {
    return loginAccountRoleOptions.filter((role) => role !== "pharmacy_admin");
  }
  return loginAccountRoleOptions;
}

/** Fixed roles in pharmacy SaaS — standard job roles from the program catalog. */
export function pharmacyManagedBuiltinRoles(appUser: AppUser | null | undefined): UserRole[] {
  if (isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)) {
    return [...loginAccountRoleOptions];
  }
  return [];
}

export function pharmacyManagedRoleKeysForBranch(
  pharmacyId: string,
  customRoles: Array<{ pharmacyId: string; roleKey: string; isActive?: boolean | null }>,
  appUser: AppUser | null | undefined,
): string[] {
  const builtin = pharmacyManagedBuiltinRoles(appUser);
  const custom = customRoles
    .filter((role) => role.pharmacyId === pharmacyId && role.isActive !== false)
    .map((role) => role.roleKey);
  return [...builtin, ...custom];
}

export const defaultLoginAccountDrafts: Record<
  (typeof loginAccountRoleOptions)[number],
  { email: string; password: string }
> = {
  pharmacy_admin: { email: "manager@pharmacy.com", password: "1234567" },
  branch_manager: { email: "branch@pharmacy.com", password: "1234567" },
  cashier: { email: "cashier@pharmacy.com", password: "1234567" },
  accountant: { email: "acc@pharmacy.com", password: "1234567" },
  inventory: { email: "inv@pharmacy.com", password: "1234567" },
};

/** Roles assignable to pharmacy employees (stored in employees.job_title). */
export const employeeJobRoleOptions: UserRole[] = pharmacyAdminRoleOptions;

export function parseLoginAccountRole(value?: string | null): UserRole {
  if (!value?.trim()) return "cashier";
  const trimmed = value.trim();
  if (isCustomRole(trimmed)) return trimmed.toLowerCase();
  const normalized = normalizeRole(trimmed);
  if (loginAccountRoleOptions.includes(normalized as (typeof loginAccountRoleOptions)[number])) {
    return normalized;
  }
  return "cashier";
}

export function getDefaultLoginAccountDraft(role: UserRole | string): { email: string; password: string } {
  const parsed = parseLoginAccountRole(String(role));
  if (isCustomRole(parsed)) {
    const slug = parsed.replace(/^custom_/, "") || "user";
    return { email: `${slug}@pharmacy.com`, password: "1234567" };
  }
  return defaultLoginAccountDrafts[parsed as (typeof loginAccountRoleOptions)[number]];
}

export function parseEmployeeJobRole(value?: string | null): UserRole {
  if (!value?.trim()) return "cashier";
  const normalized = normalizeRole(value.trim());
  if (employeeJobRoleOptions.includes(normalized)) return normalized;
  return "cashier";
}

export function isStoredEmployeeJobRole(value?: string | null): boolean {
  if (!value?.trim()) return false;
  return employeeJobRoleOptions.includes(normalizeRole(value.trim()));
}

export function getEmployeeJobRoleLabel(
  value: string | undefined | null,
  isArabic: boolean,
): string {
  if (!value?.trim()) return "—";
  if (isStoredEmployeeJobRole(value)) {
    return getRoleLabel(parseEmployeeJobRole(value), isArabic);
  }
  return value.trim();
}

export const superAdminRoleOptions: UserRole[] = [
  "super_admin",
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "inventory",
  "accountant",
];

export type RolePermissionRow = {
  role: UserRole;
  labelAr: string;
  labelEn: string;
  summaryAr: string;
  summaryEn: string;
};

export const rolePermissionMatrix: RolePermissionRow[] = [
  {
    role: "super_admin",
    labelAr: "مالك النظام",
    labelEn: "System Owner",
    summaryAr: "يرى كل الصيدليات وكل البيانات ويدير المستأجرين والاشتراكات.",
    summaryEn: "Sees all pharmacies and data; manages tenants and subscriptions.",
  },
  {
    role: "pharmacy_admin",
    labelAr: "مدير عام",
    labelEn: "General Manager",
    summaryAr:
      "يدير كل فروع المجموعة: تقارير مجمّعة، HR مركزي، نقل مخزون (فوري أو باعتماد)، تنبيهات نواقص، وكل الفروع أو فرع واحد.",
    summaryEn:
      "Manages all organization branches: consolidated reports, central HR, transfers (immediate or approval), low-stock alerts, all or one branch.",
  },
  {
    role: "branch_manager",
    labelAr: "مدير فرع",
    labelEn: "Branch Manager",
    summaryAr:
      "فرعه فقط: تشغيل يومي (مبيعات، مخزون، توريد، موظفين). لا يحذف أدوية/مرتجعات/توريدات، لا إعدادات اشتراك أو تنبيهات منظمة، لا سجل نشاط المنظمة.",
    summaryEn:
      "Own branch daily ops (sales, inventory, purchases, staff). Cannot delete medicines/returns/purchases, org subscription/alert rules, or org activity logs.",
  },
  {
    role: "cashier",
    labelAr: "كاشير",
    labelEn: "Cashier",
    summaryAr: "لوحة التحكم ونقطة البيع والفواتير والمرتجعات والعملاء.",
    summaryEn: "Dashboard, POS, invoices, returns, and customers.",
  },
  {
    role: "inventory",
    labelAr: "مسؤول مخزن",
    labelEn: "Inventory Manager",
    summaryAr: "لوحة التحكم وإدارة المخزون والمشتريات وحركات المخزون.",
    summaryEn: "Dashboard, inventory, purchases, and stock movements.",
  },
  {
    role: "accountant",
    labelAr: "محاسب",
    labelEn: "Accountant",
    summaryAr:
      "التقارير والفواتير والمرتجعات والعملاء — يمكنه عرض كل الفروع للقراءة فقط ومقارنة التقارير.",
    summaryEn:
      "Reports, invoices, returns, customers — can view all branches read-only and compare branch reports.",
  },
];

export const STAFF_ACTIVITY_TYPES = [
  "employee_create",
  "employee_update",
  "employee_activate",
  "employee_deactivate",
  "employee_delete",
  "user_create",
  "user_update",
  "user_activate",
  "user_deactivate",
  "user_role_change",
  "user_link_employee",
  "user_unlink_employee",
  "login_account_request",
  "login_account_request_approved",
  "login_account_request_rejected",
];
