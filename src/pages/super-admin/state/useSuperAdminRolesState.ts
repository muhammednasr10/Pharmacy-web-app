import { useEffect, useMemo, useState } from "react";
import type { PharmacyCustomRole, UserRole } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { defaultPagesForCustomRoleTemplate } from "../../../utils/customRolePages";
import { getEffectiveRoleAccess } from "../../../utils/roleAccess";
import {
  getRoleLabel,
  loginAccountRoleOptions,
  rolePermissionMatrix,
} from "../../../utils/roles";
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
};

export function useSuperAdminRolesState(params: RolesParams) {
  const {
    isArabic,
    pharmacies,
    selected,
    activeTab,
    manageModalOpen,
    reloadManageRoles,
    onRefreshSystemUsers,
  } = params;

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [rolesReferenceRows, setRolesReferenceRows] = useState<PharmacyCustomRole[]>([]);
  const [rolesReferenceRoleConfigs, setRolesReferenceRoleConfigs] = useState<
    import("../../../types").PharmacyRoleConfig[]
  >([]);
  const [rolesReferenceUsers, setRolesReferenceUsers] = useState<
    import("../../../types").AppUser[]
  >([]);
  const [rolesReferenceLoading, setRolesReferenceLoading] = useState(false);
  const [rolesReferenceQuery, setRolesReferenceQuery] = useState("");

  const allPharmacyIds = useMemo(() => pharmacies.map((pharmacy) => pharmacy.id), [pharmacies]);

  async function reloadRolesReference() {
    setRolesReferenceLoading(true);
    try {
      const [customRoles, users, roleConfigs] = await Promise.all([
        pharmacyService.getPharmacyCustomRolesForPharmacies(allPharmacyIds, {
          includeInactive: true,
        }),
        pharmacyService.getAllSystemUsers(),
        pharmacyService.getPharmacyRoleConfigsForPharmacies(allPharmacyIds),
      ]);
      setRolesReferenceRows(customRoles);
      setRolesReferenceRoleConfigs(roleConfigs);
      setRolesReferenceUsers(users);
      await onRefreshSystemUsers();
    } catch (error) {
      console.error(error);
      setRolesReferenceRows([]);
      setRolesReferenceRoleConfigs([]);
      setRolesReferenceUsers([]);
    } finally {
      setRolesReferenceLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "roles") return;
    void reloadRolesReference();
  }, [activeTab, allPharmacyIds.join("|")]);

  const programRoleListRows = useMemo((): ProgramRoleRow[] => {
    const rows: ProgramRoleRow[] = [];

    for (const roleKey of loginAccountRoleOptions) {
      const matrix = rolePermissionMatrix.find((row) => row.role === roleKey);
      const config = rolesReferenceRoleConfigs.find((row) => row.roleKey === roleKey);
      const labelAr = config?.labelAr?.trim() || matrix?.labelAr || getRoleLabel(roleKey, true);
      const labelEn = config?.labelEn?.trim() || matrix?.labelEn || getRoleLabel(roleKey, false);
      rows.push({
        id: `builtin:${roleKey}`,
        roleKey,
        label: isArabic ? labelAr : labelEn,
        kind: "builtin",
        isPending: false,
      });
    }

    const seenCustomKeys = new Set<string>();
    for (const role of rolesReferenceRows) {
      if (seenCustomKeys.has(role.roleKey)) continue;
      seenCustomKeys.add(role.roleKey);
      rows.push({
        id: role.id,
        roleKey: role.roleKey,
        label: isArabic ? role.nameAr : role.nameEn,
        kind: "custom",
        customRole: role,
        isPending: role.isActive === false,
      });
    }

    return rows;
  }, [rolesReferenceRows, rolesReferenceRoleConfigs, isArabic]);

  const filteredProgramRoleListRows = useMemo(() => {
    const query = rolesReferenceQuery.trim().toLowerCase();
    if (!query) return programRoleListRows;
    return programRoleListRows.filter((row) => {
      const haystack = [row.roleKey, row.label, row.kind].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [programRoleListRows, rolesReferenceQuery]);

  function openAddRoleModal(pharmacyId?: string) {
    setRoleForm({
      ...emptyRoleForm,
      pharmacyId: pharmacyId || selected?.id || pharmacies[0]?.id || "",
    });
    setRoleModalOpen(true);
  }

  function openEditBuiltinRole(roleKey: string) {
    const matrix = rolePermissionMatrix.find((row) => row.role === roleKey);
    const config = rolesReferenceRoleConfigs.find((row) => row.roleKey === roleKey);
    setRoleForm({
      id: "",
      roleKey,
      kind: "builtin",
      nameAr: config?.labelAr?.trim() || matrix?.labelAr || getRoleLabel(roleKey, true),
      nameEn: config?.labelEn?.trim() || matrix?.labelEn || getRoleLabel(roleKey, false),
      baseRole: roleKey as UserRole,
      pharmacyId: pharmacies[0]?.id || "",
    });
    setRoleModalOpen(true);
  }

  function tryDeleteBuiltinRole(roleKey: string) {
    alert(
      isArabic
        ? `لا يمكن حذف الدور الأساسي «${getRoleLabel(roleKey, true)}» — يمكنك تعديل اسمه فقط`
        : `Cannot delete built-in role «${getRoleLabel(roleKey, false)}» — you can edit its name only`,
    );
  }

  function openEditRoleModal(role: PharmacyCustomRole) {
    setRoleForm({
      id: role.id,
      roleKey: role.roleKey,
      kind: "custom",
      nameAr: role.nameAr,
      nameEn: role.nameEn,
      baseRole: role.baseRole,
      pharmacyId: role.pharmacyId,
    });
    setRoleModalOpen(true);
  }

  function closeRoleModal() {
    setRoleModalOpen(false);
    setRoleForm(emptyRoleForm);
  }

  async function saveRoleForm() {
    const targetPharmacyId = roleForm.pharmacyId.trim();
    const nameAr = roleForm.nameAr.trim();
    const nameEn = roleForm.nameEn.trim();
    if (!targetPharmacyId) {
      alert(isArabic ? "اختر الصيدلية" : "Select a pharmacy");
      return;
    }
    if (!nameAr || !nameEn) {
      alert(isArabic ? "أدخل اسم الدور بالعربية والإنجليزية" : "Enter role name in Arabic and English");
      return;
    }

    setSavingRole(true);
    try {
      if (roleForm.kind === "builtin") {
        const anchorPharmacyId = pharmacies[0]?.id || "main";
        const access = getEffectiveRoleAccess(roleForm.roleKey, anchorPharmacyId);
        await Promise.all(
          pharmacies.map((pharmacy) =>
            pharmacyService.upsertPharmacyRoleConfig({
              pharmacyId: pharmacy.id,
              roleKey: roleForm.roleKey,
              allowedPages: access.allowedPages,
              permissions: access.permissions,
              labelAr: nameAr,
              labelEn: nameEn,
            }),
          ),
        );
      } else if (roleForm.id) {
        await pharmacyService.updatePharmacyCustomRoleNames(roleForm.id, { nameAr, nameEn });
      } else {
        await pharmacyService.createPharmacyCustomRole({
          pharmacyId: targetPharmacyId,
          nameAr,
          nameEn,
          baseRole: roleForm.baseRole,
          allowedPages: defaultPagesForCustomRoleTemplate(roleForm.baseRole),
        });
      }
      closeRoleModal();
      if (manageModalOpen) await reloadManageRoles();
      if (activeTab === "roles") await reloadRolesReference();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_name_required"
          ? isArabic
            ? "أدخل اسم الدور"
            : "Enter role name"
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
      if (manageModalOpen) await reloadManageRoles();
      if (activeTab === "roles") await reloadRolesReference();
      alert(isArabic ? "تم اعتماد الدور" : "Role approved");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الاعتماد" : "Could not approve");
    } finally {
      setSavingRole(false);
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
    reloadRolesReference,
    openAddRoleModal,
    openEditBuiltinRole,
    tryDeleteBuiltinRole,
    openEditRoleModal,
    closeRoleModal,
    saveRoleForm,
    activateCustomRole,
    deleteCustomRole,
  };
}
