import { supabase } from "../services/supabaseClient";
import type { AppUser } from "../types";
import { normalizeRole, pharmacyManagedRoleKeysForBranch } from "./roles";

export const PHARMACY_GENERAL_MANAGER_TAKEN = "pharmacy_general_manager_taken";

export type PharmacyGeneralManagerScope = {
  employees: Array<{
    id: string;
    pharmacyId: string;
    jobTitle?: string | null;
    name?: string;
  }>;
  loginAccounts: Array<{
    id: string;
    pharmacyId: string;
    role: string;
    employeeId?: string | null;
    status?: string | null;
    email?: string;
  }>;
};

export function isPharmacyGeneralManagerRole(role: string | null | undefined): boolean {
  return normalizeRole(role || "") === "pharmacy_admin";
}

export function isPharmacyGeneralManagerSlotTaken(
  pharmacyId: string,
  scope: PharmacyGeneralManagerScope,
  exclude?: { employeeId?: string; accountId?: string },
): boolean {
  const excludeEmployeeId = exclude?.employeeId;
  const excludeAccountId = exclude?.accountId;

  const hasOtherGmAccount = scope.loginAccounts.some(
    (acc) =>
      acc.pharmacyId === pharmacyId &&
      acc.id !== excludeAccountId &&
      acc.status !== "rejected" &&
      isPharmacyGeneralManagerRole(acc.role),
  );
  if (hasOtherGmAccount) return true;

  return scope.employees.some(
    (emp) =>
      emp.pharmacyId === pharmacyId &&
      emp.id !== excludeEmployeeId &&
      isPharmacyGeneralManagerRole(emp.jobTitle),
  );
}

export function formatPharmacyGeneralManagerTakenError(isArabic: boolean): string {
  return isArabic
    ? "كل فرع يُسمح له بمدير عام واحد فقط. باقي الأدوار يمكن تكرارها."
    : "Each branch allows only one General Manager. Other roles can be assigned multiple times.";
}

export function filterRolesForGeneralManagerSlot(
  roleKeys: string[],
  pharmacyId: string,
  scope: PharmacyGeneralManagerScope,
  exclude?: { employeeId?: string; accountId?: string },
  currentRole?: string,
): string[] {
  const slotTaken = isPharmacyGeneralManagerSlotTaken(pharmacyId, scope, exclude);
  if (!slotTaken) return roleKeys;
  if (currentRole && isPharmacyGeneralManagerRole(currentRole)) {
    return roleKeys;
  }
  return roleKeys.filter((roleKey) => !isPharmacyGeneralManagerRole(roleKey));
}

export async function loadPharmacyGeneralManagerScope(
  pharmacyId: string,
): Promise<PharmacyGeneralManagerScope> {
  const [employeesRes, accountsRes] = await Promise.all([
    supabase.from("employees").select("id, pharmacy_id, job_title").eq("pharmacy_id", pharmacyId),
    supabase
      .from("pharmacy_login_accounts")
      .select("id, pharmacy_id, role, employee_id, status")
      .eq("pharmacy_id", pharmacyId),
  ]);

  if (employeesRes.error) {
    throw new Error(employeesRes.error.message);
  }
  if (accountsRes.error) {
    throw new Error(accountsRes.error.message);
  }

  return {
    employees: (employeesRes.data || []).map((row) => ({
      id: String(row.id),
      pharmacyId: String(row.pharmacy_id),
      jobTitle: row.job_title ? String(row.job_title) : null,
    })),
    loginAccounts: (accountsRes.data || []).map((row) => ({
      id: String(row.id),
      pharmacyId: String(row.pharmacy_id),
      role: String(row.role || ""),
      employeeId: row.employee_id ? String(row.employee_id) : null,
      status: row.status ? String(row.status) : null,
    })),
  };
}

export async function assertPharmacyGeneralManagerSlotAvailable(
  pharmacyId: string,
  role: string | null | undefined,
  exclude?: { employeeId?: string; accountId?: string },
): Promise<void> {
  if (!isPharmacyGeneralManagerRole(role)) return;

  const scope = await loadPharmacyGeneralManagerScope(pharmacyId);
  if (isPharmacyGeneralManagerSlotTaken(pharmacyId, scope, exclude)) {
    throw new Error(PHARMACY_GENERAL_MANAGER_TAKEN);
  }
}

/** Role keys for dropdowns — sourced from SaaS pharmacy management (GM + active custom roles). */
export function buildPharmacyRoleSelectOptions(params: {
  pharmacyId: string;
  customRoles: Array<{ pharmacyId: string; roleKey: string; isActive?: boolean | null }>;
  appUser: AppUser | null | undefined;
  generalManagerScope?: PharmacyGeneralManagerScope;
  employeeId?: string;
  accountId?: string;
  currentRole?: string;
}): string[] {
  const roleKeys = pharmacyManagedRoleKeysForBranch(
    params.pharmacyId,
    params.customRoles,
    params.appUser,
  );
  if (!params.generalManagerScope) return roleKeys;
  return filterRolesForGeneralManagerSlot(
    roleKeys,
    params.pharmacyId,
    params.generalManagerScope,
    { employeeId: params.employeeId, accountId: params.accountId },
    params.currentRole,
  );
}
