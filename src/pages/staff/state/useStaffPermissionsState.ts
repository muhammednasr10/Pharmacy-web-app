import { useEffect, useMemo, useState } from "react";
import type { Employee, Page, PharmacyCustomRole, PlatformRoleDefault } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  buildDefaultRoleAccess,
  normalizeEditorAccess,
  type RolePermissionsEditorTarget,
} from "../../../components/staff/RolePermissionsEditorModal";
import {
  EDITABLE_BUILTIN_ROLES,
  type RolePermissionFlags,
} from "../../../utils/rolePermissions";
import {
  buildAvailablePharmacyRoleKeys,
  normalizeEnabledRoleKeys,
  resolvePharmacyEnabledRoleKeys,
} from "../../../utils/pharmacyEnabledRoles";
import { getEffectiveRoleAccess } from "../../../utils/roleAccess";
import {
  canEditRolePermissionsForRole,
  isCustomRole,
  parseLoginAccountRole,
} from "../../../utils/roles";
import type { StaffSharedContext, StaffSharedDerived } from "./shared";

type StaffPermissionsParams = Pick<
  StaffSharedContext,
  "isArabic" | "appUser" | "currentUid" | "setBusy"
> &
  Pick<StaffSharedDerived, "catalogByEmployeeId"> & {
    customRoles: PharmacyCustomRole[];
    systemUsers: import("../../../types").SystemUser[];
    catalogTargetPharmacyId: string;
    loadAll: () => Promise<void>;
  };

/**
 * Staff-page permissions: per-employee role editor + enabled-role keys for selects.
 * Pharmacy-wide role toggles / custom-role CRUD live in Settings.
 */
export function useStaffPermissionsState({
  isArabic,
  appUser,
  currentUid,
  setBusy,
  catalogByEmployeeId,
  customRoles,
  systemUsers,
  catalogTargetPharmacyId,
  loadAll,
}: StaffPermissionsParams) {
  const [permissionEditorTarget, setPermissionEditorTarget] =
    useState<RolePermissionsEditorTarget | null>(null);
  const [permissionEditorPages, setPermissionEditorPages] = useState<Page[]>([]);
  const [permissionEditorPermissions, setPermissionEditorPermissions] =
    useState<RolePermissionFlags>({});
  const [platformDefaults, setPlatformDefaults] = useState<PlatformRoleDefault[]>([]);
  const [enabledRoleKeys, setEnabledRoleKeys] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pharmacyService
      .listPlatformRoleDefaults({ ensureSeeded: true })
      .then((rows) => {
        if (!cancelled) setPlatformDefaults(rows);
      })
      .catch(() => {
        if (!cancelled) setPlatformDefaults([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalogTargetPharmacyId) {
      setEnabledRoleKeys(null);
      return;
    }
    let cancelled = false;
    void pharmacyService
      .getPharmacySettings(catalogTargetPharmacyId)
      .then((settings) => {
        if (cancelled) return;
        setEnabledRoleKeys(normalizeEnabledRoleKeys(settings?.enabledRoleKeys));
      })
      .catch(() => {
        if (!cancelled) setEnabledRoleKeys(null);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogTargetPharmacyId]);

  const availableRoleKeys = useMemo(
    () =>
      buildAvailablePharmacyRoleKeys({
        appUser,
        pharmacyId: catalogTargetPharmacyId,
        customRoles,
        platformDefaults,
      }),
    [appUser, catalogTargetPharmacyId, customRoles, platformDefaults],
  );

  const resolvedEnabledRoleKeys = useMemo(
    () =>
      resolvePharmacyEnabledRoleKeys({
        settings: { enabledRoleKeys },
        availableRoleKeys,
      }),
    [enabledRoleKeys, availableRoleKeys],
  );

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
      const custom = customRoles.find(
        (role) => role.roleKey === roleKey && role.pharmacyId === emp.pharmacyId,
      );
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

  return {
    permissionEditorTarget,
    setPermissionEditorTarget,
    permissionEditorPages,
    setPermissionEditorPages,
    permissionEditorPermissions,
    setPermissionEditorPermissions,
    resolvedEnabledRoleKeys,
    isCurrentAppEmployee,
    openPermissionEditorForEmployee,
    savePermissionEditor,
    resetPermissionEditorDefaults,
  };
}
