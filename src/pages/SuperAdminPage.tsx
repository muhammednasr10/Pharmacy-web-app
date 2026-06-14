import { Fragment, useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacyRoleConfig,
  PharmacySettings,
  SubscriptionRequest,
  UserRole,
  Employee,
} from "../types";
import * as pharmacyService from "../services/pharmacyService";
import StaffEmployeeActionButton from "../components/staff/StaffEmployeeActionButton";
import { computeSubscriptionEndDate } from "../config/subscription";
import {
  getSubscriptionTier,
  getSubscriptionTierLabel,
  parseSubscriptionTier,
  subscriptionTierOrder,
  subscriptionTiers,
  type SubscriptionTier,
} from "../config/subscriptionTiers";
import {
  getOrganizationBranchUsage,
  groupPharmaciesByOrganization,
  resolveOrganizationId,
} from "../utils/branchLimits";
import { getOrganizationUserUsage } from "../utils/userLimits";
import {
  CUSTOM_ROLE_TEMPLATE_OPTIONS,
  defaultPagesForCustomRoleTemplate,
} from "../utils/customRolePages";
import { getEffectiveRoleAccess } from "../utils/roleAccess";
import { EDITABLE_BUILTIN_ROLES } from "../utils/rolePermissions";
import { getRoleLabel, superAdminRoleOptions, parseLoginAccountRole, getDefaultLoginAccountDraft, isCustomRole } from "../utils/roles";
import { formatLoginAccountSyncError } from "../utils/staffLoginAccountErrors";
import {
  buildCustomerRequestRows,
  getCustomerRequestCategoryLabel,
  type CustomerRequestFilter,
  type CustomerRequestRow,
} from "../utils/customerRequests";
import { parseTierUpgradePlan } from "../utils/subscriptionFeatures";
import { getSuperAdminSubscriptionWhatsappUrl } from "../utils/superAdminNotify";
import SaasAdminStatsPanel from "../components/SaasAdminStatsPanel";

type TenantPackageChoice = SubscriptionTier | "custom";

type TenantForm = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  packageChoice: TenantPackageChoice;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
};

type BranchForm = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
};

const emptyBranchForm: BranchForm = {
  id: "",
  name: "",
  name_en: "",
  phone: "",
  address: "",
};

type RoleFormState = {
  id: string;
  roleKey: string;
  kind: "builtin" | "custom";
  nameAr: string;
  nameEn: string;
  baseRole: UserRole;
};

const emptyRoleForm: RoleFormState = {
  id: "",
  roleKey: "",
  kind: "custom",
  nameAr: "",
  nameEn: "",
  baseRole: "cashier",
};

type SaasTab = "overview" | "pharmacies" | "customerRequests" | "packages";

const emptyLoginAccountForm = {
  pharmacyId: "",
  email: "",
  password: "",
  role: "cashier" as UserRole,
  employeeId: "",
};

type SuperAdminPageProps = {
  isArabic: boolean;
  operatorUid?: string;
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  selectedPharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  onSwitchTenant: (id: string) => void;
  onOpenTenantUsers: (id: string) => void;
  tenantForm: TenantForm;
  onTenantFormChange: (updates: Partial<TenantForm>) => void;
  onResetTenantForm: () => void;
  onCreateTenant: () => Promise<boolean>;
  creatingTenant: boolean;
  onCreateOrganizationBranch: (
    anchorPharmacyId: string,
    branch: { id: string; name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  onUpdateOrganizationBranch: (
    branchId: string,
    branch: { name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  onDeleteOrganization: (organizationId: string) => Promise<boolean>;
  onDeleteOrganizationBranch: (branchId: string, organizationId: string) => Promise<boolean>;
  onUpdateTenantStatus: (pharmacyId: string, status: "active" | "suspended") => Promise<boolean>;
  onUpdateMaxBranches: (organizationId: string, maxBranches: number) => Promise<boolean>;
  onUpdateMaxUsers: (organizationId: string, maxUsers: number) => Promise<boolean>;
  onUpdateSubscriptionTier: (organizationId: string, tier: SubscriptionTier) => Promise<boolean>;
  subscriptionRequests: SubscriptionRequest[];
  onApproveSubscriptionRequest: (requestId: number) => Promise<boolean>;
  onRejectSubscriptionRequest: (requestId: number, note?: string) => Promise<boolean>;
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  onApprovePharmacyLoginAccount: (accountId: string) => Promise<boolean>;
  onRejectPharmacyLoginAccount: (accountId: string, note?: string) => Promise<boolean>;
  onRefreshAdminRequests: () => Promise<void>;
  onRefreshSystemUsers: () => Promise<void>;
};

function isPharmacyActive(pharmacy: PharmacySettings) {
  const status = pharmacy.subscriptionStatus || "active";
  return (status === "active" || status === "trial") && pharmacy.isActive !== false;
}

export default function SuperAdminPage({
  isArabic,
  operatorUid,
  pharmacies,
  systemUsers,
  selectedPharmacyId,
  onSelectPharmacy,
  onSwitchTenant,
  onOpenTenantUsers,
  tenantForm,
  onTenantFormChange,
  onResetTenantForm,
  onCreateTenant,
  creatingTenant,
  onCreateOrganizationBranch,
  onUpdateOrganizationBranch,
  onDeleteOrganization,
  onDeleteOrganizationBranch,
  onUpdateTenantStatus,
  onUpdateMaxBranches,
  onUpdateMaxUsers,
  onUpdateSubscriptionTier,
  subscriptionRequests,
  onApproveSubscriptionRequest,
  onRejectSubscriptionRequest,
  pendingPharmacyLoginAccounts,
  onApprovePharmacyLoginAccount,
  onRejectPharmacyLoginAccount,
  onRefreshAdminRequests,
  onRefreshSystemUsers,
}: SuperAdminPageProps) {
  useEffect(() => {
    void onRefreshAdminRequests();
  }, [onRefreshAdminRequests]);
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
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [loginAccountModalOpen, setLoginAccountModalOpen] = useState(false);
  const [loginAccountModalMode, setLoginAccountModalMode] = useState<"add" | "edit">("add");
  const [editingLoginAccountId, setEditingLoginAccountId] = useState<string | null>(null);
  const [loginAccountForm, setLoginAccountForm] = useState(emptyLoginAccountForm);
  const [savingLoginAccount, setSavingLoginAccount] = useState(false);
  const [loginAccountBusyId, setLoginAccountBusyId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    pharmacy: PharmacySettings;
    nextStatus: "active" | "suspended";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | {
        kind: "organization";
        organizationId: string;
        pharmacy: PharmacySettings;
        branchCount: number;
      }
    | { kind: "branch"; branch: PharmacySettings; organizationId: string }
    | null
  >(null);
  const [deleteUpdating, setDeleteUpdating] = useState(false);
  const [tierEditModalOpen, setTierEditModalOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<SubscriptionTier | null>(null);
  const [tierEditForm, setTierEditForm] = useState({
    labelAr: "",
    labelEn: "",
    maxBranches: "",
    maxUsers: "",
    summaryAr: "",
    summaryEn: "",
    featuresAr: "",
    featuresEn: "",
    upgradeAmount: "",
  });
  const [savingTierConfig, setSavingTierConfig] = useState(false);
  const [tierConfigVersion, setTierConfigVersion] = useState(0);

  const selected = pharmacies.find((p) => p.id === selectedPharmacyId);
  const selectedBranchUsage = selected
    ? getOrganizationBranchUsage(pharmacies, selected)
    : null;
  const selectedUserUsage = selected
    ? getOrganizationUserUsage(systemUsers, pharmacies, selected)
    : null;
  const selectedOrgBranches = useMemo(() => {
    if (!selected) return [];
    const organizationId = resolveOrganizationId(selected);
    return pharmacies.filter((pharmacy) => resolveOrganizationId(pharmacy) === organizationId);
  }, [pharmacies, selected]);
  const selectedTier = selected
    ? parseSubscriptionTier(selected.subscriptionTier || selected.subscriptionPlan)
    : "basic";
  const selectedOrgBranchIds = useMemo(
    () => selectedOrgBranches.map((branch) => branch.id),
    [selectedOrgBranches],
  );
  async function reloadManageRoles() {
    if (!selected || selectedOrgBranchIds.length === 0) {
      setManageCustomRoles([]);
      setManageRoleConfigs([]);
      setManageEmployees([]);
      setManageLoginAccounts([]);
      return;
    }
    setManageRolesLoading(true);
    try {
      const [customRoles, roleConfigs, employees, loginAccounts] = await Promise.all([
        pharmacyService.getPharmacyCustomRolesForPharmacies(selectedOrgBranchIds),
        pharmacyService.getPharmacyRoleConfigsForPharmacies(selectedOrgBranchIds),
        pharmacyService.getEmployeesForPharmacies(selectedOrgBranchIds),
        pharmacyService.getPharmacyLoginAccountsForPharmacies(selectedOrgBranchIds),
      ]);
      setManageCustomRoles(customRoles);
      setManageRoleConfigs(roleConfigs);
      setManageEmployees(employees);
      setManageLoginAccounts(loginAccounts);
      pharmacyService.setPharmacyCustomRoles(customRoles);
      pharmacyService.setPharmacyRoleConfigs(roleConfigs);
    } catch (error) {
      console.error(error);
      setManageCustomRoles([]);
      setManageRoleConfigs([]);
      setManageEmployees([]);
      setManageLoginAccounts([]);
    } finally {
      setManageRolesLoading(false);
    }
  }

  const manageEmployeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    manageEmployees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [manageEmployees]);

  const systemUserByEmail = useMemo(() => {
    const map = new Map<string, AppUser>();
    systemUsers.forEach((user) => {
      if (user.email) map.set(user.email.trim().toLowerCase(), user);
    });
    return map;
  }, [systemUsers]);

  const loginAccountRoleSelectOptions = useMemo(() => {
    const builtin = superAdminRoleOptions.filter((role) => role !== "super_admin");
    const custom = manageCustomRoles.map((role) => role.roleKey);
    return [...new Set([...builtin, ...custom])];
  }, [manageCustomRoles]);

  const sortedManageLoginAccounts = useMemo(
    () =>
      [...manageLoginAccounts].sort((a, b) => {
        const byRole = getRoleLabel(a.role, isArabic).localeCompare(
          getRoleLabel(b.role, isArabic),
          isArabic ? "ar" : "en",
        );
        if (byRole !== 0) return byRole;
        return a.email.localeCompare(b.email);
      }),
    [manageLoginAccounts, isArabic],
  );

  useEffect(() => {
    if (!manageModalOpen || !selected) return;
    void reloadManageRoles();
  }, [manageModalOpen, selected?.id, selectedOrgBranchIds]);

  function openTierEditModal(tierId: SubscriptionTier) {
    const tier = subscriptionTiers[tierId];
    setEditingTierId(tierId);
    setTierEditForm({
      labelAr: tier.labelAr,
      labelEn: tier.labelEn,
      maxBranches: String(tier.maxBranches),
      maxUsers: String(tier.maxUsers),
      summaryAr: tier.summaryAr,
      summaryEn: tier.summaryEn,
      featuresAr: tier.featuresAr.join("\n"),
      featuresEn: tier.featuresEn.join("\n"),
      upgradeAmount: String(tier.upgradeAmount || 0),
    });
    setTierEditModalOpen(true);
  }

  function closeTierEditModal() {
    if (savingTierConfig) return;
    setTierEditModalOpen(false);
    setEditingTierId(null);
  }

  async function submitTierEdit() {
    if (!editingTierId) return;
    const maxBranches = Math.floor(Number(tierEditForm.maxBranches));
    const maxUsers = Math.floor(Number(tierEditForm.maxUsers));
    if (!tierEditForm.labelAr.trim() || !tierEditForm.labelEn.trim()) {
      alert(isArabic ? "أدخل اسم الباقة بالعربية والإنجليزية" : "Enter package name in Arabic and English");
      return;
    }
    if (!Number.isFinite(maxBranches) || maxBranches < 1) {
      alert(isArabic ? "أدخل حداً صحيحاً للفروع" : "Enter a valid branch limit");
      return;
    }
    if (!Number.isFinite(maxUsers) || maxUsers < 1) {
      alert(isArabic ? "أدخل حداً صحيحاً للمستخدمين" : "Enter a valid user limit");
      return;
    }

    setSavingTierConfig(true);
    try {
      await pharmacyService.upsertSubscriptionTierConfig(
        editingTierId,
        {
          labelAr: tierEditForm.labelAr,
          labelEn: tierEditForm.labelEn,
          maxBranches,
          maxUsers,
          summaryAr: tierEditForm.summaryAr,
          summaryEn: tierEditForm.summaryEn,
          featuresAr: tierEditForm.featuresAr.split("\n"),
          featuresEn: tierEditForm.featuresEn.split("\n"),
          upgradeAmount: Math.max(0, Number(tierEditForm.upgradeAmount) || 0),
        },
        operatorUid,
      );
      setTierConfigVersion((value) => value + 1);
      closeTierEditModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(
        message === "sql_migration_required"
          ? isArabic
            ? "شغّل migration subscription-tier-configs.sql في Supabase أولاً"
            : "Run subscription-tier-configs.sql migration in Supabase first"
          : message || (isArabic ? "تعذر حفظ الباقة" : "Could not save package"),
      );
    } finally {
      setSavingTierConfig(false);
    }
  }

  const pendingSubscriptionRequests = useMemo(
    () => subscriptionRequests.filter((request) => request.status === "pending"),
    [subscriptionRequests],
  );
  const pendingCustomerRequestsCount =
    pendingSubscriptionRequests.length + pendingPharmacyLoginAccounts.length;
  const pharmacyNameById = useMemo(() => {
    const map = new Map<string, string>();
    pharmacies.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [pharmacies]);
  const [requestActionId, setRequestActionId] = useState<number | null>(null);
  const [loginRequestActionId, setLoginRequestActionId] = useState<string | null>(null);
  const [requestUpdating, setRequestUpdating] = useState(false);
  const [maxBranchDrafts, setMaxBranchDrafts] = useState<Record<string, string>>({});
  const [maxUserDrafts, setMaxUserDrafts] = useState<Record<string, string>>({});
  const [maxBranchSavingId, setMaxBranchSavingId] = useState<string | null>(null);
  const [maxUserSavingId, setMaxUserSavingId] = useState<string | null>(null);
  const [tierSavingId, setTierSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SaasTab>("overview");
  const [customerRequestFilter, setCustomerRequestFilter] = useState<CustomerRequestFilter>("all");
  const [expandedOrgIds, setExpandedOrgIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeTab !== "packages") return;
    void pharmacyService.loadSubscriptionTierConfigs().then(() => {
      setTierConfigVersion((value) => value + 1);
    });
  }, [activeTab]);

  const pharmacyOrgGroups = useMemo(
    () => groupPharmaciesByOrganization(pharmacies),
    [pharmacies],
  );

  function toggleOrgExpanded(organizationId: string) {
    setExpandedOrgIds((prev) => ({ ...prev, [organizationId]: !prev[organizationId] }));
  }

  const saasTabs = useMemo(
    () => [
      { id: "overview" as const, ar: "ملخص", en: "Overview" },
      { id: "pharmacies" as const, ar: "الصيدليات", en: "Pharmacies" },
      {
        id: "customerRequests" as const,
        ar: "طلبات العملاء",
        en: "Customer requests",
        badge: pendingCustomerRequestsCount,
      },
      { id: "packages" as const, ar: "الباقات", en: "Packages" },
    ],
    [pendingCustomerRequestsCount],
  );

  const customerRequestRows = useMemo(
    () =>
      buildCustomerRequestRows({
        subscriptionRequests,
        loginAccounts: pendingPharmacyLoginAccounts,
        pharmacyNameById,
        isArabic,
        filter: customerRequestFilter,
      }),
    [
      subscriptionRequests,
      pendingPharmacyLoginAccounts,
      pharmacyNameById,
      isArabic,
      customerRequestFilter,
    ],
  );

  function getTierBadgeClass(tier: SubscriptionTier) {
    if (tier === "premium") return "saasTierBadge premium";
    if (tier === "professional") return "saasTierBadge professional";
    return "saasTierBadge basic";
  }

  async function handleTierChange(pharmacy: PharmacySettings, nextTier: SubscriptionTier) {
    const currentTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    );
    if (nextTier === currentTier) return;

    const usage = getOrganizationBranchUsage(pharmacies, pharmacy);
    const userUsage = getOrganizationUserUsage(systemUsers, pharmacies, pharmacy);
    const tierMax = getSubscriptionTier(nextTier).maxBranches;
    const tierUserMax = getSubscriptionTier(nextTier).maxUsers;
    if (usage.used > tierMax) {
      alert(
        isArabic
          ? `لا يمكن خفض الباقة — الصيدلية تستخدم ${usage.used} فروع والباقة الجديدة تسمح بـ ${tierMax} فقط`
          : `Cannot downgrade — pharmacy uses ${usage.used} branches but the new tier allows only ${tierMax}`,
      );
      return;
    }
    if (userUsage.used > tierUserMax) {
      alert(
        isArabic
          ? `لا يمكن خفض الباقة — الصيدلية تستخدم ${userUsage.used} مستخدمين والباقة الجديدة تسمح بـ ${tierUserMax} فقط`
          : `Cannot downgrade — pharmacy uses ${userUsage.used} users but the new tier allows only ${tierUserMax}`,
      );
      return;
    }

    setTierSavingId(usage.organizationId);
    try {
      await onUpdateSubscriptionTier(usage.organizationId, nextTier);
    } finally {
      setTierSavingId(null);
    }
  }

  function getMaxBranchDraft(organizationId: string, fallback: number) {
    return maxBranchDrafts[organizationId] ?? String(fallback);
  }

  function getMaxUserDraft(organizationId: string, fallback: number) {
    return maxUserDrafts[organizationId] ?? String(fallback);
  }

  async function saveMaxUsers(organizationId: string, currentUsed: number) {
    const raw = getMaxUserDraft(organizationId, currentUsed);
    const next = Math.floor(Number(raw));
    if (!Number.isFinite(next) || next < 1) {
      alert(isArabic ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero");
      return;
    }
    if (next < currentUsed) {
      alert(
        isArabic
          ? `لا يمكن تقليل الحد عن المستخدمين الحاليين (${currentUsed})`
          : `Cannot set limit below current users (${currentUsed})`,
      );
      return;
    }
    setMaxUserSavingId(organizationId);
    try {
      const ok = await onUpdateMaxUsers(organizationId, next);
      if (ok) {
        setMaxUserDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[organizationId];
          return nextDrafts;
        });
      }
    } finally {
      setMaxUserSavingId(null);
    }
  }

  async function saveMaxBranches(organizationId: string, currentUsed: number) {
    const raw = getMaxBranchDraft(organizationId, currentUsed);
    const next = Math.floor(Number(raw));
    if (!Number.isFinite(next) || next < 1) {
      alert(isArabic ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero");
      return;
    }
    if (next < currentUsed) {
      alert(
        isArabic
          ? `لا يمكن تقليل الحد عن الفروع الحالية (${currentUsed})`
          : `Cannot set limit below current branches (${currentUsed})`,
      );
      return;
    }
    setMaxBranchSavingId(organizationId);
    try {
      const ok = await onUpdateMaxBranches(organizationId, next);
      if (ok) {
        setMaxBranchDrafts((prev) => {
          const nextDrafts = { ...prev };
          delete nextDrafts[organizationId];
          return nextDrafts;
        });
      }
    } finally {
      setMaxBranchSavingId(null);
    }
  }

  async function handleApproveRequest(requestId: number) {
    setRequestActionId(requestId);
    setRequestUpdating(true);
    try {
      await onApproveSubscriptionRequest(requestId);
    } finally {
      setRequestUpdating(false);
      setRequestActionId(null);
    }
  }

  async function handleRejectRequest(requestId: number) {
    const note = window.prompt(isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):");
    if (note === null) return;
    setRequestActionId(requestId);
    setRequestUpdating(true);
    try {
      await onRejectSubscriptionRequest(requestId, note || undefined);
    } finally {
      setRequestUpdating(false);
      setRequestActionId(null);
    }
  }

  async function handleApproveLoginRequest(accountId: string) {
    setLoginRequestActionId(accountId);
    setRequestUpdating(true);
    try {
      await onApprovePharmacyLoginAccount(accountId);
    } finally {
      setRequestUpdating(false);
      setLoginRequestActionId(null);
    }
  }

  async function handleRejectLoginRequest(accountId: string) {
    const note = window.prompt(isArabic ? "سبب الرفض (اختياري):" : "Rejection reason (optional):");
    if (note === null) return;
    setLoginRequestActionId(accountId);
    setRequestUpdating(true);
    try {
      await onRejectPharmacyLoginAccount(accountId, note || undefined);
    } finally {
      setRequestUpdating(false);
      setLoginRequestActionId(null);
    }
  }

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

  function makeBranchId(name: string, nameEn: string) {
    const base =
      (nameEn || name || "branch")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "branch";
    const existing = new Set(selectedOrgBranches.map((branch) => branch.id));
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
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

      const id = makeBranchId(name, branchForm.name_en.trim());
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
    const label = (isArabic ? branch.name : branch.name_en) || branch.name || branch.id;
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

  function formatUsageLabel(used: number, max: number, unitAr: string, unitEn: string) {
    return isArabic ? `${unitAr} ${used} من ${max}` : `${used} ${unitEn} of ${max}`;
  }

  function usagePercent(used: number, max: number) {
    if (!max) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  }

  function branchLabelForRole(pharmacyId: string) {
    const branch = pharmacies.find((row) => row.id === pharmacyId);
    if (!branch) return pharmacyId;
    return (isArabic ? branch.name : branch.name_en) || branch.name || pharmacyId;
  }

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
    const labels = resolveBuiltinRoleLabels(roleKey, pharmacyId);
    return isArabic ? labels.nameAr : labels.nameEn;
  }

  function openAddRoleModal() {
    setRoleForm(emptyRoleForm);
    setRoleModalOpen(true);
  }

  function openEditBuiltinRole(roleKey: string) {
    if (!selected) return;
    const labels = resolveBuiltinRoleLabels(roleKey, selected.id);
    setRoleForm({
      id: "",
      roleKey,
      kind: "builtin",
      nameAr: labels.nameAr,
      nameEn: labels.nameEn,
      baseRole: roleKey as UserRole,
    });
    setRoleModalOpen(true);
  }

  function openEditRoleModal(role: PharmacyCustomRole) {
    setRoleForm({
      id: role.id,
      roleKey: role.roleKey,
      kind: "custom",
      nameAr: role.nameAr,
      nameEn: role.nameEn,
      baseRole: role.baseRole,
    });
    setRoleModalOpen(true);
  }

  function closeRoleModal() {
    setRoleModalOpen(false);
    setRoleForm(emptyRoleForm);
  }

  function handleOpenEmployeesPage(pharmacyId: string) {
    setManageModalOpen(false);
    onOpenTenantUsers(pharmacyId);
  }

  async function saveRoleForm() {
    if (!selected) return;
    const nameAr = roleForm.nameAr.trim();
    const nameEn = roleForm.nameEn.trim();
    if (!nameAr || !nameEn) {
      alert(isArabic ? "أدخل اسم الدور بالعربية والإنجليزية" : "Enter role name in Arabic and English");
      return;
    }

    setSavingRole(true);
    try {
      if (roleForm.kind === "builtin") {
        const access = getEffectiveRoleAccess(roleForm.roleKey, selected.id);
        await pharmacyService.upsertPharmacyRoleConfig({
          pharmacyId: selected.id,
          roleKey: roleForm.roleKey,
          allowedPages: access.allowedPages,
          permissions: access.permissions,
          labelAr: nameAr,
          labelEn: nameEn,
        });
      } else if (roleForm.id) {
        await pharmacyService.updatePharmacyCustomRoleNames(roleForm.id, { nameAr, nameEn });
      } else {
        await pharmacyService.createPharmacyCustomRole({
          pharmacyId: selected.id,
          nameAr,
          nameEn,
          baseRole: roleForm.baseRole,
          allowedPages: defaultPagesForCustomRoleTemplate(roleForm.baseRole),
        });
      }
      closeRoleModal();
      await reloadManageRoles();
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
      await reloadManageRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_in_use"
          ? isArabic
            ? "لا يمكن حذف الدور — يوجد موظف أو حساب أو مستخدم يستخدمه"
            : "Cannot delete — an employee, account, or user uses this role"
          : message || (isArabic ? "تعذر حذف الدور" : "Could not delete role"),
      );
    } finally {
      setDeletingRoleId(null);
    }
  }

  function openAddLoginAccountModal() {
    if (!selected) return;
    const role = loginAccountRoleSelectOptions[0] || "cashier";
    const defaults = getDefaultLoginAccountDraft(role);
    setLoginAccountModalMode("add");
    setEditingLoginAccountId(null);
    setLoginAccountForm({
      pharmacyId: selected.id,
      email: defaults.email,
      password: defaults.password,
      role,
      employeeId: "",
    });
    setLoginAccountModalOpen(true);
  }

  function openEditLoginAccountModal(account: PharmacyLoginAccount) {
    setLoginAccountModalMode("edit");
    setEditingLoginAccountId(account.id);
    setLoginAccountForm({
      pharmacyId: account.pharmacyId,
      email: account.email,
      password: account.password || getDefaultLoginAccountDraft(parseLoginAccountRole(account.role)).password,
      role: parseLoginAccountRole(account.role),
      employeeId: account.employeeId || "",
    });
    setLoginAccountModalOpen(true);
  }

  function closeLoginAccountModal() {
    setLoginAccountModalOpen(false);
    setEditingLoginAccountId(null);
    setLoginAccountForm(emptyLoginAccountForm);
  }

  async function syncLoginAccountAfterSave(accountId: string | null, pharmacyId: string, role: UserRole) {
    if (!accountId) return;
    const refreshed = await pharmacyService.getPharmacyLoginAccounts(pharmacyId);
    const saved =
      refreshed.find((item) => item.id === accountId) ||
      refreshed.find((item) => parseLoginAccountRole(item.role) === role);
    if (!saved || saved.status !== "approved") return;
    const employee = saved.employeeId ? manageEmployeeById.get(saved.employeeId) : undefined;
    await pharmacyService.syncPharmacyLoginAccountToUser(saved, { name: employee?.name });
  }

  async function saveLoginAccountForm() {
    const email = loginAccountForm.email.trim().toLowerCase();
    const password = loginAccountForm.password;
    const role = parseLoginAccountRole(loginAccountForm.role);
    const pharmacyId = loginAccountForm.pharmacyId || selected?.id || "";
    const employeeId = loginAccountForm.employeeId.trim();

    if (!pharmacyId || !email || !password) {
      alert(isArabic ? "أكمل الفرع والإيميل وكلمة المرور" : "Fill branch, email, and password");
      return;
    }
    if (password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setSavingLoginAccount(true);
    try {
      let savedAccountId = editingLoginAccountId;

      if (loginAccountModalMode === "edit" && editingLoginAccountId) {
        await pharmacyService.updatePharmacyLoginAccount(editingLoginAccountId, {
          email,
          password,
          role,
          status: "approved",
        });
      } else {
        const duplicateEmail = manageLoginAccounts.some(
          (item) =>
            item.pharmacyId === pharmacyId && item.email.trim().toLowerCase() === email,
        );
        if (duplicateEmail) {
          alert(
            isArabic
              ? "هذا الإيميل مستخدم بالفعل في هذا الفرع"
              : "This email is already used for this branch",
          );
          return;
        }
        const created = await pharmacyService.createPharmacyLoginAccount({
          pharmacyId,
          email,
          password,
          role,
          status: "approved",
        });
        savedAccountId = created.id;
      }

      if (savedAccountId && employeeId) {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(
          savedAccountId,
          employeeId,
          pharmacyId,
        );
        await pharmacyService.updateEmployee(employeeId, { jobTitle: role });
      } else if (savedAccountId && loginAccountModalMode === "edit" && !employeeId) {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(savedAccountId, null, pharmacyId);
      }

      try {
        await syncLoginAccountAfterSave(savedAccountId, pharmacyId, role);
      } catch (syncError) {
        const message =
          syncError instanceof Error
            ? formatLoginAccountSyncError(syncError.message, isArabic)
            : isArabic
              ? "تعذر ربط المستخدم"
              : "Could not link user";
        alert(
          isArabic
            ? `تم حفظ الحساب لكن الربط فشل:\n${message}`
            : `Account saved but linking failed:\n${message}`,
        );
      }

      closeLoginAccountModal();
      await onRefreshSystemUsers();
      await reloadManageRoles();
      alert(isArabic ? "تم حفظ حساب الدخول" : "Login account saved");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setSavingLoginAccount(false);
    }
  }

  async function approveManageLoginAccount(account: PharmacyLoginAccount) {
    setLoginAccountBusyId(`approve-${account.id}`);
    try {
      await pharmacyService.superAdminApprovePharmacyLoginAccountCatalog(
        account.id,
        operatorUid,
      );
      await onRefreshSystemUsers();
      await reloadManageRoles();
    } catch (error) {
      alert(
        error instanceof Error
          ? formatLoginAccountSyncError(error.message, isArabic)
          : isArabic
            ? "تعذر الاعتماد"
            : "Could not approve",
      );
    } finally {
      setLoginAccountBusyId(null);
    }
  }

  async function linkManageLoginAccount(account: PharmacyLoginAccount) {
    setLoginAccountBusyId(`link-${account.id}`);
    try {
      const employee = account.employeeId ? manageEmployeeById.get(account.employeeId) : undefined;
      await pharmacyService.syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      await onRefreshSystemUsers();
      await reloadManageRoles();
      alert(isArabic ? "تم ربط الحساب" : "Account linked");
    } catch (error) {
      alert(
        error instanceof Error
          ? formatLoginAccountSyncError(error.message, isArabic)
          : isArabic
            ? "تعذر الربط"
            : "Could not link",
      );
    } finally {
      setLoginAccountBusyId(null);
    }
  }

  async function unlinkManageLoginAccount(
    account: PharmacyLoginAccount,
    linkedUser: AppUser,
  ) {
    const confirmed = window.confirm(
      isArabic
        ? `فصل ربط ${account.email}؟\n\nسيتم طرد المستخدم فوراً إن كان متصلاً.`
        : `Unlink ${account.email}?\n\nThe user will be signed out immediately if online.`,
    );
    if (!confirmed) return;

    setLoginAccountBusyId(`unlink-${account.id}`);
    try {
      await pharmacyService.unlinkLoginAccountFromSystem(
        linkedUser.uid,
        account.id,
        operatorUid,
      );
      await onRefreshSystemUsers();
      await reloadManageRoles();
      alert(isArabic ? "تم فصل الربط" : "Account unlinked");
    } catch (error) {
      alert(
        error instanceof Error
          ? formatLoginAccountSyncError(error.message, isArabic)
          : isArabic
            ? "تعذر فصل الربط"
            : "Could not unlink",
      );
    } finally {
      setLoginAccountBusyId(null);
    }
  }

  async function deleteManageLoginAccount(account: PharmacyLoginAccount) {
    const linkedEmployee = account.employeeId
      ? manageEmployeeById.get(account.employeeId)
      : undefined;
    const confirmed = window.confirm(
      linkedEmployee
        ? isArabic
          ? `حذف حساب ${account.email}؟\n\nسيتم فك ربطه بالموظف ${linkedEmployee.name}.`
          : `Delete account ${account.email}?\n\nIt will be unlinked from ${linkedEmployee.name}.`
        : isArabic
          ? `حذف حساب ${account.email}؟`
          : `Delete account ${account.email}?`,
    );
    if (!confirmed) return;

    setLoginAccountBusyId(`delete-${account.id}`);
    try {
      await pharmacyService.deletePharmacyLoginAccount(account.id);
      await onRefreshSystemUsers();
      await reloadManageRoles();
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الحذف" : "Delete failed");
    } finally {
      setLoginAccountBusyId(null);
    }
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

  function formatEndDateAfterApproval(request: SubscriptionRequest) {
    const targetTier = parseTierUpgradePlan(request.plan);
    if (targetTier) {
      return getSubscriptionTierLabel(targetTier, isArabic);
    }
    const pharmacy = pharmacies.find((item) => item.id === request.pharmacyId);
    const endDate = computeSubscriptionEndDate(pharmacy?.subscriptionEndDate, request.days);
    return formatPharmacyDate(endDate);
  }

  function getCustomerRequestResult(row: CustomerRequestRow) {
    if (row.subscriptionRequest) {
      return formatEndDateAfterApproval(row.subscriptionRequest);
    }
    const account = row.loginAccount;
    if (!account) return "—";
    const kind = account.linkRequestPending ? "link" : account.editPending ? "edit" : "new";
    if (kind === "link") {
      return isArabic ? "ربط الحساب بالموظف" : "Account linked to employee";
    }
    if (kind === "edit") {
      return isArabic ? "تطبيق التعديلات" : "Apply pending changes";
    }
    return isArabic ? "حساب دخول معتمد" : "Approved login account";
  }

  function isCustomerRequestBusy(row: CustomerRequestRow) {
    if (!requestUpdating) return false;
    if (row.subscriptionRequest) return requestActionId === row.subscriptionRequest.id;
    if (row.loginAccount) return loginRequestActionId === row.loginAccount.id;
    return false;
  }

  function formatPharmacyDate(value?: string) {
    if (!value) return "—";

    const normalized = value.includes("T") ? value : `${value}T12:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getPharmacyStartDate(pharmacy: PharmacySettings) {
    return formatPharmacyDate(pharmacy.subscriptionStartedAt || pharmacy.createdAt);
  }

  function getPharmacyEndDate(pharmacy: PharmacySettings) {
    return formatPharmacyDate(pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt);
  }

  return (
    <section className="card saasPage">
      <div className="saasPageHeader">
        <div>
          <h2>{isArabic ? "إدارة الصيدليات (SaaS)" : "Pharmacy Tenants (SaaS)"}</h2>
          <p className="pageHint">
            {isArabic
              ? "كل صيدلية = عميل منفصل. البيانات معزولة عبر pharmacy_id و RLS."
              : "Each pharmacy is an isolated tenant (pharmacy_id + RLS)."}
          </p>
        </div>
      </div>

      <div className="staffPageTabsBar saasPageTabsBar">
        <nav
          className="settingsTabsNav"
          aria-label={isArabic ? "أقسام إدارة الصيدليات" : "Pharmacy admin sections"}
        >
          {saasTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settingsTabBtn${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isArabic ? tab.ar : tab.en}
              {tab.badge ? (
                <span className={`saasTabBadge${tab.badge > 0 ? " active" : ""}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        {activeTab === "pharmacies" && (
          <button
            type="button"
            className="completeBtn saasAddBtn"
            onClick={() => setAddModalOpen(true)}
          >
            + {isArabic ? "إضافة صيدلية" : "Add Pharmacy"}
          </button>
        )}
      </div>

      {activeTab === "overview" && (
        <div className="settingsTabPanel">
          <SaasAdminStatsPanel
            isArabic={isArabic}
            pharmacies={pharmacies}
            systemUsers={systemUsers}
            subscriptionRequests={subscriptionRequests}
            pendingLoginAccountRequests={pendingPharmacyLoginAccounts.length}
            isPharmacyActive={isPharmacyActive}
          />
        </div>
      )}

      {activeTab === "customerRequests" && (
      <section className="saasRequestsPanel settingsTabPanel">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "طلبات العملاء" : "Customer requests"}</h3>
            <p className="pageHint">
              {isArabic
                ? "كل الطلبات الواردة من الصيدليات: تجديد اشتراك، ترقية باقة، حسابات دخول جديدة، تعديلات، وربط — الطلبات المعتمدة أو المرفوضة تختفي من القائمة"
                : "All incoming pharmacy requests: renewals, package upgrades, new login accounts, edits, and links — approved or rejected requests leave this list"}
            </p>
          </div>
          <span className={`saasRequestsCount${pendingCustomerRequestsCount ? " active" : ""}`}>
            {pendingCustomerRequestsCount} {isArabic ? "قيد المراجعة" : "pending"}
          </span>
          <button type="button" className="printBtn" onClick={() => void onRefreshAdminRequests()}>
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>

        <div className="saasCustomerRequestFilters" role="tablist" aria-label={isArabic ? "تصفية الطلبات" : "Filter requests"}>
          {(
            [
              { id: "all" as const, ar: "الكل", en: "All" },
              { id: "subscription" as const, ar: "اشتراك", en: "Subscription" },
              { id: "login" as const, ar: "حسابات دخول", en: "Login accounts" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={customerRequestFilter === filter.id}
              className={`saasCustomerRequestFilterBtn${customerRequestFilter === filter.id ? " active" : ""}`}
              onClick={() => setCustomerRequestFilter(filter.id)}
            >
              {isArabic ? filter.ar : filter.en}
            </button>
          ))}
        </div>

        {customerRequestRows.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد طلبات قيد المراجعة حالياً" : "No pending customer requests"}
          </p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable saasRequestsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "رقم الطلب" : "Request #"}</th>
                  <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                  <th>{isArabic ? "التصنيف" : "Category"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "مقدم الطلب" : "Requested by"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "النتيجة بعد الاعتماد" : "Result after approval"}</th>
                  <th>{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {customerRequestRows.map((row) => {
                  const loginAccount = row.loginAccount;
                  const subscriptionRequest = row.subscriptionRequest;
                  const proposedPassword =
                    loginAccount?.pendingPassword || loginAccount?.password;

                  return (
                    <tr key={row.key}>
                      <td dir="ltr">
                        <code>{row.requestNumber}</code>
                      </td>
                      <td>
                        <strong>{row.pharmacyName}</strong>
                        <small className="saasSub" dir="ltr">
                          {row.pharmacyId}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`badge ${row.category === "subscription" ? "ok" : "warn"}`}
                        >
                          {getCustomerRequestCategoryLabel(row.category, isArabic)}
                        </span>
                      </td>
                      <td>{row.typeLabel}</td>
                      <td dir="ltr">
                        {row.details}
                        {loginAccount && proposedPassword ? (
                          <small className="saasSub">
                            {isArabic ? "كلمة المرور:" : "Password:"}{" "}
                            <code>{proposedPassword}</code>
                          </small>
                        ) : null}
                      </td>
                      <td>{row.requestedBy || "—"}</td>
                      <td>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </td>
                      <td>
                        <strong>{getCustomerRequestResult(row)}</strong>
                      </td>
                      <td>
                        <div className="saasActions">
                          {subscriptionRequest ? (
                            <a
                              className="smallBtn"
                              href={getSuperAdminSubscriptionWhatsappUrl(subscriptionRequest)}
                              target="_blank"
                              rel="noreferrer"
                              title={
                                isArabic
                                  ? "نسخ تفاصيل الطلب على واتساب"
                                  : "Share request details on WhatsApp"
                              }
                            >
                              WhatsApp
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="smallBtn"
                            disabled={isCustomerRequestBusy(row)}
                            onClick={() => {
                              if (subscriptionRequest) {
                                void handleApproveRequest(subscriptionRequest.id);
                                return;
                              }
                              if (loginAccount) {
                                void handleApproveLoginRequest(loginAccount.id);
                              }
                            }}
                          >
                            {isArabic ? "اعتماد" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="dangerBtn"
                            disabled={isCustomerRequestBusy(row)}
                            onClick={() => {
                              if (subscriptionRequest) {
                                void handleRejectRequest(subscriptionRequest.id);
                                return;
                              }
                              if (loginAccount) {
                                void handleRejectLoginRequest(loginAccount.id);
                              }
                            }}
                          >
                            {isArabic ? "رفض" : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {activeTab === "packages" && (
      <section className="saasTierPackages settingsTabPanel">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "باقات الاشتراك" : "Subscription packages"}</h3>
            <p className="pageHint">
              {isArabic
                ? "تحكم في حدود الفروع والمستخدمين والمميزات ورسوم الترقية — التعديلات تنعكس على العملاء الجدد وعند تغيير الباقة"
                : "Control branch/user limits, features, and upgrade fees — changes apply to new assignments and tier changes"}
            </p>
          </div>
        </div>
        <div className="saasTierGrid" key={tierConfigVersion}>
          {subscriptionTierOrder.map((tierId) => {
            const tier = subscriptionTiers[tierId];
            return (
              <article key={tierId} className={`saasTierCard ${tierId}`}>
                <div className="saasTierCardHeader">
                  <strong>{isArabic ? tier.labelAr : tier.labelEn}</strong>
                  <span className={getTierBadgeClass(tierId)}>
                    {isArabic
                      ? `${tier.maxBranches} فروع · ${tier.maxUsers} مستخدم`
                      : `${tier.maxBranches} branches · ${tier.maxUsers} users`}
                  </span>
                </div>
                <p>{isArabic ? tier.summaryAr : tier.summaryEn}</p>
                {tierId !== "basic" && tier.upgradeAmount > 0 ? (
                  <p className="saasTierUpgradeFee">
                    {isArabic
                      ? `رسوم الترقية: ${tier.upgradeAmount} ج.م`
                      : `Upgrade fee: ${tier.upgradeAmount} EGP`}
                  </p>
                ) : null}
                <ul>
                  {(isArabic ? tier.featuresAr : tier.featuresEn).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="saasTierCardActions">
                  <button type="button" className="editBtn" onClick={() => openTierEditModal(tierId)}>
                    {isArabic ? "تعديل الباقة" : "Edit package"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      )}

      {activeTab === "pharmacies" && (
      <div className="settingsTabPanel">
      <div className="tableWrap">
        {pharmacies.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد صيدليات بعد" : "No pharmacies yet"}</p>
        ) : (
          <table className="dataTable saasTable">
            <thead>
              <tr>
                <th>{isArabic ? "المعرف" : "ID"}</th>
                <th>{isArabic ? "الاسم" : "Name"}</th>
                <th>{isArabic ? "العنوان" : "Address"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "الباقة" : "Package"}</th>
                <th>{isArabic ? "الفروع" : "Branches"}</th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ بدء الاشتراك" : "Subscription start"}
                </th>
                <th className="saasDateCol">
                  {isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription end"}
                </th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{isArabic ? "المستخدمون" : "Users"}</th>
                <th>{isArabic ? "حد المستخدمين" : "User limit"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pharmacyOrgGroups.map((group) => {
                const pharmacy = group.primary;
                const hasChildren = group.childBranches.length > 0;
                const expanded = expandedOrgIds[group.organizationId] ?? false;
                const orgUsersCount = getOrganizationUserUsage(
                  systemUsers,
                  pharmacies,
                  pharmacy,
                ).used;
                const active = isPharmacyActive(pharmacy);
                const branchUsage = getOrganizationBranchUsage(pharmacies, pharmacy);
                const userUsage = getOrganizationUserUsage(systemUsers, pharmacies, pharmacy);

                return (
                  <Fragment key={group.organizationId}>
                    <tr
                      className={[
                        "saasOrgPrimaryRow",
                        selectedPharmacyId === pharmacy.id ? "saasRowSelected" : "",
                        hasChildren ? "saasOrgExpandableRow" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td>
                        <div className="saasOrgIdCell">
                          {hasChildren ? (
                            <button
                              type="button"
                              className="saasOrgExpandBtn"
                              aria-expanded={expanded}
                              aria-label={
                                isArabic
                                  ? expanded
                                    ? "طي الفروع"
                                    : "عرض الفروع"
                                  : expanded
                                    ? "Collapse branches"
                                    : "Expand branches"
                              }
                              onClick={() => toggleOrgExpanded(group.organizationId)}
                            >
                              <span
                                className={`saasOrgExpandIcon${expanded ? " expanded" : ""}`}
                                aria-hidden
                              >
                                ▶
                              </span>
                            </button>
                          ) : (
                            <span className="saasOrgExpandSpacer" aria-hidden />
                          )}
                          <code className="saasId">{pharmacy.id}</code>
                          <span className="saasOrgRoleBadge primary">
                            {isArabic ? "رئيسية" : "Main"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>
                          {isArabic ? pharmacy.name : pharmacy.name_en || pharmacy.name}
                        </strong>
                        {hasChildren ? (
                          <small className="saasSub saasOrgBranchHint">
                            {isArabic
                              ? `${group.childBranches.length} فرع${group.childBranches.length === 1 ? "" : "اً"} — اضغط للتوسيع`
                              : `${group.childBranches.length} branch${group.childBranches.length === 1 ? "" : "es"} — click to expand`}
                          </small>
                        ) : null}
                      </td>
                      <td>{pharmacy.address || "—"}</td>
                      <td dir="ltr">{pharmacy.phone || "—"}</td>
                      <td>
                        <span
                          className={getTierBadgeClass(
                            parseSubscriptionTier(
                              pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
                            ),
                          )}
                        >
                          {getSubscriptionTierLabel(
                            pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
                            isArabic,
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="saasBranchUsed">
                          {branchUsage.used} / {branchUsage.max}
                        </span>
                      </td>
                      <td className="saasDateCell">{getPharmacyStartDate(pharmacy)}</td>
                      <td className="saasDateCell">{getPharmacyEndDate(pharmacy)}</td>
                      <td>
                        <span className={`saasBadge ${active ? "ok" : "danger"}`}>
                          {active
                            ? isArabic
                              ? "نشط"
                              : "Active"
                            : isArabic
                              ? "موقوف"
                              : "Suspended"}
                        </span>
                      </td>
                      <td>{orgUsersCount}</td>
                      <td>
                        <span className="saasBranchUsed">
                          {userUsage.used} / {userUsage.max}
                        </span>
                      </td>
                      <td>
                        <div className="saasActions">
                          <button
                            type="button"
                            className="smallBtn"
                            onClick={() => openManage(pharmacy.id)}
                          >
                            {isArabic ? "إدارة" : "Manage"}
                          </button>
                          <button
                            type="button"
                            className="editBtn"
                            onClick={() => handleViewAsTenant(pharmacy.id)}
                          >
                            {isArabic ? "عرض" : "View"}
                          </button>
                          {active ? (
                            <button
                              type="button"
                              className="dangerBtn"
                              onClick={() =>
                                setStatusTarget({ pharmacy, nextStatus: "suspended" })
                              }
                            >
                              {isArabic ? "إيقاف" : "Suspend"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="smallBtn"
                              onClick={() => setStatusTarget({ pharmacy, nextStatus: "active" })}
                            >
                              {isArabic ? "تفعيل" : "Activate"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="dangerBtn"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "organization",
                                organizationId: group.organizationId,
                                pharmacy,
                                branchCount: group.branches.length,
                              })
                            }
                          >
                            {isArabic ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded &&
                      group.childBranches.map((branch) => {
                        const branchUsersCount = systemUsers.filter(
                          (u) => u.pharmacyId === branch.id,
                        ).length;
                        const branchActive = isPharmacyActive(branch);
                        return (
                          <tr
                            key={branch.id}
                            className={[
                              "saasOrgBranchRow",
                              selectedPharmacyId === branch.id ? "saasRowSelected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <td>
                              <div className="saasOrgIdCell saasOrgBranchIdCell">
                                <span className="saasOrgBranchConnector" aria-hidden>
                                  └
                                </span>
                                <code className="saasId">{branch.id}</code>
                                <span className="saasOrgRoleBadge branch">
                                  {isArabic ? "فرع" : "Branch"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <strong>
                                {isArabic ? branch.name : branch.name_en || branch.name}
                              </strong>
                            </td>
                            <td>{branch.address || "—"}</td>
                            <td dir="ltr">{branch.phone || "—"}</td>
                            <td className="saasOrgInheritedCell">—</td>
                            <td className="saasOrgInheritedCell">—</td>
                            <td className="saasDateCell saasOrgInheritedCell">—</td>
                            <td className="saasDateCell saasOrgInheritedCell">—</td>
                            <td>
                              <span className={`saasBadge ${branchActive ? "ok" : "danger"}`}>
                                {branchActive
                                  ? isArabic
                                    ? "نشط"
                                    : "Active"
                                  : isArabic
                                    ? "موقوف"
                                    : "Suspended"}
                              </span>
                            </td>
                            <td>{branchUsersCount}</td>
                            <td className="saasOrgInheritedCell">—</td>
                            <td>
                              <div className="saasActions">
                                <button
                                  type="button"
                                  className="smallBtn"
                                  onClick={() => openManage(branch.id)}
                                >
                                  {isArabic ? "إدارة" : "Manage"}
                                </button>
                                <button
                                  type="button"
                                  className="editBtn"
                                  onClick={() => handleViewAsTenant(branch.id)}
                                >
                                  {isArabic ? "عرض" : "View"}
                                </button>
                                <button
                                  type="button"
                                  className="dangerBtn"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: "branch",
                                      branch,
                                      organizationId: group.organizationId,
                                    })
                                  }
                                >
                                  {isArabic ? "حذف" : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </div>
      )}

      {addModalOpen && (
        <div className="modalOverlay">
          <div
            className="invoiceModal saasModal saasModalWide saasAddTenantModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "إضافة صيدلية جديدة" : "Add New Pharmacy"}</h2>
                <p>
                  {isArabic
                    ? "أنشئ عميل SaaS جديد — المعرف ثابت ولا يُغيَّر بعد الإنشاء"
                    : "Create a new SaaS tenant — the ID is permanent after creation"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={closeAddModal}>
                ×
              </button>
            </div>

            <section className="saasFormSection">
              <h3 className="saasFormSectionTitle">
                {isArabic ? "بيانات الصيدلية" : "Pharmacy details"}
              </h3>
              <div className="formGrid saasFormGrid saasAddTenantFormGrid">
                <label className="saasField">
                  <span>{isArabic ? "المعرف (slug)" : "ID (slug)"}</span>
                  <input
                    value={tenantForm.id}
                    onChange={(e) => onTenantFormChange({ id: e.target.value })}
                    placeholder="focus-pharmacy"
                    dir="ltr"
                  />
                </label>
                <label className="saasField">
                  <span>{isArabic ? "اسم الصيدلية" : "Pharmacy name"}</span>
                  <input
                    value={tenantForm.name}
                    onChange={(e) => onTenantFormChange({ name: e.target.value })}
                    placeholder={isArabic ? "صيدلية فوكس" : "Focus Pharmacy"}
                  />
                </label>
                <label className="saasField">
                  <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
                  <input
                    value={tenantForm.name_en}
                    onChange={(e) => onTenantFormChange({ name_en: e.target.value })}
                    placeholder="Focus Pharmacy"
                    dir="ltr"
                  />
                </label>
                <label className="saasField">
                  <span>{isArabic ? "الهاتف" : "Phone"}</span>
                  <input
                    value={tenantForm.phone}
                    onChange={(e) => onTenantFormChange({ phone: e.target.value })}
                    placeholder="01020304050"
                    dir="ltr"
                  />
                </label>
                <label className="saasField saasFieldFull">
                  <span>{isArabic ? "العنوان" : "Address"}</span>
                  <input
                    value={tenantForm.address}
                    onChange={(e) => onTenantFormChange({ address: e.target.value })}
                    placeholder={isArabic ? "القاهرة" : "Cairo"}
                  />
                </label>
              </div>
            </section>

            <section className="saasFormSection">
              <h3 className="saasFormSectionTitle">
                {isArabic ? "باقة الاشتراك" : "Subscription package"}
              </h3>
              <p className="saasFormSectionHint">
                {isArabic
                  ? "اختر باقة جاهزة أو «مخصص» لتحديد حدود الفروع والمستخدمين بنفسك"
                  : "Pick a preset package or choose Custom to set branch and user limits yourself"}
              </p>
              <div className="saasTierPickGrid saasTierPickGridFour">
                {subscriptionTierOrder.map((tierId) => {
                  const tier = subscriptionTiers[tierId];
                  const selected = tenantForm.packageChoice === tierId;
                  return (
                    <button
                      key={tierId}
                      type="button"
                      className={`saasTierPickCard ${tierId}${selected ? " selected" : ""}`}
                      onClick={() =>
                        onTenantFormChange({
                          packageChoice: tierId,
                          subscriptionTier: tierId,
                          maxBranches: tier.maxBranches,
                          maxUsers: tier.maxUsers,
                        })
                      }
                    >
                      <span className="saasTierPickBadge">
                        {isArabic ? tier.labelAr : tier.labelEn}
                      </span>
                      <strong>{isArabic ? tier.summaryAr : tier.summaryEn}</strong>
                      <small>
                        {isArabic
                          ? `${tier.maxBranches} فروع · ${tier.maxUsers} مستخدم`
                          : `${tier.maxBranches} branches · ${tier.maxUsers} users`}
                      </small>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`saasTierPickCard custom${
                    tenantForm.packageChoice === "custom" ? " selected" : ""
                  }`}
                  onClick={() =>
                    onTenantFormChange({
                      packageChoice: "custom",
                      subscriptionTier: "premium",
                      maxBranches: Math.max(tenantForm.maxBranches, 3),
                      maxUsers: Math.max(tenantForm.maxUsers, 10),
                    })
                  }
                >
                  <span className="saasTierPickBadge">
                    {isArabic ? "مخصص" : "Custom"}
                  </span>
                  <strong>
                    {isArabic ? "حدود حسب اتفاقك" : "Limits tailored to your deal"}
                  </strong>
                  <small>
                    {isArabic
                      ? "تحكم في عدد الفروع والمستخدمين"
                      : "Control branches and users"}
                  </small>
                </button>
              </div>

              {tenantForm.packageChoice === "custom" ? (
                <div className="saasCustomLimitsPanel">
                  <p>
                    {isArabic
                      ? "الباقة المخصصة تفعّل مميزات الباقة الفاخرة مع الحدود التي تحددها"
                      : "Custom uses Premium features with the limits you set below"}
                  </p>
                  <div className="saasCustomLimitsGrid">
                    <label className="saasField">
                      <span>{isArabic ? "حد الفروع" : "Branch limit"}</span>
                      <input
                        type="number"
                        min={1}
                        value={tenantForm.maxBranches}
                        onChange={(e) =>
                          onTenantFormChange({
                            maxBranches: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                          })
                        }
                      />
                    </label>
                    <label className="saasField">
                      <span>{isArabic ? "حد المستخدمين" : "User limit"}</span>
                      <input
                        type="number"
                        min={1}
                        value={tenantForm.maxUsers}
                        onChange={(e) =>
                          onTenantFormChange({
                            maxUsers: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="saasSelectedPackageSummary">
                  <span>{isArabic ? "الحدود المختارة:" : "Selected limits:"}</span>
                  <strong>
                    {tenantForm.maxBranches} {isArabic ? "فروع" : "branches"} · {tenantForm.maxUsers}{" "}
                    {isArabic ? "مستخدم" : "users"}
                  </strong>
                </div>
              )}
            </section>

            <div className="modalActions saasModalActions">
              <button type="button" className="printBtn" onClick={closeAddModal}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={creatingTenant}
                onClick={() => void submitCreateTenant()}
              >
                {creatingTenant
                  ? isArabic
                    ? "جاري الإنشاء..."
                    : "Creating..."
                  : isArabic
                    ? "إنشاء الصيدلية"
                    : "Create Pharmacy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageModalOpen && selected && (
        <div className="modalOverlay">
          <div
            className="invoiceModal saasModal saasModalWide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "إدارة الصيدلية" : "Manage Pharmacy"} — {selected.name}
                </h2>
                <p>
                  <code dir="ltr">{selected.id}</code>
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={() => setManageModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="saasInfoGrid">
              <div>
                <span>{isArabic ? "الهاتف" : "Phone"}</span>
                <strong dir="ltr">{selected.phone || "—"}</strong>
              </div>
              <div>
                <span>{isArabic ? "الحالة" : "Status"}</span>
                <strong>
                  {isPharmacyActive(selected)
                    ? isArabic
                      ? "نشط"
                      : "Active"
                    : isArabic
                      ? "موقوف"
                      : "Suspended"}
                </strong>
              </div>
              <div>
                <span>{isArabic ? "بدء الاشتراك" : "Subscription start"}</span>
                <strong>{getPharmacyStartDate(selected)}</strong>
              </div>
              <div>
                <span>{isArabic ? "انتهاء الاشتراك" : "Subscription end"}</span>
                <strong>{getPharmacyEndDate(selected)}</strong>
              </div>
            </div>

            {selectedBranchUsage && selectedUserUsage && (
              <section className="saasManageLimitsCard">
                <div className="saasManageLimitsHead">
                  <div>
                    <h3>{isArabic ? "الباقة والحدود" : "Package & limits"}</h3>
                    <p className="saasManageLimitsHint">
                      {isArabic
                        ? "تغيير الباقة يضبط الحدود الافتراضية — يمكنك تعديل حد الفروع والمستخدمين يدوياً بعد ذلك"
                        : "Changing the package sets default limits — you can adjust branch and user caps manually"}
                    </p>
                  </div>
                  <span className={getTierBadgeClass(selectedTier)}>
                    {getSubscriptionTierLabel(selectedTier, isArabic)}
                  </span>
                </div>

                <div className="saasManageLimitsTiles">
                  <div className="saasManageLimitTile">
                    <span className="saasManageLimitTileLabel">
                      {isArabic ? "الباقة" : "Package"}
                    </span>
                    <select
                      className="saasTierSelect saasManageLimitControl"
                      value={selectedTier}
                      disabled={tierSavingId === selectedBranchUsage.organizationId}
                      onChange={(e) =>
                        void handleTierChange(selected, e.target.value as SubscriptionTier)
                      }
                    >
                      {subscriptionTierOrder.map((tierId) => (
                        <option key={tierId} value={tierId}>
                          {isArabic
                            ? subscriptionTiers[tierId].labelAr
                            : subscriptionTiers[tierId].labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="saasManageLimitTile">
                    <div className="saasManageLimitTileTop">
                      <span className="saasManageLimitTileLabel">
                        {isArabic ? "حد الفروع" : "Branch limit"}
                      </span>
                      <span className="saasManageUsageChip">
                        {formatUsageLabel(
                          selectedBranchUsage.used,
                          selectedBranchUsage.max,
                          "فرع",
                          "branches",
                        )}
                      </span>
                    </div>
                    <div className="saasManageUsageBar" aria-hidden>
                      <div
                        className="saasManageUsageBarFill branches"
                        style={{
                          width: `${usagePercent(selectedBranchUsage.used, selectedBranchUsage.max)}%`,
                        }}
                      />
                    </div>
                    <div className="saasBranchLimitEditor">
                      <input
                        type="number"
                        min={selectedBranchUsage.used}
                        className="saasBranchLimitInput saasManageLimitControl"
                        value={getMaxBranchDraft(
                          selectedBranchUsage.organizationId,
                          selectedBranchUsage.max,
                        )}
                        disabled={maxBranchSavingId === selectedBranchUsage.organizationId}
                        onChange={(e) =>
                          setMaxBranchDrafts((prev) => ({
                            ...prev,
                            [selectedBranchUsage.organizationId]: e.target.value,
                          }))
                        }
                        aria-label={isArabic ? "الحد الأقصى للفروع" : "Max branches"}
                      />
                      <button
                        type="button"
                        className="smallBtn"
                        disabled={maxBranchSavingId === selectedBranchUsage.organizationId}
                        onClick={() =>
                          void saveMaxBranches(
                            selectedBranchUsage.organizationId,
                            selectedBranchUsage.used,
                          )
                        }
                      >
                        {maxBranchSavingId === selectedBranchUsage.organizationId
                          ? "…"
                          : isArabic
                            ? "حفظ"
                            : "Save"}
                      </button>
                    </div>
                  </div>

                  <div className="saasManageLimitTile">
                    <div className="saasManageLimitTileTop">
                      <span className="saasManageLimitTileLabel">
                        {isArabic ? "حد المستخدمين" : "User limit"}
                      </span>
                      <span className="saasManageUsageChip">
                        {formatUsageLabel(
                          selectedUserUsage.used,
                          selectedUserUsage.max,
                          "مستخدم",
                          "users",
                        )}
                      </span>
                    </div>
                    <div className="saasManageUsageBar" aria-hidden>
                      <div
                        className="saasManageUsageBarFill users"
                        style={{
                          width: `${usagePercent(selectedUserUsage.used, selectedUserUsage.max)}%`,
                        }}
                      />
                    </div>
                    <div className="saasBranchLimitEditor">
                      <input
                        type="number"
                        min={selectedUserUsage.used}
                        className="saasBranchLimitInput saasManageLimitControl"
                        value={getMaxUserDraft(
                          selectedUserUsage.organizationId,
                          selectedUserUsage.max,
                        )}
                        disabled={maxUserSavingId === selectedUserUsage.organizationId}
                        onChange={(e) =>
                          setMaxUserDrafts((prev) => ({
                            ...prev,
                            [selectedUserUsage.organizationId]: e.target.value,
                          }))
                        }
                        aria-label={isArabic ? "الحد الأقصى للمستخدمين" : "Max users"}
                      />
                      <button
                        type="button"
                        className="smallBtn"
                        disabled={maxUserSavingId === selectedUserUsage.organizationId}
                        onClick={() =>
                          void saveMaxUsers(
                            selectedUserUsage.organizationId,
                            selectedUserUsage.used,
                          )
                        }
                      >
                        {maxUserSavingId === selectedUserUsage.organizationId
                          ? "…"
                          : isArabic
                            ? "حفظ"
                            : "Save"}
                      </button>
                    </div>
                  </div>
                </div>

                {selectedOrgBranches.length > 0 && (
                  <div className="saasManageBranchesList">
                    <span className="saasManageBranchesListLabel">
                      {isArabic ? "الفروع الحالية" : "Current branches"}
                    </span>
                    <div className="saasManageBranchChips">
                      {selectedOrgBranches.map((branch) => (
                        <span
                          key={branch.id}
                          className={`saasManageBranchChip${branch.id === selected.id ? " current" : ""}`}
                          title={branch.id}
                        >
                          {(isArabic ? branch.name : branch.name_en) || branch.name}
                          <code dir="ltr">{branch.id}</code>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="saasManageRolesCard">
              <div className="saasManageLimitsHead">
                <div>
                  <h3>{isArabic ? "الأدوار" : "Roles"}</h3>
                  <p className="saasManageLimitsHint">
                    {isArabic
                      ? "مدير عام فقط دور ثابت — باقي الأدوار تضيفها وتعدّلها وتحذفها بنفسك"
                      : "General Manager is the only fixed role — add, edit, and delete all other roles freely"}
                  </p>
                </div>
                <div className="saasManageRolesToolbar">
                  <button
                    type="button"
                    className="smallBtn"
                    disabled={manageRolesLoading || savingRole}
                    onClick={openAddRoleModal}
                  >
                    + {isArabic ? "إضافة دور" : "Add role"}
                  </button>
                </div>
              </div>

              {manageRolesLoading ? (
                <p className="empty">{isArabic ? "جاري تحميل الأدوار..." : "Loading roles..."}</p>
              ) : (
                <ul className="saasManageRolesList">
                  {EDITABLE_BUILTIN_ROLES.map((roleKey) => (
                    <li key={roleKey} className="saasManageRoleItem">
                      <span className="saasManageRoleName">
                        {selected ? resolveRoleDisplayName(roleKey, selected.id) : getRoleLabel(roleKey, isArabic)}
                      </span>
                      <div className="saasManageRoleItemActions">
                        <StaffEmployeeActionButton
                          icon="edit"
                          tone="edit"
                          label={isArabic ? "تعديل الدور" : "Edit role"}
                          disabled={!!deletingRoleId || savingRole}
                          onClick={() => openEditBuiltinRole(roleKey)}
                        />
                      </div>
                    </li>
                  ))}
                  {manageCustomRoles.map((role) => (
                    <li key={role.id} className="saasManageRoleItem">
                      <div className="saasManageRoleNameWrap">
                        <span className="saasManageRoleName">
                          {isArabic ? role.nameAr : role.nameEn}
                        </span>
                        {selectedOrgBranches.length > 1 && (
                          <small className="saasManageRoleBranch">
                            {branchLabelForRole(role.pharmacyId)}
                          </small>
                        )}
                      </div>
                      <div className="saasManageRoleItemActions">
                        <StaffEmployeeActionButton
                          icon="edit"
                          tone="edit"
                          label={isArabic ? "تعديل الدور" : "Edit role"}
                          disabled={!!deletingRoleId || savingRole}
                          onClick={() => openEditRoleModal(role)}
                        />
                        <StaffEmployeeActionButton
                          icon="delete"
                          tone="delete"
                          label={isArabic ? "حذف الدور" : "Delete role"}
                          disabled={deletingRoleId === role.id || savingRole}
                          loading={deletingRoleId === role.id}
                          onClick={() => void deleteCustomRole(role)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="saasManageRolesCard">
              <div className="saasManageLimitsHead">
                <div>
                  <h3>{isArabic ? "الفروع" : "Branches"}</h3>
                  <p className="saasManageLimitsHint">
                    {selectedBranchUsage
                      ? formatUsageLabel(
                          selectedBranchUsage.used,
                          selectedBranchUsage.max,
                          "فرع",
                          "branches",
                        )
                      : ""}
                  </p>
                </div>
                <div className="saasManageRolesToolbar">
                  <button
                    type="button"
                    className="smallBtn"
                    disabled={!selectedBranchUsage?.canAdd}
                    title={
                      selectedBranchUsage?.canAdd
                        ? undefined
                        : isArabic
                          ? "تم الوصول لحد الفروع"
                          : "Branch limit reached"
                    }
                    onClick={openAddBranchModal}
                  >
                    + {isArabic ? "إضافة فرع" : "Add branch"}
                  </button>
                </div>
              </div>
              <div className="tableWrap saasManageBranchesTableWrap">
                <table className="dataTable saasManageBranchesTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الفرع" : "Branch"}</th>
                      <th className="saasManageBranchPhoneCol">
                        {isArabic ? "رقم التليفون" : "Phone"}
                      </th>
                      <th>{isArabic ? "العنوان" : "Address"}</th>
                      <th>{isArabic ? "الحالة" : "Status"}</th>
                      <th className="saasManageBranchesActionsCol">
                        {isArabic ? "إجراءات" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrgBranches.map((branch) => {
                      const canDeleteBranch = selectedOrgBranches.length > 1;
                      return (
                        <tr
                          key={branch.id}
                          className={
                            branch.id === selected.id ? "saasManageBranchRowCurrent" : undefined
                          }
                        >
                          <td className="saasManageBranchNameCell">
                            <strong>
                              {(isArabic ? branch.name : branch.name_en) || branch.name}
                            </strong>
                            <code className="saasManageRoleKey" dir="ltr">
                              {branch.id}
                            </code>
                          </td>
                          <td className="saasManageBranchPhoneCell" dir="ltr">
                            {branch.phone || "—"}
                          </td>
                          <td className="saasManageBranchAddressCell">
                            {branch.address || "—"}
                          </td>
                          <td>
                            <span
                              className={`saasManageRoleTag${isPharmacyActive(branch) ? "" : " inactive"}`}
                            >
                              {isPharmacyActive(branch)
                                ? isArabic
                                  ? "نشط"
                                  : "Active"
                                : isArabic
                                  ? "موقوف"
                                  : "Suspended"}
                            </span>
                          </td>
                          <td>
                            <div className="saasManageRoleItemActions saasManageBranchesActions">
                              <StaffEmployeeActionButton
                                icon="edit"
                                tone="edit"
                                label={isArabic ? "تعديل الفرع" : "Edit branch"}
                                disabled={!!deletingBranchId || creatingBranch}
                                onClick={() => openEditBranchModal(branch)}
                              />
                              <StaffEmployeeActionButton
                                icon="delete"
                                tone="delete"
                                label={
                                  canDeleteBranch
                                    ? isArabic
                                      ? "حذف الفرع"
                                      : "Delete branch"
                                    : isArabic
                                      ? "لا يمكن حذف آخر فرع"
                                      : "Cannot delete the last branch"
                                }
                                disabled={
                                  !canDeleteBranch ||
                                  deletingBranchId === branch.id ||
                                  creatingBranch
                                }
                                loading={deletingBranchId === branch.id}
                                onClick={() => void deleteBranch(branch)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="saasManageRolesCard">
              <div className="saasManageLimitsHead">
                <div>
                  <h3>{isArabic ? "حسابات الدخول" : "Login accounts"}</h3>
                  <p className="saasManageLimitsHint">
                    {isArabic
                      ? `${sortedManageLoginAccounts.length} حساب — إضافة وتعديل وربط واعتماد من هنا مباشرة`
                      : `${sortedManageLoginAccounts.length} accounts — add, edit, link, and approve here`}
                  </p>
                </div>
                <div className="saasManageRolesToolbar">
                  <button
                    type="button"
                    className="smallBtn"
                    disabled={manageRolesLoading || savingLoginAccount}
                    onClick={openAddLoginAccountModal}
                  >
                    + {isArabic ? "إضافة حساب دخول" : "Add login account"}
                  </button>
                </div>
              </div>

              {manageRolesLoading ? (
                <p className="empty">{isArabic ? "جاري تحميل الحسابات..." : "Loading accounts..."}</p>
              ) : (
                <div className="saasManageBranchesTableWrap">
                  <table className="dataTable saasManageBranchesTable saasManageLoginAccountsTable">
                    <thead>
                      <tr>
                        <th>{isArabic ? "الدور" : "Role"}</th>
                        <th>{isArabic ? "الإيميل" : "Email"}</th>
                        <th>{isArabic ? "كلمة المرور" : "Password"}</th>
                        <th>{isArabic ? "الموظف" : "Employee"}</th>
                        <th>{isArabic ? "الربط" : "Link"}</th>
                        <th className="saasManageBranchesActionsCol">{isArabic ? "إجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedManageLoginAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="saasManageEmptyCell">
                            {isArabic ? "لا توجد حسابات دخول بعد" : "No login accounts yet"}
                          </td>
                        </tr>
                      ) : (
                        sortedManageLoginAccounts.map((account) => {
                          const role = parseLoginAccountRole(account.role);
                          const linkedUser = systemUserByEmail.get(account.email.trim().toLowerCase());
                          const assignedEmployee = account.employeeId
                            ? manageEmployeeById.get(account.employeeId)
                            : undefined;
                          const rowBusy =
                            savingLoginAccount ||
                            loginAccountBusyId === `approve-${account.id}` ||
                            loginAccountBusyId === `link-${account.id}` ||
                            loginAccountBusyId === `unlink-${account.id}` ||
                            loginAccountBusyId === `delete-${account.id}`;

                          return (
                            <tr key={account.id}>
                              <td>
                                <span className="saasManageRoleTag">
                                  {getRoleLabel(role, isArabic)}
                                </span>
                                {isCustomRole(role) ? (
                                  <small className="saasSub">{isArabic ? "مخصص" : "Custom"}</small>
                                ) : null}
                                {account.status === "pending" ? (
                                  <span className="saasBadge danger">{isArabic ? "معلّق" : "Pending"}</span>
                                ) : null}
                                {account.status === "rejected" ? (
                                  <span className="saasBadge danger">{isArabic ? "مرفوض" : "Rejected"}</span>
                                ) : null}
                              </td>
                              <td dir="ltr">{account.email}</td>
                              <td dir="ltr">
                                {account.password ? (
                                  <code className="saasId">{account.password}</code>
                                ) : linkedUser ? (
                                  <span className="saasSub">{isArabic ? "في Auth" : "In Auth"}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>{assignedEmployee?.name || "—"}</td>
                              <td>
                                {linkedUser ? (
                                  <span className="saasBadge ok">{isArabic ? "مربوط" : "Linked"}</span>
                                ) : account.status === "approved" ? (
                                  <span className="saasSub">{isArabic ? "غير مربوط" : "Not linked"}</span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <div className="saasManageRoleItemActions saasManageBranchesActions saasManageLoginActions">
                                  {(account.status === "pending" ||
                                    account.status === "rejected" ||
                                    account.editPending) && (
                                    <button
                                      type="button"
                                      className="smallBtn"
                                      disabled={rowBusy}
                                      onClick={() => void approveManageLoginAccount(account)}
                                    >
                                      {isArabic ? "اعتماد" : "Approve"}
                                    </button>
                                  )}
                                  {account.status === "approved" && !account.editPending && !linkedUser && (
                                    <button
                                      type="button"
                                      className="smallBtn"
                                      disabled={rowBusy}
                                      onClick={() => void linkManageLoginAccount(account)}
                                    >
                                      {isArabic ? "ربط" : "Link"}
                                    </button>
                                  )}
                                  {account.status === "approved" && !account.editPending && linkedUser && (
                                    <button
                                      type="button"
                                      className="editBtn"
                                      disabled={rowBusy}
                                      onClick={() => void unlinkManageLoginAccount(account, linkedUser)}
                                    >
                                      {isArabic ? "فصل" : "Unlink"}
                                    </button>
                                  )}
                                  <StaffEmployeeActionButton
                                    icon="edit"
                                    tone="edit"
                                    label={isArabic ? "تعديل" : "Edit"}
                                    disabled={rowBusy}
                                    onClick={() => openEditLoginAccountModal(account)}
                                  />
                                  <StaffEmployeeActionButton
                                    icon="delete"
                                    tone="delete"
                                    label={isArabic ? "حذف" : "Delete"}
                                    disabled={rowBusy}
                                    loading={loginAccountBusyId === `delete-${account.id}`}
                                    onClick={() => void deleteManageLoginAccount(account)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="saasManageFooterActions">
              <button
                type="button"
                className="editBtn"
                onClick={() => handleOpenEmployeesPage(selected.id)}
              >
                {isArabic ? "صفحة الموظفين" : "Employees page"}
              </button>
              <button
                type="button"
                className="editBtn"
                onClick={() => handleViewAsTenant(selected.id)}
              >
                {isArabic ? "عرض بيانات الصيدلية" : "View pharmacy data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loginAccountModalOpen && selected && (
        <div className="modalOverlay">
          <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {loginAccountModalMode === "edit"
                    ? isArabic
                      ? "تعديل حساب الدخول"
                      : "Edit login account"
                    : isArabic
                      ? "إضافة حساب دخول"
                      : "Add login account"}
                </h2>
                <p>{selected.name}</p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={savingLoginAccount}
                onClick={closeLoginAccountModal}
              >
                ×
              </button>
            </div>

            <div className="formGrid saasFormGrid">
              {selectedOrgBranches.length > 1 && (
                <label className="saasField saasFieldFull">
                  <span>{isArabic ? "الفرع" : "Branch"}</span>
                  <select
                    value={loginAccountForm.pharmacyId || selected.id}
                    onChange={(e) =>
                      setLoginAccountForm((prev) => ({ ...prev, pharmacyId: e.target.value }))
                    }
                  >
                    {selectedOrgBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {(isArabic ? branch.name : branch.name_en) || branch.name} ({branch.id})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="saasField">
                <span>{isArabic ? "الدور" : "Role"}</span>
                <select
                  value={loginAccountForm.role}
                  onChange={(e) => {
                    const role = parseLoginAccountRole(e.target.value);
                    setLoginAccountForm((prev) => {
                      if (loginAccountModalMode === "add") {
                        const defaults = getDefaultLoginAccountDraft(role);
                        return {
                          ...prev,
                          role,
                          email: defaults.email,
                          password: defaults.password,
                        };
                      }
                      return { ...prev, role };
                    });
                  }}
                >
                  {loginAccountRoleSelectOptions.map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {getRoleLabel(roleKey, isArabic)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="saasField">
                <span>{isArabic ? "الموظف (اختياري)" : "Employee (optional)"}</span>
                <select
                  value={loginAccountForm.employeeId}
                  onChange={(e) =>
                    setLoginAccountForm((prev) => ({ ...prev, employeeId: e.target.value }))
                  }
                >
                  <option value="">{isArabic ? "بدون ربط" : "None"}</option>
                  {manageEmployees
                    .filter(
                      (employee) =>
                        employee.pharmacyId === (loginAccountForm.pharmacyId || selected.id),
                    )
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "الإيميل" : "Email"}</span>
                <input
                  type="email"
                  value={loginAccountForm.email}
                  onChange={(e) =>
                    setLoginAccountForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  dir="ltr"
                />
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "كلمة المرور" : "Password"}</span>
                <input
                  type="text"
                  value={loginAccountForm.password}
                  onChange={(e) =>
                    setLoginAccountForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  dir="ltr"
                />
              </label>
            </div>

            <p className="loginHint">
              {isArabic
                ? "بعد الحفظ يُربط الحساب تلقائياً بالنظام ويظهر في صفحة الموظفين."
                : "After saving, the account is linked automatically and appears on the employees page."}
            </p>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={savingLoginAccount}
                onClick={closeLoginAccountModal}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={savingLoginAccount}
                onClick={() => void saveLoginAccountForm()}
              >
                {savingLoginAccount
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "حفظ"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tierEditModalOpen && editingTierId && (
        <div className="modalOverlay">
          <div className="invoiceModal saasModal saasModalWide" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "تعديل الباقة" : "Edit package"} —{" "}
                  {isArabic
                    ? subscriptionTiers[editingTierId].labelAr
                    : subscriptionTiers[editingTierId].labelEn}
                </h2>
                <p>
                  {isArabic
                    ? "التغييرات تُطبَّق عند تعيين الباقة لصيدلية أو طلب ترقية"
                    : "Changes apply when assigning the package or approving upgrades"}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={savingTierConfig}
                onClick={closeTierEditModal}
              >
                ×
              </button>
            </div>

            <div className="formGrid saasFormGrid">
              <label className="saasField">
                <span>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</span>
                <input
                  value={tierEditForm.labelAr}
                  onChange={(e) => setTierEditForm((prev) => ({ ...prev, labelAr: e.target.value }))}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الاسم (إنجليزي)" : "Name (English)"}</span>
                <input
                  value={tierEditForm.labelEn}
                  onChange={(e) => setTierEditForm((prev) => ({ ...prev, labelEn: e.target.value }))}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "حد الفروع" : "Branch limit"}</span>
                <input
                  type="number"
                  min={1}
                  value={tierEditForm.maxBranches}
                  onChange={(e) =>
                    setTierEditForm((prev) => ({ ...prev, maxBranches: e.target.value }))
                  }
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "حد المستخدمين" : "User limit"}</span>
                <input
                  type="number"
                  min={1}
                  value={tierEditForm.maxUsers}
                  onChange={(e) => setTierEditForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
                />
              </label>
              {editingTierId !== "basic" ? (
                <label className="saasField">
                  <span>{isArabic ? "رسوم الترقية (ج.م)" : "Upgrade fee (EGP)"}</span>
                  <input
                    type="number"
                    min={0}
                    value={tierEditForm.upgradeAmount}
                    onChange={(e) =>
                      setTierEditForm((prev) => ({ ...prev, upgradeAmount: e.target.value }))
                    }
                  />
                </label>
              ) : null}
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "الوصف المختصر (عربي)" : "Short summary (Arabic)"}</span>
                <input
                  value={tierEditForm.summaryAr}
                  onChange={(e) => setTierEditForm((prev) => ({ ...prev, summaryAr: e.target.value }))}
                />
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "الوصف المختصر (إنجليزي)" : "Short summary (English)"}</span>
                <input
                  value={tierEditForm.summaryEn}
                  onChange={(e) => setTierEditForm((prev) => ({ ...prev, summaryEn: e.target.value }))}
                />
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "المميزات (عربي — سطر لكل ميزة)" : "Features (Arabic — one per line)"}</span>
                <textarea
                  rows={5}
                  value={tierEditForm.featuresAr}
                  onChange={(e) =>
                    setTierEditForm((prev) => ({ ...prev, featuresAr: e.target.value }))
                  }
                />
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "المميزات (إنجليزي — سطر لكل ميزة)" : "Features (English — one per line)"}</span>
                <textarea
                  rows={5}
                  value={tierEditForm.featuresEn}
                  onChange={(e) =>
                    setTierEditForm((prev) => ({ ...prev, featuresEn: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="saasModalActions">
              <button type="button" className="printBtn" disabled={savingTierConfig} onClick={closeTierEditModal}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={savingTierConfig}
                onClick={() => void submitTierEdit()}
              >
                {savingTierConfig ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "حفظ الباقة" : "Save package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {roleModalOpen && selected && (
        <div className="modalOverlay">
          <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {roleForm.id || roleForm.kind === "builtin"
                    ? isArabic
                      ? "تعديل الدور"
                      : "Edit role"
                    : isArabic
                      ? "إضافة دور"
                      : "Add role"}
                </h2>
                <p>{selected.name}</p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={savingRole}
                onClick={closeRoleModal}
              >
                ×
              </button>
            </div>

            <div className="formGrid saasFormGrid">
              <label className="saasField">
                <span>{isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"}</span>
                <input
                  value={roleForm.nameAr}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                  placeholder={isArabic ? "مندوب مبيعات" : "Sales rep"}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"}</span>
                <input
                  value={roleForm.nameEn}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="Sales rep"
                  dir="ltr"
                />
              </label>
              {!roleForm.id && roleForm.kind === "custom" && (
                <label className="saasField saasFieldFull">
                  <span>{isArabic ? "قالب الصلاحيات" : "Permission template"}</span>
                  <select
                    value={roleForm.baseRole}
                    onChange={(e) =>
                      setRoleForm((prev) => ({
                        ...prev,
                        baseRole: e.target.value as UserRole,
                      }))
                    }
                  >
                    {CUSTOM_ROLE_TEMPLATE_OPTIONS.map((roleKey) => (
                      <option key={roleKey} value={roleKey}>
                        {getRoleLabel(roleKey, isArabic)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={savingRole}
                onClick={closeRoleModal}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={savingRole}
                onClick={() => void saveRoleForm()}
              >
                {savingRole
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "حفظ"
                    : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {branchModalMode && selected && (
        <div className="modalOverlay">
          <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {branchModalMode === "edit"
                    ? isArabic
                      ? "تعديل الفرع"
                      : "Edit Branch"
                    : isArabic
                      ? "إضافة فرع"
                      : "Add Branch"}
                </h2>
                <p>
                  {selected.name} —{" "}
                  {selectedBranchUsage
                    ? formatUsageLabel(
                        selectedBranchUsage.used,
                        selectedBranchUsage.max,
                        "فرع",
                        "branches",
                      )
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={creatingBranch}
                onClick={closeBranchModal}
              >
                ×
              </button>
            </div>

            <p className="loginHint">
              {branchModalMode === "edit"
                ? isArabic
                  ? "عدّل بيانات الفرع ثم احفظ."
                  : "Update branch details and save."
                : isArabic
                  ? "سيُنشأ فرع جديد ضمن نفس مجموعة الصيدلية ويظهر في قائمة الفروع فوراً."
                  : "A new branch will be created under the same organization and appear in the branch list immediately."}
            </p>

            <div className="formGrid saasFormGrid">
              <label className="saasField">
                <span>{isArabic ? "اسم الفرع" : "Branch name"}</span>
                <input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isArabic ? "فرع المعادي" : "Maadi Branch"}
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
                <input
                  value={branchForm.name_en}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, name_en: e.target.value }))}
                  placeholder="Maadi Branch"
                  dir="ltr"
                />
              </label>
              <label className="saasField">
                <span>{isArabic ? "الهاتف" : "Phone"}</span>
                <input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="01020304050"
                  dir="ltr"
                />
              </label>
              <label className="saasField saasFieldFull">
                <span>{isArabic ? "العنوان" : "Address"}</span>
                <input
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={isArabic ? "القاهرة" : "Cairo"}
                />
              </label>
            </div>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={creatingBranch}
                onClick={closeBranchModal}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={creatingBranch}
                onClick={() => void submitBranchForm()}
              >
                {creatingBranch
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : branchModalMode === "edit"
                    ? isArabic
                      ? "حفظ التعديلات"
                      : "Save changes"
                    : isArabic
                      ? "إضافة الفرع"
                      : "Add Branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modalOverlay">
          <div
            className="invoiceModal saasModal saasConfirmModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {deleteTarget.kind === "organization"
                    ? isArabic
                      ? "حذف الصيدلية؟"
                      : "Delete pharmacy?"
                    : isArabic
                      ? "حذف الفرع؟"
                      : "Delete branch?"}
                </h2>
                <p>
                  {deleteTarget.kind === "organization" ? (
                    <>
                      {deleteTarget.pharmacy.name} (<code dir="ltr">{deleteTarget.pharmacy.id}</code>
                      )
                    </>
                  ) : (
                    <>
                      {(isArabic ? deleteTarget.branch.name : deleteTarget.branch.name_en) ||
                        deleteTarget.branch.name}{" "}
                      (<code dir="ltr">{deleteTarget.branch.id}</code>)
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={deleteUpdating}
                onClick={() => setDeleteTarget(null)}
              >
                ×
              </button>
            </div>

            <p className="loginHint">
              {deleteTarget.kind === "organization"
                ? isArabic
                  ? deleteTarget.branchCount > 1
                    ? `سيتم حذف الصيدلية وجميع فروعها (${deleteTarget.branchCount}). تأكد أنها لا تحتوي بيانات مهمة (مستخدمين/أدوية/فواتير).`
                    : "سيتم حذف الصيدلية نهائياً. تأكد أنها لا تحتوي بيانات مهمة (مستخدمين/أدوية/فواتير)."
                  : deleteTarget.branchCount > 1
                    ? `This will permanently delete the pharmacy and all ${deleteTarget.branchCount} branches. Make sure there is no important data (users/medicines/invoices).`
                    : "This will permanently delete the pharmacy. Make sure there is no important data (users/medicines/invoices)."
                : isArabic
                  ? "سيتم حذف الفرع نهائياً. تأكد أنه لا يحتوي بيانات (أدوية/فواتير/مستخدمين)."
                  : "This will permanently delete the branch. Make sure it has no medicines, invoices, or users."}
            </p>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={deleteUpdating}
                onClick={() => setDeleteTarget(null)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="dangerBtn"
                disabled={deleteUpdating}
                onClick={() => void confirmDelete()}
              >
                {deleteUpdating
                  ? isArabic
                    ? "جاري الحذف..."
                    : "Deleting..."
                  : isArabic
                    ? "حذف"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusTarget && (
        <div className="modalOverlay">
          <div
            className="invoiceModal saasModal saasConfirmModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <h2>
                  {statusTarget.nextStatus === "suspended"
                    ? isArabic
                      ? "إيقاف الصيدلية؟"
                      : "Suspend pharmacy?"
                    : isArabic
                      ? "تفعيل الصيدلية؟"
                      : "Activate pharmacy?"}
                </h2>
                <p>
                  {statusTarget.pharmacy.name} (<code dir="ltr">{statusTarget.pharmacy.id}</code>)
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                disabled={statusUpdating}
                onClick={() => setStatusTarget(null)}
              >
                ×
              </button>
            </div>

            <p className="loginHint">
              {statusTarget.nextStatus === "suspended"
                ? isArabic
                  ? "المستخدمون لن يتمكنوا من الدخول حتى تعيد التفعيل."
                  : "Users will not be able to sign in until you reactivate."
                : isArabic
                  ? "سيتمكن مستخدمو الصيدلية من الدخول مرة أخرى."
                  : "Pharmacy users will be able to sign in again."}
            </p>

            <div className="modalActions saasModalActions">
              <button
                type="button"
                className="deleteSmallBtn"
                disabled={statusUpdating}
                onClick={() => setStatusTarget(null)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className={statusTarget.nextStatus === "suspended" ? "dangerBtn" : "completeBtn"}
                disabled={statusUpdating}
                onClick={() => void confirmStatusChange()}
              >
                {statusUpdating
                  ? isArabic
                    ? "جاري التحديث..."
                    : "Updating..."
                  : statusTarget.nextStatus === "suspended"
                    ? isArabic
                      ? "إيقاف"
                      : "Suspend"
                    : isArabic
                      ? "تفعيل"
                      : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
