import {
  formatPharmacyGeneralManagerTakenError,
  isPharmacyGeneralManagerRole,
  PHARMACY_GENERAL_MANAGER_TAKEN,
} from "../../utils/pharmacyGeneralManager";
import { getRoleLabel, isSuperAdmin, parseLoginAccountRole } from "../../utils/roles";
import type {
  AppUser,
  Employee,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  SystemUser,
} from "../../types";

export function staffActionErrorMessage(
  err: unknown,
  isArabic: boolean,
  fallback: string,
): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg === PHARMACY_GENERAL_MANAGER_TAKEN) {
    return formatPharmacyGeneralManagerTakenError(isArabic);
  }
  return msg || fallback;
}

export function formatLoginAccountOptionLabel(account: PharmacyLoginAccount) {
  return account.email;
}

export function formatDate(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString(isArabic ? "ar-EG" : "en-GB");
}

export function formatDateTime(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

/** Login username matches employee display name exactly. */
export function usernameFromEmployeeName(name: string) {
  return name.trim();
}

export function getEmployeeAssignedAccountId(
  employee: Employee,
  catalogByEmployeeId: Map<string, PharmacyLoginAccount>,
): string {
  return catalogByEmployeeId.get(employee.id)?.id || "";
}

export function getEmployeeLinkedUserUid(employee: Employee, systemUsers: SystemUser[]): string {
  return systemUsers.find((user) => user.employeeId === employee.id)?.uid || "";
}

export function getEmployeeSelectedRole(
  emp: Employee,
  catalogByEmployeeId: Map<string, PharmacyLoginAccount>,
): string {
  if (emp.jobTitle?.trim()) {
    return parseLoginAccountRole(emp.jobTitle);
  }
  const linked = catalogByEmployeeId.get(emp.id);
  if (linked) {
    return parseLoginAccountRole(linked.role);
  }
  return "";
}

export function isAccountCustomRole(roleKey: string, branchCustomRoles: PharmacyCustomRole[]) {
  return branchCustomRoles.some((role) => role.roleKey === roleKey);
}

export function employeeLoginAccountOptionsFor(
  pharmacyId: string,
  employeeId: string,
  catalogByEmployeeId: Map<string, PharmacyLoginAccount>,
  loginCatalogByPharmacy: Map<string, PharmacyLoginAccount[]>,
  isArabic: boolean,
) {
  const linkedAccount = catalogByEmployeeId.get(employeeId);
  const sourceAccounts = loginCatalogByPharmacy.get(pharmacyId) || [];

  const eligible = sourceAccounts.filter(
    (account) =>
      account.status === "approved" &&
      (!account.employeeId || account.employeeId === employeeId),
  );

  if (
    linkedAccount &&
    linkedAccount.pharmacyId === pharmacyId &&
    linkedAccount.status === "approved" &&
    !eligible.some((account) => account.id === linkedAccount.id)
  ) {
    eligible.push(linkedAccount);
  }

  return eligible.sort((a, b) => {
    const byRole = getRoleLabel(a.role, isArabic).localeCompare(
      getRoleLabel(b.role, isArabic),
      isArabic ? "ar" : "en",
    );
    if (byRole !== 0) return byRole;
    return a.email.localeCompare(b.email);
  });
}

export function employeeSystemUserOptionsFor(
  pharmacyId: string,
  employeeId: string,
  systemUsers: SystemUser[],
  appUser: AppUser | null,
) {
  const linkedUid = getEmployeeLinkedUserUid({ id: employeeId } as Employee, systemUsers);
  return systemUsers
    .filter((user) => {
      if (user.pharmacyId !== pharmacyId || user.isActive === false) return false;
      if (user.employeeId && user.employeeId !== employeeId) return false;
      if (
        isPharmacyGeneralManagerRole(user.role) &&
        user.uid !== linkedUid &&
        !isSuperAdmin(appUser)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export function formatTransferEmployeeError(message: string, isArabic: boolean) {
  const messages: Record<string, [string, string]> = {
    employee_not_found: ["الموظف غير موجود", "Employee not found"],
    employee_already_in_branch: [
      "الموظف مسجّل بالفعل على هذا الفرع",
      "Employee is already on this branch",
    ],
    branch_not_found: ["الفرع المستهدف غير موجود", "Target branch not found"],
    branch_required: ["اختر الفرع المستهدف", "Select a target branch"],
    login_account_email_exists_on_branch: [
      "يوجد حساب دخول بنفس الإيميل على الفرع المستهدف",
      "A login account with the same email already exists on the target branch",
    ],
    not_authorized: ["غير مصرح بهذا الإجراء", "Not authorized"],
    [PHARMACY_GENERAL_MANAGER_TAKEN]: [
      "الفرع المستهدف لديه مدير عام بالفعل — لا يمكن نقل مدير عام إليه",
      "The target branch already has a General Manager — cannot transfer a GM there",
    ],
  };
  const pair = messages[message];
  if (pair) return isArabic ? pair[0] : pair[1];
  return message || (isArabic ? "تعذر نقل الموظف" : "Could not transfer employee");
}
