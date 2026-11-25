import { useEffect, useMemo, useState } from "react";
import type { Page, PharmacyCustomRole, PlatformRoleDefault, UserRole } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { getBranchLabel } from "../../../utils/branchLabel";
import {
  CUSTOM_ROLE_TEMPLATE_OPTIONS,
  defaultPagesForCustomRoleTemplate,
} from "../../../utils/customRolePages";
import {
  defaultPagesForBuiltinRole,
  defaultPermissionsByRole,
  normalizeRolePermissionFlags,
  roleAccessSummaryTitle,
  summarizeRoleAccess,
  type RolePermissionFlags,
} from "../../../utils/rolePermissions";
import { getRoleLabel, loginAccountRoleOptions } from "../../../utils/roles";
import {
  emptyRoleForm,
  type ProgramRoleRow,
  type RoleFormState,
  type SaasTab,
} from "../types";
import type { SuperAdminSharedContext } from "./shared";

type RolesParams = Pick<SuperAdminSharedContext, "isArabic" | "pharmacies" | "selected"> & {
  activeTab: SaasTab;
  manageModalOpen: boolean;
  reloadManageRoles: () => Promise<void>;
  onRefreshSystemUsers: () => Promise<void>;
  onRefreshAdminRequests: () => Promise<void>;
};

function accessFromPlatformRow(
  row: PlatformRoleDefault,
  isArabic: boolean,
): Pick<ProgramRoleRow, "allowedPages" | "permissions" | "summary" | "summaryTitle"> {
  const allowedPages = row.allowedPages?.length
    ? row.allowedPages
    : defaultPagesForBuiltinRole(row.baseRole);
  const permissions = normalizeRolePermissionFlags(row.baseRole, row.permissions || {});
  return {
    allowedPages,
    permissions,
    summary: summarizeRoleAccess(allowedPages, permissions, isArabic),
    summaryTitle: roleAccessSummaryTitle(allowedPages, permissions, isArabic),
  };
}

export function useSuperAdminRolesState(params: RolesParams) {
  const {
    isArabic,
    pharmacies,
    selected,
    activeTab,
    manageModalOpen,
    reloadManageRoles,
    onRefreshSystemUsers,
    onRefreshAdminRequests,
  } = params;

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [platformDefaults, setPlatformDefaults] = useState<PlatformRoleDefault[]>([]);
  const [rolesReferenceRows, setRolesReferenceRows] = useState<PharmacyCustomRole[]>([]);
  const [rolesReferenceLoading, setRolesReferenceLoading] = useState(false);
  const [rolesReferenceQuery, setRolesReferenceQuery] = useState("");

  const allPharmacyIds = useMemo(() => pharmacies.map((pharmacy) => pharmacy.id), [pharmacies]);

  async function reloadRolesReference() {
    setRolesReferenceLoading(true);
    try {
      const [defaults, customRoles] = await Promise.all([
        pharmacyService.listPlatformRoleDefaults({ ensureSeeded: true }),
        pharmacyService.getPharmacyCustomRolesForPharmacies(allPharmacyIds, {
          includeInactive: true,
        }),
      ]);
      setPlatformDefaults(defaults);
      setRolesReferenceRows(customRoles);
      await Promise.all([onRefreshSystemUsers(), onRefreshAdminRequests()]);
    } catch (error) {
      console.error(error);
      setPlatformDefaults([]);
      setRolesReferenceRows([]);
    } finally {
      setRolesReferenceLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "roles") return;
    void reloadRolesReference();
  }, [activeTab, allPharmacyIds.join("|")]);

  const defaultRoleListRows = useMemo((): ProgramRoleRow[] => {
    const activeDefaults = platformDefaults.filter((row) => row.isActive !== false);
    if (activeDefaults.length > 0) {
      return activeDefaults.map((row) => ({
        id: row.id,
        roleKey: row.roleKey,
        label: isArabic ? row.nameAr : row.nameEn,
        kind: row.kind,
        isPending: false,
        ...accessFromPlatformRow(row, isArabic),
      }));
    }

    return loginAccountRoleOptions.map((roleKey) => {
      const allowedPages = defaultPagesForBuiltinRole(roleKey);
      const permissions = { ...defaultPermissionsByRole[roleKey] };
      return {
        id: `builtin:${roleKey}`,
        roleKey,
        label: getRoleLabel(roleKey, isArabic),
        kind: "builtin" as const,
        isPending: false,
        allowedPages,
        permissions,
        summary: summarizeRoleAccess(allowedPages, permissions, isArabic),
        summaryTitle: roleAccessSummaryTitle(allowedPages, permissions, isArabic),
      };
    });
  }, [platformDefaults, isArabic]);

  const pendingRoleSuggestionRows = useMemo((): ProgramRoleRow[] => {
    return rolesReferenceRows
      .filter((role) => role.isActive === false)
      .map((role) => {
        const allowedPages = role.allowedPages?.length
          ? role.allowedPages
          : defaultPagesForCustomRoleTemplate(role.baseRole);
        const permissions = normalizeRolePermissionFlags(role.baseRole, role.permissions || {});
        return {
          id: role.id,
          roleKey: role.roleKey,
          label: isArabic ? role.nameAr : role.nameEn,
          kind: "custom" as const,
          customRole: role,
          isPending: true,
          pharmacyId: role.pharmacyId,
          pharmacyName: getBranchLabel(role.pharmacyId, pharmacies, isArabic),
          allowedPages,
          permissions,
          summary: summarizeRoleAccess(allowedPages, permissions, isArabic),
          summaryTitle: roleAccessSummaryTitle(allowedPages, permissions, isArabic),
        };
      });
  }, [rolesReferenceRows, pharmacies, isArabic]);

  const programRoleListRows = useMemo(
    () => [...pendingRoleSuggestionRows, ...defaultRoleListRows],
    [pendingRoleSuggestionRows, defaultRoleListRows],
  );

  const filteredProgramRoleListRows = useMemo(() => {
    const query = rolesReferenceQuery.trim().toLowerCase();
    if (!query) return programRoleListRows;
    return programRoleListRows.filter((row) => {
      const haystack = [row.roleKey, row.label, row.kind, row.pharmacyName || "", row.summary || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [programRoleListRows, rolesReferenceQuery]);

  const filteredDefaultRoleListRows = useMemo(() => {
    const query = rolesReferenceQuery.trim().toLowerCase();
    if (!query) return defaultRoleListRows;
    return defaultRoleListRows.filter((row) => {
      const haystack = [row.roleKey, row.label, row.summary || ""].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [defaultRoleListRows, rolesReferenceQuery]);

  const filteredPendingRoleSuggestionRows = useMemo(() => {
    const query = rolesReferenceQuery.trim().toLowerCase();
    if (!query) return pendingRoleSuggestionRows;
    return pendingRoleSuggestionRows.filter((row) => {
      const haystack = [row.roleKey, row.label, row.pharmacyName || "", row.summary || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [pendingRoleSuggestionRows, rolesReferenceQuery]);

  function openAddRoleModal(_pharmacyId?: string) {
    setRoleForm({
      ...emptyRoleForm,
      kind: "custom",
      baseRole: "cashier",
      allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
      permissions: {},
      asPlatformDefault: true,
      pharmacyId: selected?.id || pharmacies[0]?.id || "",
    });
    setRoleModalOpen(true);
  }

  function openEditBuiltinRole(roleKey: string) {
    const platform = platformDefaults.find((row) => row.roleKey === roleKey);
    const allowedPages = platform?.allowedPages?.length
      ? [...platform.allowedPages]
      : defaultPagesForBuiltinRole(roleKey as import("../../../types").BuiltinUserRole);
    const permissions = normalizeRolePermissionFlags(
      (platform?.baseRole || roleKey) as import("../../../types").BuiltinUserRole,
      platform?.permissions || {},
    );
    setRoleForm({
      id: platform?.id || "",
      roleKey,
      kind: "builtin",
      nameAr: platform?.nameAr || getRoleLabel(roleKey, true),
      nameEn: platform?.nameEn || getRoleLabel(roleKey, false),
      baseRole: roleKey as UserRole,
      pharmacyId: "",
      allowedPages,
      permissions,
      asPlatformDefault: true,
    });
    setRoleModalOpen(true);
  }

  function openEditPlatformRole(row: ProgramRoleRow) {
    if (row.kind === "builtin") {
      openEditBuiltinRole(row.roleKey);
      return;
    }
    const platform = platformDefaults.find((item) => item.roleKey === row.roleKey);
    const baseRole = (platform?.baseRole || "cashier") as UserRole;
    setRoleForm({
      id: platform?.id || row.id,
      roleKey: row.roleKey,
      kind: "custom",
      nameAr: platform?.nameAr || row.label,
      nameEn: platform?.nameEn || row.label,
      baseRole,
      pharmacyId: "",
      allowedPages: platform?.allowedPages?.length
        ? [...platform.allowedPages]
        : defaultPagesForCustomRoleTemplate(baseRole),
      permissions: normalizeRolePermissionFlags(
        baseRole as import("../../../types").BuiltinUserRole,
        platform?.permissions || {},
      ),
      asPlatformDefault: true,
    });
    setRoleModalOpen(true);
  }

  function tryDeleteBuiltinRole(roleKey: string) {
    alert(
      isArabic
        ? `الدور الافتراضي «${getRoleLabel(roleKey, true)}» أساسي في النظام — يمكنك تعديل اسمه وصلاحياته فقط`
        : `Default role «${getRoleLabel(roleKey, false)}» is required by the system — you can edit its name and permissions only`,
    );
  }

  function openEditRoleModal(role: PharmacyCustomRole) {
    const allowedPages = role.allowedPages?.length
      ? [...role.allowedPages]
      : defaultPagesForCustomRoleTemplate(role.baseRole);
    setRoleForm({
      id: role.id,
      roleKey: role.roleKey,
      kind: "custom",
      nameAr: role.nameAr,
      nameEn: role.nameEn,
      baseRole: role.baseRole,
      pharmacyId: role.pharmacyId,
      allowedPages,
      permissions: normalizeRolePermissionFlags(role.baseRole, role.permissions || {}),
      asPlatformDefault: false,
    });
    setRoleModalOpen(true);
  }

  function closeRoleModal() {
    setRoleModalOpen(false);
    setRoleForm(emptyRoleForm);
  }

  function toggleRoleFormPage(page: Page) {
    setRoleForm((prev) => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(page)
        ? prev.allowedPages.filter((item) => item !== page)
        : [...prev.allowedPages, page],
    }));
  }

  function toggleRoleFormPermission(key: keyof RolePermissionFlags) {
    setRoleForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  }

  function onRoleFormBaseChange(baseRole: UserRole) {
    setRoleForm((prev) => ({
      ...prev,
      baseRole,
      allowedPages: defaultPagesForCustomRoleTemplate(baseRole),
      permissions: {},
    }));
  }

  async function saveRoleForm() {
    const nameAr = roleForm.nameAr.trim();
    const nameEn = roleForm.nameEn.trim();
    if (!nameAr || !nameEn) {
      alert(isArabic ? "أدخل اسم الدور بالعربية والإنجليزية" : "Enter role name in Arabic and English");
      return;
    }
    if (roleForm.allowedPages.length === 0) {
      alert(isArabic ? "اختر صفحة واحدة على الأقل" : "Select at least one page");
      return;
    }

    setSavingRole(true);
    try {
      if (roleForm.asPlatformDefault) {
        const persistedId =
          roleForm.id && !roleForm.id.startsWith("code:") ? roleForm.id : undefined;
        if (roleForm.kind === "builtin") {
          await pharmacyService.upsertPlatformRoleDefault({
            id: persistedId,
            roleKey: roleForm.roleKey,
            kind: "builtin",
            nameAr,
            nameEn,
            baseRole: roleForm.roleKey as UserRole,
            allowedPages: roleForm.allowedPages,
            permissions: roleForm.permissions,
            sortOrder: loginAccountRoleOptions.indexOf(roleForm.roleKey as UserRole) + 1,
          });
        } else if (persistedId && roleForm.roleKey.startsWith("custom_")) {
          await pharmacyService.upsertPlatformRoleDefault({
            id: persistedId,
            roleKey: roleForm.roleKey,
            kind: "custom",
            nameAr,
            nameEn,
            baseRole: roleForm.baseRole,
            allowedPages: roleForm.allowedPages,
            permissions: roleForm.permissions,
          });
        } else {
          await pharmacyService.createPlatformCustomRoleDefault({
            nameAr,
            nameEn,
            baseRole: roleForm.baseRole,
            allowedPages: roleForm.allowedPages,
            permissions: roleForm.permissions,
          });
        }
      } else if (roleForm.id) {
        await pharmacyService.updatePharmacyCustomRoleNames(roleForm.id, { nameAr, nameEn });
        await pharmacyService.updatePharmacyCustomRoleAccess(roleForm.id, {
          allowedPages: roleForm.allowedPages,
          permissions: roleForm.permissions,
        });
      } else {
        const targetPharmacyId = roleForm.pharmacyId.trim();
        if (!targetPharmacyId) {
          alert(isArabic ? "اختر الصيدلية" : "Select a pharmacy");
          return;
        }
        await pharmacyService.createPharmacyCustomRole({
          pharmacyId: targetPharmacyId,
          nameAr,
          nameEn,
          baseRole: roleForm.baseRole,
          allowedPages: roleForm.allowedPages,
          permissions: roleForm.permissions,
        });
      }
      closeRoleModal();
      if (manageModalOpen) await reloadManageRoles();
      if (activeTab === "roles") await reloadRolesReference();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_name_required" || message === "platform_role_name_required"
          ? isArabic
            ? "أدخل اسم الدور"
            : "Enter role name"
          : message === "platform_role_pages_required" || message === "custom_role_pages_required"
            ? isArabic
              ? "اختر صفحة واحدة على الأقل"
              : "Select at least one page"
            : message || (isArabic ? "تعذر حفظ الدور" : "Could not save role"),
      );
    } finally {
      setSavingRole(false);
    }
  }

  async function activateCustomRole(role: PharmacyCustomRole) {
    setSavingRole(true);
    try {
      await pharmacyService.activatePharmacyCustomRole(role.id);
      // Promote to platform defaults so it applies to every new pharmacy.
      try {
        await pharmacyService.upsertPlatformRoleDefault({
          roleKey: role.roleKey,
          kind: "custom",
          nameAr: role.nameAr,
          nameEn: role.nameEn,
          baseRole: role.baseRole,
          allowedPages: role.allowedPages?.length
            ? role.allowedPages
            : defaultPagesForCustomRoleTemplate(role.baseRole),
          permissions: normalizeRolePermissionFlags(role.baseRole, role.permissions || {}),
          isActive: true,
        });
      } catch (promoteError) {
        console.error("[roles] promote approved role to platform defaults failed", promoteError);
      }
      if (manageModalOpen) await reloadManageRoles();
      await reloadRolesReference();
      alert(
        isArabic
          ? "تم اعتماد الدور وإضافته للأدوار الافتراضية"
          : "Role approved and added to default roles",
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الاعتماد" : "Could not approve");
    } finally {
      setSavingRole(false);
    }
  }

  async function rejectCustomRole(role: PharmacyCustomRole) {
    const label = isArabic ? role.nameAr : role.nameEn;
    const confirmed = window.confirm(
      isArabic
        ? `رفض وحذف طلب الدور «${label}»؟`
        : `Reject and delete role request «${label}»?`,
    );
    if (!confirmed) return;

    setDeletingRoleId(role.id);
    try {
      await pharmacyService.deletePharmacyCustomRole(role.id);
      if (manageModalOpen) await reloadManageRoles();
      await reloadRolesReference();
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الرفض" : "Could not reject");
    } finally {
      setDeletingRoleId(null);
    }
  }

  async function deleteCustomRole(role: PharmacyCustomRole) {
    const label = isArabic ? role.nameAr : role.nameEn;
    const confirmed = window.confirm(
      isArabic
        ? `حذف الدور «${label}»؟\n\nلن يُحذف إذا كان مربوطاً بحساب أو مستخدم.`
        : `Delete role «${label}»?\n\nCannot delete if linked to an account or user.`,
    );
    if (!confirmed) return;

    setDeletingRoleId(role.id);
    try {
      await pharmacyService.deletePharmacyCustomRole(role.id);
      if (manageModalOpen) await reloadManageRoles();
      if (activeTab === "roles") await reloadRolesReference();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_in_use"
          ? isArabic
            ? "لا يمكن حذف الدور — يوجد حساب دخول مرتبط به"
            : "Cannot delete — a login account uses this role"
          : message || (isArabic ? "تعذر حذف الدور" : "Could not delete role"),
      );
    } finally {
      setDeletingRoleId(null);
    }
  }

  async function deletePlatformCustomRole(row: ProgramRoleRow) {
    if (row.kind !== "custom" || row.isPending) return;
    const confirmed = window.confirm(
      isArabic
        ? `حذف «${row.label}» من الأدوار الافتراضية؟\nلن يُنسخ للصيدليات الجديدة بعد الآن.`
        : `Remove «${row.label}» from default roles?\nIt will no longer be copied to new pharmacies.`,
    );
    if (!confirmed) return;

    setDeletingRoleId(row.id);
    try {
      await pharmacyService.deletePlatformRoleDefault(row.roleKey);
      await reloadRolesReference();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "platform_builtin_role_locked"
          ? isArabic
            ? "لا يمكن حذف الأدوار الأساسية"
            : "Built-in roles cannot be deleted"
          : message || (isArabic ? "تعذر الحذف" : "Could not delete"),
      );
    } finally {
      setDeletingRoleId(null);
    }
  }

  return {
    roleModalOpen,
    roleForm,
    setRoleForm,
    savingRole,
    deletingRoleId,
    rolesReferenceLoading,
    rolesReferenceQuery,
    setRolesReferenceQuery,
    filteredProgramRoleListRows,
    filteredDefaultRoleListRows,
    filteredPendingRoleSuggestionRows,
    pendingRoleSuggestionsCount: pendingRoleSuggestionRows.length,
    customRoleTemplateOptions: CUSTOM_ROLE_TEMPLATE_OPTIONS,
    reloadRolesReference,
    openAddRoleModal,
    openEditBuiltinRole,
    openEditPlatformRole,
    tryDeleteBuiltinRole,
    openEditRoleModal,
    closeRoleModal,
    toggleRoleFormPage,
    toggleRoleFormPermission,
    onRoleFormBaseChange,
    saveRoleForm,
    activateCustomRole,
    rejectCustomRole,
    deleteCustomRole,
    deletePlatformCustomRole,
  };
}
