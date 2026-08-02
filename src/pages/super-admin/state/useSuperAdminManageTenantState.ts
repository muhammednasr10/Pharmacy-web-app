import { useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  Employee,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacyRoleConfig,
  PharmacySettings,
} from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { getBranchLabel } from "../../../utils/branchLabel";
import { resolveBranchDisplay } from "../../../utils/branchDisplay";
import { isCustomRole, loginAccountRoleOptions, normalizeRole } from "../../../utils/roles";
import { getRoleLabel } from "../../../utils/roles";
import {
  emptyBranchForm,
  type BranchForm,
  type DeleteTarget,
  type ManageRoleAccountDisplayRow,
  type ManageUnifiedRoleRow,
  type SuperAdminPageProps,
} from "../types";
import { makeBranchId } from "../helpers";
import type { SuperAdminSharedContext } from "./shared";

type ManageParams = Pick<
  SuperAdminSharedContext,
  | "isArabic"
  | "pharmacies"
  | "selected"
  | "selectedBranchUsage"
  | "selectedOrgBranches"
  | "selectedOrgBranchIds"
> & {
  expandedOrgIds: Record<string, boolean>;
  setExpandedOrgIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedPharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  onSwitchTenant: (id: string) => void;
  onOpenTenantUsers: (id: string) => void;
  onResetTenantForm: () => void;
  onCreateTenant: () => Promise<boolean>;
  onCreateOrganizationBranch: SuperAdminPageProps["onCreateOrganizationBranch"];
  onUpdateOrganizationBranch: SuperAdminPageProps["onUpdateOrganizationBranch"];
  onDeleteOrganization: SuperAdminPageProps["onDeleteOrganization"];
  onDeleteOrganizationBranch: SuperAdminPageProps["onDeleteOrganizationBranch"];
  onUpdateTenantStatus: SuperAdminPageProps["onUpdateTenantStatus"];
};

export function useSuperAdminManageTenantState(params: ManageParams) {
  const {
    isArabic,
    pharmacies,
    selected,
    selectedBranchUsage,
    selectedOrgBranches,
    selectedOrgBranchIds,
    expandedOrgIds,
    setExpandedOrgIds,
    onSelectPharmacy,
    onSwitchTenant,
    onOpenTenantUsers,
    onResetTenantForm,
    onCreateTenant,
    onCreateOrganizationBranch,
    onUpdateOrganizationBranch,
    onDeleteOrganization,
    onDeleteOrganizationBranch,
    onUpdateTenantStatus,
  } = params;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [branchModalMode, setBranchModalMode] = useState<"add" | "edit" | null>(null);
  const [branchForm, setBranchForm] = useState<BranchForm>(emptyBranchForm);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [manageRolesLoading, setManageRolesLoading] = useState(false);
  const [manageCustomRoles, setManageCustomRoles] = useState<PharmacyCustomRole[]>([]);
  const [manageRoleConfigs, setManageRoleConfigs] = useState<PharmacyRoleConfig[]>([]);
  const [manageEmployees, setManageEmployees] = useState<Employee[]>([]);
  const [manageLoginAccounts, setManageLoginAccounts] = useState<PharmacyLoginAccount[]>([]);
  const [manageOrgSystemUsers, setManageOrgSystemUsers] = useState<AppUser[]>([]);
  const [statusTarget, setStatusTarget] = useState<{
    pharmacy: PharmacySettings;
    nextStatus: "active" | "suspended";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteUpdating, setDeleteUpdating] = useState(false);

  async function reloadManageRoles() {
    if (!selected || selectedOrgBranchIds.length === 0) {
      setManageCustomRoles([]);
      setManageRoleConfigs([]);
      setManageEmployees([]);
      setManageLoginAccounts([]);
      setManageOrgSystemUsers([]);
      return;
    }
    setManageRolesLoading(true);
    try {
      const [customRoles, roleConfigs, employees, loginAccounts, orgUsers] = await Promise.all([
        pharmacyService.getPharmacyCustomRolesForPharmacies(selectedOrgBranchIds, {
          includeInactive: true,
        }),
        pharmacyService.getPharmacyRoleConfigsForPharmacies(selectedOrgBranchIds),
        pharmacyService.getEmployeesForPharmacies(selectedOrgBranchIds),
        pharmacyService.getPharmacyLoginAccountsForPharmacies(selectedOrgBranchIds),
        pharmacyService.getSystemUsersForPharmacies(selectedOrgBranchIds),
      ]);
      setManageCustomRoles(customRoles);
      setManageRoleConfigs(roleConfigs);
      setManageEmployees(employees);
      setManageLoginAccounts(loginAccounts);
      setManageOrgSystemUsers(
        [...orgUsers].sort((a, b) => a.email.localeCompare(b.email)),
      );
      pharmacyService.setPharmacyCustomRoles(customRoles.filter((role) => role.isActive !== false));
      pharmacyService.setPharmacyRoleConfigs(roleConfigs);
    } catch (error) {
      console.error(error);
      setManageCustomRoles([]);
      setManageRoleConfigs([]);
      setManageEmployees([]);
      setManageLoginAccounts([]);
      setManageOrgSystemUsers([]);
    } finally {
      setManageRolesLoading(false);
    }
  }

  useEffect(() => {
    if (!manageModalOpen || !selected) return;
    void reloadManageRoles();
  }, [manageModalOpen, selected?.id, selectedOrgBranchIds]);

  const manageEmployeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    manageEmployees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [manageEmployees]);

  const canPickSystemUserBranch = (selectedBranchUsage?.used ?? selectedOrgBranches.length) > 1;

  function resolveBuiltinRoleLabels(roleKey: string, pharmacyId: string) {
    const config = manageRoleConfigs.find(
      (row) => row.roleKey === roleKey && row.pharmacyId === pharmacyId,
    );
    return {
      nameAr: config?.labelAr?.trim() || getRoleLabel(roleKey, true),
      nameEn: config?.labelEn?.trim() || getRoleLabel(roleKey, false),
    };
  }

  function resolveRoleDisplayName(roleKey: string, pharmacyId: string) {
    if (isCustomRole(roleKey)) {
      const custom = manageCustomRoles.find(
        (role) => role.roleKey === roleKey && role.pharmacyId === pharmacyId,
      );
      if (custom) {
        return isArabic ? custom.nameAr : custom.nameEn;
      }
    }
    const labels = resolveBuiltinRoleLabels(roleKey, pharmacyId);
    return isArabic ? labels.nameAr : labels.nameEn;
  }

  const manageUnifiedRoleRows = useMemo((): ManageUnifiedRoleRow[] => {
    if (!selected) return [];
    const rows: ManageUnifiedRoleRow[] = [];

    for (const branch of selectedOrgBranches) {
      for (const roleKey of loginAccountRoleOptions) {
        const users = manageOrgSystemUsers.filter(
          (user) =>
            user.pharmacyId === branch.id && normalizeRole(user.role) === roleKey,
        );
        rows.push({
          id: `builtin:${branch.id}:${roleKey}`,
          roleKey,
          label: resolveBuiltinRoleLabels(roleKey, branch.id)[isArabic ? "nameAr" : "nameEn"],
          pharmacyId: branch.id,
          kind: "builtin",
          users,
          isPending: false,
        });
      }

      for (const role of manageCustomRoles.filter((item) => item.pharmacyId === branch.id)) {
        const users = manageOrgSystemUsers.filter(
          (user) => user.pharmacyId === branch.id && user.role === role.roleKey,
        );
        rows.push({
          id: role.id,
          roleKey: role.roleKey,
          label: isArabic ? role.nameAr : role.nameEn,
          pharmacyId: branch.id,
          kind: "custom",
          customRole: role,
          users,
          isPending: role.isActive === false,
        });
      }
    }

    return rows.sort((a, b) => {
      const byBranch = a.pharmacyId.localeCompare(b.pharmacyId);
      if (byBranch !== 0) return byBranch;
      if (a.kind !== b.kind) return a.kind === "builtin" ? -1 : 1;
      return a.label.localeCompare(b.label, isArabic ? "ar" : "en");
    });
  }, [
    selected,
    selectedOrgBranches,
    manageOrgSystemUsers,
    manageCustomRoles,
    manageRoleConfigs,
    isArabic,
  ]);

  const manageRoleAccountDisplayRows = useMemo((): ManageRoleAccountDisplayRow[] => {
    const rows: ManageRoleAccountDisplayRow[] = [];
    for (const roleRow of manageUnifiedRoleRows) {
      for (const user of roleRow.users) {
        rows.push({
          id: `${roleRow.id}:${user.uid}`,
          roleRow,
          user,
        });
      }
    }
    return rows;
  }, [manageUnifiedRoleRows]);

  const manageUnifiedRolesTableColSpan = 5;

  function openManage(pharmacyId: string) {
    onSelectPharmacy(pharmacyId);
    setManageModalOpen(true);
  }

  function closeAddModal() {
    setAddModalOpen(false);
    onResetTenantForm();
  }

  async function submitCreateTenant() {
    const ok = await onCreateTenant();
    if (ok) {
      setAddModalOpen(false);
      onResetTenantForm();
    }
  }

  function openAddBranchModal() {
    if (!selected) return;
    setBranchForm({
      ...emptyBranchForm,
      phone: selected.phone || "",
      address: selected.address || "",
    });
    setBranchModalMode("add");
  }

  function openEditBranchModal(branch: PharmacySettings) {
    setBranchForm({
      id: branch.id,
      name: branch.name || "",
      name_en: branch.name_en || "",
      phone: branch.phone || "",
      address: branch.address || "",
    });
    setBranchModalMode("edit");
  }

  function closeBranchModal() {
    setBranchModalMode(null);
    setBranchForm(emptyBranchForm);
  }

  async function submitBranchForm() {
    if (!selected) return;
    const name = branchForm.name.trim();
    if (!name) {
      alert(isArabic ? "من فضلك أدخل اسم الفرع" : "Please enter a branch name");
      return;
    }

    setCreatingBranch(true);
    try {
      if (branchModalMode === "edit" && branchForm.id) {
        const ok = await onUpdateOrganizationBranch(branchForm.id, {
          name,
          name_en: branchForm.name_en.trim() || name,
          phone: branchForm.phone.trim(),
          address: branchForm.address.trim(),
        });
        if (ok) closeBranchModal();
        return;
      }

      if (selectedBranchUsage && !selectedBranchUsage.canAdd) {
        alert(
          isArabic
            ? "تم الوصول لحد الفروع — زِد الحد أو غيّر الباقة أولاً"
            : "Branch limit reached — increase the cap or upgrade the package first",
        );
        return;
      }

      const id = makeBranchId(name, branchForm.name_en.trim(), selectedOrgBranches.map((branch) => branch.id));
      const ok = await onCreateOrganizationBranch(selected.id, {
        id,
        name,
        name_en: branchForm.name_en.trim() || name,
        phone: branchForm.phone.trim(),
        address: branchForm.address.trim(),
      });
      if (ok) closeBranchModal();
    } finally {
      setCreatingBranch(false);
    }
  }

  async function deleteBranch(branch: PharmacySettings) {
    if (!selectedBranchUsage) return;
    const display = resolveBranchDisplay(branch.id, pharmacies, isArabic);
    const label = display.combinedLabel;
    const confirmed = window.confirm(
      isArabic
        ? `حذف الفرع «${label}»؟\n\nتأكد أنه لا يحتوي بيانات (أدوية/فواتير/مستخدمين).`
        : `Delete branch «${label}»?\n\nMake sure it has no medicines, invoices, or users.`,
    );
    if (!confirmed) return;

    setDeletingBranchId(branch.id);
    try {
      await onDeleteOrganizationBranch(branch.id, selectedBranchUsage.organizationId);
    } finally {
      setDeletingBranchId(null);
    }
  }

  function branchLabelForRole(pharmacyId: string) {
    return getBranchLabel(pharmacyId, pharmacies, isArabic);
  }

  function handleOpenEmployeesPage(pharmacyId: string) {
    setManageModalOpen(false);
    onOpenTenantUsers(pharmacyId);
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setStatusUpdating(true);
    try {
      const ok = await onUpdateTenantStatus(statusTarget.pharmacy.id, statusTarget.nextStatus);
      if (ok) setStatusTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteUpdating(true);
    try {
      const ok =
        deleteTarget.kind === "organization"
          ? await onDeleteOrganization(deleteTarget.organizationId)
          : await onDeleteOrganizationBranch(deleteTarget.branch.id, deleteTarget.organizationId);
      if (ok) {
        if (
          deleteTarget.kind === "organization" &&
          expandedOrgIds[deleteTarget.organizationId]
        ) {
          setExpandedOrgIds((prev) => {
            const next = { ...prev };
            delete next[deleteTarget.organizationId];
            return next;
          });
        }
        setDeleteTarget(null);
      }
    } finally {
      setDeleteUpdating(false);
    }
  }

  function handleViewAsTenant(pharmacyId: string) {
    onSwitchTenant(pharmacyId);
  }

  return {
    addModalOpen,
    setAddModalOpen,
    manageModalOpen,
    setManageModalOpen,
    branchModalMode,
    branchForm,
    setBranchForm,
    creatingBranch,
    deletingBranchId,
    manageRolesLoading,
    manageCustomRoles,
    manageRoleConfigs,
    manageEmployees,
    manageLoginAccounts,
    manageOrgSystemUsers,
    statusTarget,
    setStatusTarget,
    statusUpdating,
    deleteTarget,
    setDeleteTarget,
    deleteUpdating,
    manageEmployeeById,
    canPickSystemUserBranch,
    manageUnifiedRoleRows,
    manageRoleAccountDisplayRows,
    manageUnifiedRolesTableColSpan,
    reloadManageRoles,
    resolveBuiltinRoleLabels,
    resolveRoleDisplayName,
    branchLabelForRole,
    openManage,
    closeAddModal,
    submitCreateTenant,
    openAddBranchModal,
    openEditBranchModal,
    closeBranchModal,
    submitBranchForm,
    deleteBranch,
    handleOpenEmployeesPage,
    confirmStatusChange,
    confirmDelete,
    handleViewAsTenant,
  };
}
