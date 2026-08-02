import { useMemo, useState } from "react";
import type { Employee, Page, PharmacyCustomRole, UserRole } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  CUSTOM_ROLE_TEMPLATE_OPTIONS,
  defaultPagesForCustomRoleTemplate,
} from "../../../utils/customRolePages";
import {
  buildDefaultRoleAccess,
  normalizeEditorAccess,
  type RolePermissionsEditorTarget,
} from "../../../components/staff/RolePermissionsEditorModal";
import {
  EDITABLE_BUILTIN_ROLES,
  type RolePermissionFlags,
} from "../../../utils/rolePermissions";
import { getEffectiveRoleAccess } from "../../../utils/roleAccess";
import {
  canEditRolePermissionsForRole,
  getRoleLabel,
  isCustomRole,
  isOrgPharmacyAdmin,
  isSuperAdmin,
  parseLoginAccountRole,
} from "../../../utils/roles";
import { emptyCustomRoleForm } from "../types";
import type { StaffSharedContext, StaffSharedDerived } from "./shared";

type StaffPermissionsParams = Pick<
  StaffSharedContext,
  "isArabic" | "appUser" | "currentUid" | "setBusy"
> &
  Pick<StaffSharedDerived, "catalogByEmployeeId"> & {
    customRoles: PharmacyCustomRole[];
    systemUsers: import("../../../types").SystemUser[];
    catalogTargetPharmacyId: string;
    employeesPanelPharmacyId: string;
    loadAll: () => Promise<void>;
    openCatalogAccountAdd: (preferredRole?: string) => void;
  };

export function useStaffPermissionsState({
  isArabic,
  appUser,
  currentUid,
  setBusy,
  catalogByEmployeeId,
  customRoles,
  systemUsers,
  catalogTargetPharmacyId,
  employeesPanelPharmacyId,
  loadAll,
  openCatalogAccountAdd,
}: StaffPermissionsParams) {
  const [permissionEditorTarget, setPermissionEditorTarget] =
    useState<RolePermissionsEditorTarget | null>(null);
  const [permissionEditorPages, setPermissionEditorPages] = useState<Page[]>([]);
  const [permissionEditorPermissions, setPermissionEditorPermissions] =
    useState<RolePermissionFlags>({});
  const [customRoleModal, setCustomRoleModal] = useState(false);
  const [customRoleRequestMode, setCustomRoleRequestMode] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState(emptyCustomRoleForm);

  const customRoleTemplateOptions = useMemo(
    () =>
      isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)
        ? CUSTOM_ROLE_TEMPLATE_OPTIONS
        : CUSTOM_ROLE_TEMPLATE_OPTIONS.filter((role) => role !== "pharmacy_admin"),
    [appUser],
  );

  const permissionsBranchCustomRoles = useMemo(
    () =>
      customRoles.filter(
        (role) => role.pharmacyId === catalogTargetPharmacyId && role.isActive !== false,
      ),
    [customRoles, catalogTargetPharmacyId],
  );

  function openCustomRoleModal(requestMode = false) {
    setCustomRoleRequestMode(requestMode);
    setCustomRoleForm({
      nameAr: "",
      nameEn: "",
      baseRole: "cashier",
      allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
    });
    setCustomRoleModal(true);
  }

  function onCustomRoleBaseChange(baseRole: UserRole) {
    setCustomRoleForm((prev) => ({
      ...prev,
      baseRole,
      allowedPages: defaultPagesForCustomRoleTemplate(baseRole),
    }));
  }

  function toggleCustomRolePage(page: Page) {
    setCustomRoleForm((prev) => {
      const has = prev.allowedPages.includes(page);
      return {
        ...prev,
        allowedPages: has
          ? prev.allowedPages.filter((item) => item !== page)
          : [...prev.allowedPages, page],
      };
    });
  }

  async function saveCustomRole() {
    if (!customRoleForm.nameAr.trim() || !customRoleForm.nameEn.trim()) {
      alert(isArabic ? "أدخل اسم الدور بالعربية والإنجليزية" : "Enter role name in Arabic and English");
      return;
    }
    if (customRoleForm.allowedPages.length === 0) {
      alert(isArabic ? "اختر صفحة واحدة على الأقل" : "Select at least one page");
      return;
    }

    setBusy("save-custom-role");
    try {
      const targetPharmacyId = customRoleRequestMode
        ? employeesPanelPharmacyId
        : catalogTargetPharmacyId;
      const created = await pharmacyService.createPharmacyCustomRole({
        pharmacyId: targetPharmacyId,
        nameAr: customRoleForm.nameAr,
        nameEn: customRoleForm.nameEn,
        baseRole: customRoleForm.baseRole,
        allowedPages: customRoleForm.allowedPages,
        isActive: !customRoleRequestMode,
      });
      setCustomRoleModal(false);
      setCustomRoleRequestMode(false);
      await loadAll();
      if (customRoleRequestMode) {
        alert(
          isArabic
            ? `تم إرسال طلب دور «${created.nameAr}» — سيظهر لمالك النظام في «طلبات العملاء».`
            : `Role request «${created.nameEn}» submitted — it will appear under Customer requests.`,
        );
        return;
      }
      const openAccount = window.confirm(
        isArabic
          ? `تم إنشاء دور «${created.nameAr}». هل تريد إضافة حساب دخول له الآن؟`
          : `Role «${created.nameEn}» created. Add a login account for it now?`,
      );
      if (openAccount) {
        openCatalogAccountAdd(created.roleKey);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "custom_role_name_required"
          ? isArabic
            ? "أدخل اسم الدور"
            : "Enter role name"
          : msg || (isArabic ? "تعذر إنشاء الدور" : "Could not create role"),
      );
    } finally {
      setBusy("");
    }
  }

  function openPermissionEditorBuiltin(roleKey: (typeof EDITABLE_BUILTIN_ROLES)[number]) {
    const access = getEffectiveRoleAccess(roleKey, catalogTargetPharmacyId);
    setPermissionEditorTarget({ kind: "builtin", roleKey });
    setPermissionEditorPages([...access.allowedPages]);
    setPermissionEditorPermissions({ ...access.permissions });
  }

  function openPermissionEditorCustom(role: PharmacyCustomRole) {
    const access = getEffectiveRoleAccess(role.roleKey, role.pharmacyId);
    setPermissionEditorTarget({
      kind: "custom",
      roleKey: role.roleKey,
      customRoleId: role.id,
      baseRole: role.baseRole,
    });
    setPermissionEditorPages([...access.allowedPages]);
    setPermissionEditorPermissions({ ...access.permissions });
  }

  function isCurrentAppEmployee(emp: Employee): boolean {
    if (appUser?.employeeId && emp.id === appUser.employeeId) return true;
    const linkedUser = systemUsers.find((user) => user.employeeId === emp.id);
    if (linkedUser?.uid && linkedUser.uid === currentUid) return true;
    const linkedAccount = catalogByEmployeeId.get(emp.id);
    if (linkedAccount?.email && appUser?.email) {
      return linkedAccount.email.trim().toLowerCase() === appUser.email.trim().toLowerCase();
    }
    return false;
  }

  function openPermissionEditorForEmployee(emp: Employee) {
    if (isCurrentAppEmployee(emp)) {
      alert(
        isArabic
          ? "لا يمكنك تعديل صلاحيات حسابك الشخصي"
          : "You cannot edit your own permissions",
      );
      return;
    }

    const linked = catalogByEmployeeId.get(emp.id);
    if (!linked) {
      alert(
        isArabic
          ? "عيّن حساب دخول للموظف أولاً من عمود «حساب الدخول»"
          : "Assign a login account first using the Login account column",
      );
      return;
    }

    const roleKey = parseLoginAccountRole(linked.role);
    if (!canEditRolePermissionsForRole(appUser, roleKey)) {
      alert(
        isArabic
          ? "لا يمكن تعديل صلاحيات دور المدير العام من هنا"
          : "General Manager role permissions cannot be edited here",
      );
      return;
    }

    if (isCustomRole(roleKey)) {
      const custom =
        customRoles.find((role) => role.roleKey === roleKey && role.pharmacyId === emp.pharmacyId) ||
        permissionsBranchCustomRoles.find((role) => role.roleKey === roleKey);
      if (!custom) {
        alert(isArabic ? "الدور المخصص غير موجود" : "Custom role not found");
        return;
      }
      openPermissionEditorCustom(custom);
      return;
    }

    if (!EDITABLE_BUILTIN_ROLES.includes(roleKey as (typeof EDITABLE_BUILTIN_ROLES)[number])) {
      alert(isArabic ? "لا يمكن تعديل هذا الدور" : "This role cannot be edited");
      return;
    }

    openPermissionEditorBuiltin(roleKey as (typeof EDITABLE_BUILTIN_ROLES)[number]);
  }

  async function savePermissionEditor() {
    if (!permissionEditorTarget) return;
    if (permissionEditorPages.length === 0) {
      alert(isArabic ? "اختر صفحة واحدة على الأقل" : "Select at least one page");
      return;
    }

    const normalized = normalizeEditorAccess(
      permissionEditorTarget,
      permissionEditorPages,
      permissionEditorPermissions,
    );

    setBusy("save-role-permissions");
    try {
      if (permissionEditorTarget.kind === "builtin") {
        await pharmacyService.upsertPharmacyRoleConfig({
          pharmacyId: catalogTargetPharmacyId,
          roleKey: permissionEditorTarget.roleKey,
          allowedPages: normalized.allowedPages,
          permissions: normalized.permissions,
        });
      } else {
        await pharmacyService.updatePharmacyCustomRoleAccess(permissionEditorTarget.customRoleId, {
          allowedPages: normalized.allowedPages,
          permissions: normalized.permissions,
        });
      }
      setPermissionEditorTarget(null);
      await loadAll();
      alert(isArabic ? "تم حفظ الصلاحيات" : "Permissions saved");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setBusy("");
    }
  }

  function resetPermissionEditorDefaults() {
    if (!permissionEditorTarget) return;
    const defaults = buildDefaultRoleAccess(permissionEditorTarget);
    setPermissionEditorPages(defaults.allowedPages);
    setPermissionEditorPermissions(defaults.permissions);
  }

  async function resetRolePermissionsToDefaults(target: RolePermissionsEditorTarget) {
    const label = getRoleLabel(
      target.kind === "custom" ? target.roleKey : target.roleKey,
      isArabic,
    );
    if (
      !window.confirm(
        isArabic
          ? `استعادة الإعدادات الافتراضية لدور «${label}»؟`
          : `Reset «${label}» to default permissions?`,
      )
    ) {
      return;
    }

    setBusy("reset-role-permissions");
    try {
      if (target.kind === "builtin") {
        await pharmacyService.deletePharmacyRoleConfig(catalogTargetPharmacyId, target.roleKey);
      } else {
        const defaults = buildDefaultRoleAccess(target);
        await pharmacyService.updatePharmacyCustomRoleAccess(target.customRoleId, {
          allowedPages: defaults.allowedPages,
          permissions: defaults.permissions,
        });
      }
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الاستعادة" : "Reset failed");
    } finally {
      setBusy("");
    }
  }

  async function deleteCustomRoleDefinition(customRoleId: string, roleLabel: string) {
    const confirmed = window.confirm(
      isArabic
        ? `حذف الدور «${roleLabel}»؟\n\nلن يُحذف إذا كان مربوطاً بحساب أو مستخدم.`
        : `Delete role «${roleLabel}»?\n\nCannot delete if linked to an account or user.`,
    );
    if (!confirmed) return;

    setBusy(`del-role-${customRoleId}`);
    try {
      await pharmacyService.deletePharmacyCustomRole(customRoleId);
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "custom_role_in_use"
          ? isArabic
            ? "لا يمكن حذف الدور — يوجد حساب دخول مرتبط به"
            : "Cannot delete — a login account uses this role"
          : msg || (isArabic ? "تعذر حذف الدور" : "Could not delete role"),
      );
    } finally {
      setBusy("");
    }
  }

  return {
    permissionEditorTarget,
    setPermissionEditorTarget,
    permissionEditorPages,
    setPermissionEditorPages,
    permissionEditorPermissions,
    setPermissionEditorPermissions,
    customRoleModal,
    setCustomRoleModal,
    customRoleRequestMode,
    setCustomRoleRequestMode,
    customRoleForm,
    setCustomRoleForm,
    customRoleTemplateOptions,
    permissionsBranchCustomRoles,
    openCustomRoleModal,
    onCustomRoleBaseChange,
    toggleCustomRolePage,
    saveCustomRole,
    openPermissionEditorBuiltin,
    openPermissionEditorCustom,
    isCurrentAppEmployee,
    openPermissionEditorForEmployee,
    savePermissionEditor,
    resetPermissionEditorDefaults,
    resetRolePermissionsToDefaults,
    deleteCustomRoleDefinition,
  };
}
