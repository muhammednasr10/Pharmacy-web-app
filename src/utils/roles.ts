import type { AppUser, Page, UserRole } from "../types";

/** Map legacy DB roles to current roles */
export function normalizeRole(role: string): UserRole {
  if (role === "admin" || role === "pharmacy_admin") return "pharmacy_admin";
  if (role === "manager") return "accountant";
  if (
    role === "super_admin" ||
    role === "cashier" ||
    role === "inventory" ||
    role === "accountant"
  ) {
    return role;
  }
  return "cashier";
}

export function normalizeAppUser(user: AppUser): AppUser {
  return { ...user, role: normalizeRole(user.role) };
}

export function isSuperAdmin(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "super_admin";
}

export function isPharmacyAdmin(appUser: AppUser | null | undefined): boolean {
  return appUser?.role === "pharmacy_admin" || isSuperAdmin(appUser);
}

export function canManageUsers(appUser: AppUser | null | undefined): boolean {
  return isPharmacyAdmin(appUser);
}

export function canManageTenants(appUser: AppUser | null | undefined): boolean {
  return isSuperAdmin(appUser);
}

export function hasRole(appUser: AppUser | null | undefined, roles: UserRole[]): boolean {
  if (!appUser) return false;
  return roles.includes(appUser.role);
}

export function getRoleLabel(role: UserRole | string, isArabic: boolean): string {
  const normalized = normalizeRole(role);
  if (!isArabic) {
    const en: Record<UserRole, string> = {
      super_admin: "System Owner",
      pharmacy_admin: "Pharmacy Admin",
      cashier: "Cashier",
      inventory: "Inventory Manager",
      accountant: "Accountant",
    };
    return en[normalized] || normalized;
  }
  const labels: Record<UserRole, string> = {
    super_admin: "مالك النظام",
    pharmacy_admin: "مدير الصيدلية",
    cashier: "كاشير",
    inventory: "مسؤول مخزن",
    accountant: "محاسب",
  };
  return labels[normalized] || normalized;
}

export const allowedPagesByRole: Record<UserRole, Page[]> = {
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
    "settings",
  ],
  pharmacy_admin: [
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
    "settings",
  ],
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
  return allowedPagesByRole[appUser.role] || [];
}

export const pharmacyAdminRoleOptions: UserRole[] = [
  "pharmacy_admin",
  "cashier",
  "inventory",
  "accountant",
];

/** Roles available when creating pharmacy login accounts. */
export const loginAccountRoleOptions: UserRole[] = [
  "pharmacy_admin",
  "cashier",
  "accountant",
  "inventory",
];

export const defaultLoginAccountDrafts: Record<
  (typeof loginAccountRoleOptions)[number],
  { email: string; password: string }
> = {
  pharmacy_admin: { email: "manager@pharmacy.com", password: "1234567" },
  cashier: { email: "cashier@pharmacy.com", password: "1234567" },
  accountant: { email: "acc@pharmacy.com", password: "1234567" },
  inventory: { email: "inv@pharmacy.com", password: "1234567" },
};

/** Roles assignable to pharmacy employees (stored in employees.job_title). */
export const employeeJobRoleOptions: UserRole[] = pharmacyAdminRoleOptions;

export function parseLoginAccountRole(value?: string | null): UserRole {
  if (!value?.trim()) return "cashier";
  const normalized = normalizeRole(value.trim());
  if (loginAccountRoleOptions.includes(normalized)) return normalized;
  return "cashier";
}

export function getDefaultLoginAccountDraft(role: UserRole): { email: string; password: string } {
  return defaultLoginAccountDrafts[parseLoginAccountRole(role)];
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

export function getEmployeeJobRoleLabel(value: string | undefined | null, isArabic: boolean): string {
  if (!value?.trim()) return "—";
  if (isStoredEmployeeJobRole(value)) {
    return getRoleLabel(parseEmployeeJobRole(value), isArabic);
  }
  return value.trim();
}

export const superAdminRoleOptions: UserRole[] = [
  "super_admin",
  "pharmacy_admin",
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
    labelAr: "مدير الصيدلية",
    labelEn: "Pharmacy Admin",
    summaryAr: "يدير كل شيء داخل صيدليته: موظفين، مستخدمين، مخزون، مبيعات، تقارير، إعدادات.",
    summaryEn: "Full control within own pharmacy: staff, users, inventory, sales, reports, settings.",
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
    summaryAr: "التقارير والفواتير والمرتجعات والعملاء وسجل النشاط والحضور والمرتبات. لا يعدل المخزون.",
    summaryEn: "Reports, invoices, returns, customers, activity logs, attendance and payroll. No inventory edits.",
  },
];

export const STAFF_ACTIVITY_TYPES = [
  "employee_create",
  "employee_update",
  "employee_activate",
  "employee_deactivate",
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
