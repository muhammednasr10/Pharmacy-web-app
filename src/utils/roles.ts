import type { AppUser, Page, UserRole } from "../types";

/** Map legacy DB roles to current roles */
export function normalizeRole(role: string): UserRole {
  if (role === "pharmacy_admin") return "admin";
  if (role === "manager") return "accountant";
  if (
    role === "super_admin" ||
    role === "admin" ||
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
  return appUser?.role === "admin" || isSuperAdmin(appUser);
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

export function getRoleLabel(role: UserRole, isArabic: boolean): string {
  if (!isArabic) return role;
  const labels: Record<UserRole, string> = {
    super_admin: "مدير النظام",
    admin: "مدير الصيدلية",
    cashier: "كاشير",
    inventory: "مخزون",
    accountant: "محاسب",
  };
  return labels[role] || role;
}

export const allowedPagesByRole: Record<UserRole, Page[]> = {
  super_admin: [
    "dashboard",
    "inventory",
    "pos",
    "invoices",
    "returns",
    "purchases",
    "customers",
    "reports",
    "stockMovements",
    "activityLogs",
    "users",
    "tenants",
    "settings",
  ],
  admin: [
    "dashboard",
    "inventory",
    "pos",
    "invoices",
    "returns",
    "purchases",
    "customers",
    "reports",
    "stockMovements",
    "activityLogs",
    "users",
    "settings",
  ],
  cashier: ["pos", "invoices", "returns", "customers"],
  inventory: ["inventory", "purchases", "stockMovements"],
  accountant: ["dashboard", "invoices", "returns", "customers", "reports", "stockMovements", "activityLogs"],
};

export function getAllowedPages(appUser: AppUser | null): Page[] {
  if (!appUser) return [];
  return allowedPagesByRole[appUser.role] || [];
}

export const pharmacyAdminRoleOptions: UserRole[] = [
  "admin",
  "cashier",
  "inventory",
  "accountant",
];

export const superAdminRoleOptions: UserRole[] = [
  "super_admin",
  "admin",
  "cashier",
  "inventory",
  "accountant",
];
