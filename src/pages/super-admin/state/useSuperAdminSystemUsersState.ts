import { useMemo, useState } from "react";
import type { AppUser, Employee, PharmacyCustomRole, PharmacyLoginAccount } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  buildPharmacyRoleSelectOptions,
  formatPharmacyGeneralManagerTakenError,
  isPharmacyGeneralManagerRole,
  isPharmacyGeneralManagerSlotTaken,
  type PharmacyGeneralManagerScope,
} from "../../../utils/pharmacyGeneralManager";
import { EDITABLE_BUILTIN_ROLES } from "../../../utils/rolePermissions";
import {
  getRoleLabel,
  loginAccountRoleOptions,
  normalizeRole,
  parseLoginAccountRole,
} from "../../../utils/roles";
import { formatUserCreationError } from "../../../utils/userCreationErrors";
import {
  emptySystemUserForm,
  type ManageRoleAccountDisplayRow,
  type ManageUnifiedRoleRow,
} from "../types";
import type { SuperAdminSharedContext } from "./shared";

type SystemUsersParams = Pick<
  SuperAdminSharedContext,
  "isArabic" | "operatorUid" | "selected" | "selectedOrgBranches"
> & {
  manageCustomRoles: PharmacyCustomRole[];
  manageRoleConfigs: import("../../../types").PharmacyRoleConfig[];
  manageEmployees: Employee[];
  manageLoginAccounts: PharmacyLoginAccount[];
  manageOrgSystemUsers: AppUser[];
  manageRoleAccountDisplayRows: ManageRoleAccountDisplayRow[];
  canPickSystemUserBranch: boolean;
  reloadManageRoles: () => Promise<void>;
  resolveBuiltinRoleLabels: (roleKey: string, pharmacyId: string) => {
    nameAr: string;
    nameEn: string;
  };
  onRefreshSystemUsers: () => Promise<void>;
};

export function useSuperAdminSystemUsersState(params: SystemUsersParams) {
  const {
    isArabic,
    operatorUid,
    selected,
    selectedOrgBranches,
    manageCustomRoles,
    manageRoleConfigs,
    manageEmployees,
    manageLoginAccounts,
    manageOrgSystemUsers,
    manageRoleAccountDisplayRows,
    canPickSystemUserBranch,
    reloadManageRoles,
    resolveBuiltinRoleLabels,
    onRefreshSystemUsers,
  } = params;

  const [systemUserModalOpen, setSystemUserModalOpen] = useState(false);
  const [systemUserModalMode, setSystemUserModalMode] = useState<"add" | "edit">("add");
  const [editingSystemUserUid, setEditingSystemUserUid] = useState<string | null>(null);
  const [systemUserForm, setSystemUserForm] = useState(emptySystemUserForm);
  const [savingSystemUser, setSavingSystemUser] = useState(false);
  const [systemUserBusyUid, setSystemUserBusyUid] = useState<string | null>(null);
  const [showSystemUserPassword, setShowSystemUserPassword] = useState(false);

  const operatorAppUser = useMemo(
    (): AppUser => ({
      uid: operatorUid,
      role: "super_admin",
      name: "",
      email: "",
      pharmacyId: "main",
      isActive: true,
    }),
    [operatorUid],
  );

  const manageRoleSelectEntries = useMemo(() => {
    const pharmacyId = systemUserForm.pharmacyId || selected?.id || "";
    const editingUser = editingSystemUserUid
      ? manageOrgSystemUsers.find((item) => item.uid === editingSystemUserUid)
      : undefined;

    const scope: PharmacyGeneralManagerScope = {
      employees: manageEmployees.map((employee) => ({
        id: employee.id,
        pharmacyId: employee.pharmacyId,
        jobTitle: employee.jobTitle,
      })),
      loginAccounts: manageLoginAccounts.map((account) => ({
        id: account.id,
        pharmacyId: account.pharmacyId,
        role: account.role,
        employeeId: account.employeeId,
        status: account.status,
        email: account.email,
      })),
    };

    const builtinEntries = loginAccountRoleOptions.map((roleKey) => ({
      key: roleKey,
      label: pharmacyId
        ? resolveBuiltinRoleLabels(roleKey, pharmacyId)[isArabic ? "nameAr" : "nameEn"]
        : getRoleLabel(roleKey, isArabic),
    }));

    const customEntries = manageCustomRoles
      .filter((role) => role.pharmacyId === pharmacyId && role.isActive !== false)
      .map((role) => ({
        key: role.roleKey,
        label: isArabic ? role.nameAr : role.nameEn,
      }));

    const entries = [...builtinEntries, ...customEntries];
    const roleKeys = entries.map((entry) => entry.key);

    const filteredKeys = buildPharmacyRoleSelectOptions({
      pharmacyId: pharmacyId || selected?.id || "main",
      customRoles: manageCustomRoles,
      appUser: operatorAppUser,
      generalManagerScope: scope,
      currentRole: editingUser?.role,
    }).filter((roleKey) => roleKeys.includes(roleKey));

    const gmInUsers = manageOrgSystemUsers.some(
      (user) =>
        user.pharmacyId === pharmacyId &&
        user.uid !== editingSystemUserUid &&
        user.isActive !== false &&
        isPharmacyGeneralManagerRole(user.role),
    );
    const keysAfterGm =
      gmInUsers && !isPharmacyGeneralManagerRole(editingUser?.role)
        ? filteredKeys.filter((roleKey) => !isPharmacyGeneralManagerRole(roleKey))
        : filteredKeys;

    const matched = entries.filter((entry) => keysAfterGm.includes(entry.key));
    const currentRoleKey = normalizeRole(systemUserForm.role);
    if (currentRoleKey && !matched.some((entry) => entry.key === currentRoleKey)) {
      matched.push({
        key: currentRoleKey,
        label: getRoleLabel(currentRoleKey, isArabic),
      });
    }
    return matched;
  }, [
    manageCustomRoles,
    manageRoleConfigs,
    systemUserForm.pharmacyId,
    selected?.id,
    manageEmployees,
    manageLoginAccounts,
    manageOrgSystemUsers,
    editingSystemUserUid,
    systemUserForm.role,
    operatorAppUser,
    isArabic,
    resolveBuiltinRoleLabels,
  ]);

  const manageOrphanSystemUsers = useMemo(() => {
    const assignedUids = new Set(
      manageRoleAccountDisplayRows.map((row) => row.user.uid),
    );
    return manageOrgSystemUsers.filter((user) => !assignedUids.has(user.uid));
  }, [manageOrgSystemUsers, manageRoleAccountDisplayRows]);

  function openAddSystemUserModal(pharmacyId?: string, roleKey?: string) {
    if (!selected) return;
    const branchId = pharmacyId || selected.id;
    const customRole = manageCustomRoles.find(
      (role) => role.pharmacyId === branchId && role.isActive !== false,
    );
    const defaultRole = parseLoginAccountRole(
      roleKey || customRole?.roleKey || EDITABLE_BUILTIN_ROLES[0] || "cashier",
    );
    setSystemUserModalMode("add");
    setEditingSystemUserUid(null);
    setShowSystemUserPassword(false);
    setSystemUserForm({
      pharmacyId: branchId,
      email: "",
      password: "",
      role: defaultRole,
      isActive: true,
    });
    setSystemUserModalOpen(true);
  }

  function openEditSystemUserModal(user: AppUser) {
    const storedPassword = pharmacyService.resolveLoginAccountStoredPassword(
      manageLoginAccounts,
      user.pharmacyId,
      user.email,
    );
    setSystemUserModalMode("edit");
    setEditingSystemUserUid(user.uid);
    setShowSystemUserPassword(Boolean(storedPassword));
    setSystemUserForm({
      pharmacyId: user.pharmacyId,
      email: user.email,
      password: storedPassword,
      role: normalizeRole(user.role),
      isActive: user.isActive !== false,
    });
    setSystemUserModalOpen(true);
  }

  function closeSystemUserModal() {
    setSystemUserModalOpen(false);
    setEditingSystemUserUid(null);
    setShowSystemUserPassword(false);
    setSystemUserForm(emptySystemUserForm);
  }

  async function saveSystemUserForm() {
    const email = systemUserForm.email.trim().toLowerCase();
    const passwordInput = systemUserForm.password;
    const pharmacyId = systemUserForm.pharmacyId || selected?.id || "";
    const catalogPassword = pharmacyService.resolveLoginAccountStoredPassword(
      manageLoginAccounts,
      pharmacyId,
      email,
    );
    const password =
      systemUserModalMode === "add"
        ? passwordInput
        : passwordInput && passwordInput !== catalogPassword
          ? passwordInput
          : "";
    const editingUser = editingSystemUserUid
      ? manageOrgSystemUsers.find((user) => user.uid === editingSystemUserUid)
      : undefined;
    const role = normalizeRole(systemUserForm.role);

    if (!pharmacyId || !email) {
      alert(isArabic ? "أكمل الفرع والإيميل" : "Fill branch and email");
      return;
    }
    if (
      canPickSystemUserBranch &&
      !selectedOrgBranches.some((branch) => branch.id === pharmacyId)
    ) {
      alert(isArabic ? "اختر فرعاً صالحاً" : "Select a valid branch");
      return;
    }
    if (systemUserModalMode === "add" && !password) {
      alert(isArabic ? "أدخل كلمة المرور" : "Enter password");
      return;
    }
    if (password && password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    const gmScope: PharmacyGeneralManagerScope = {
      employees: manageEmployees.map((employee) => ({
        id: employee.id,
        pharmacyId: employee.pharmacyId,
        jobTitle: employee.jobTitle,
      })),
      loginAccounts: manageLoginAccounts.map((account) => ({
        id: account.id,
        pharmacyId: account.pharmacyId,
        role: account.role,
        employeeId: account.employeeId,
        status: account.status,
        email: account.email,
      })),
    };
    const gmInUsers = manageOrgSystemUsers.some(
      (user) =>
        user.pharmacyId === pharmacyId &&
        user.uid !== editingSystemUserUid &&
        user.isActive !== false &&
        isPharmacyGeneralManagerRole(user.role),
    );
    if (
      isPharmacyGeneralManagerRole(role) &&
      (gmInUsers || isPharmacyGeneralManagerSlotTaken(pharmacyId, gmScope))
    ) {
      alert(formatPharmacyGeneralManagerTakenError(isArabic));
      return;
    }

    const duplicateEmail = manageOrgSystemUsers.some(
      (user) =>
        user.email.trim().toLowerCase() === email && user.uid !== editingSystemUserUid,
    );
    if (duplicateEmail) {
      alert(isArabic ? "هذا الإيميل مستخدم بالفعل" : "This email is already in use");
      return;
    }

    setSavingSystemUser(true);
    try {
      await pharmacyService.adminSaveSystemUser({
        uid: editingSystemUserUid || undefined,
        email,
        password: password || undefined,
        name: email.split("@")[0],
        role,
        pharmacyId,
        isActive: systemUserForm.isActive,
      });

      closeSystemUserModal();
      await onRefreshSystemUsers();
      await reloadManageRoles();
      alert(
        systemUserModalMode === "edit"
          ? isArabic
            ? "تم تحديث المستخدم"
            : "User updated"
          : isArabic
            ? "تم إضافة المستخدم"
            : "User added",
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      alert(
        formatUserCreationError(msg, isArabic) ||
          msg ||
          (isArabic ? "تعذر حفظ المستخدم" : "Could not save user"),
      );
    } finally {
      setSavingSystemUser(false);
    }
  }

  async function deleteSystemUserRow(user: AppUser, roleRow?: ManageUnifiedRoleRow) {
    if (operatorUid && user.uid === operatorUid) {
      alert(isArabic ? "لا يمكن حذف حسابك الحالي" : "You cannot delete your own account");
      return;
    }

    const roleLabel =
      roleRow?.label ||
      resolveBuiltinRoleLabels(user.role, user.pharmacyId)[isArabic ? "nameAr" : "nameEn"];
    const linkedCustomRole =
      roleRow?.customRole ||
      manageCustomRoles.find(
        (role) => role.pharmacyId === user.pharmacyId && role.roleKey === user.role,
      );

    const confirmed = window.confirm(
      isArabic
        ? `حذف حساب «${user.email}» ودور «${roleLabel}» من هذه الصيدلية؟\n\nسيُزال السطر بالكامل ولن يعود المستخدم قادراً على الدخول.`
        : `Delete account «${user.email}» and role «${roleLabel}» for this pharmacy?\n\nThe row will be removed and they will lose access.`,
    );
    if (!confirmed) return;

    setSystemUserBusyUid(user.uid);
    try {
      await pharmacyService.deletePharmacyUserCascade(user.uid, {
        revokedBy: operatorUid,
        actingUser: operatorAppUser,
      });

      if (linkedCustomRole) {
        await pharmacyService.deletePharmacyCustomRole(linkedCustomRole.id);
      }

      await onRefreshSystemUsers();
      await reloadManageRoles();
      alert(isArabic ? "تم حذف الحساب والدور" : "Account and role removed");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      alert(
        formatUserCreationError(msg, isArabic) ||
          msg ||
          (isArabic ? "تعذر حذف المستخدم" : "Could not delete user"),
      );
    } finally {
      setSystemUserBusyUid(null);
    }
  }

  return {
    systemUserModalOpen,
    systemUserModalMode,
    editingSystemUserUid,
    systemUserForm,
    setSystemUserForm,
    savingSystemUser,
    systemUserBusyUid,
    showSystemUserPassword,
    setShowSystemUserPassword,
    operatorAppUser,
    manageRoleSelectEntries,
    manageOrphanSystemUsers,
    openAddSystemUserModal,
    openEditSystemUserModal,
    closeSystemUserModal,
    saveSystemUserForm,
    deleteSystemUserRow,
  };
}
