import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  Employee,
  PharmacyLoginAccount,
  PharmacySettings,
  SystemUser,
} from "../../../types";
import { getBranchLabel } from "../../../utils/branchLabel";
import { resolveOrganizationId } from "../../../utils/branchLimits";
import {
  canShowCentralHrWithTier,
  canViewOrgHrWithTier,
  getTierUpgradeNotice,
  resolveOrganizationTier,
} from "../../../utils/subscriptionFeatures";
import { getOrganizationUserUsage } from "../../../utils/userLimits";
import { buildBranchHrSummaryRows } from "../../../utils/branchHrSummary";
import type { PharmacyGeneralManagerScope } from "../../../utils/pharmacyGeneralManager";
import {
  hasRole,
  isAccountant,
  isOrgPharmacyAdmin,
  isPharmacyManager,
  isSuperAdmin,
  canManageStaffRolePermissions,
  isStaffAssignableLoginAccount,
} from "../../../utils/roles";
import type { EmployeesUsersPageProps, TabId } from "../types";

export type StaffSharedContext = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  pharmacies: PharmacySettings[];
  tenantScopePharmacyId: string | null;
  currency: string;
  currentUid?: string;
  onActivityLog: EmployeesUsersPageProps["onActivityLog"];
  onOpenSubscriptionSettings?: EmployeesUsersPageProps["onOpenSubscriptionSettings"];
  isAccountantOnly: boolean;
  activeTab: TabId;
  setActiveTab: React.Dispatch<React.SetStateAction<TabId>>;
  busy: string;
  setBusy: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadError: string;
  setLoadError: React.Dispatch<React.SetStateAction<string>>;
  employeeBranchFilter: string;
  setEmployeeBranchFilter: React.Dispatch<React.SetStateAction<string>>;
  catalogBranchFilter: string;
  setCatalogBranchFilter: React.Dispatch<React.SetStateAction<string>>;
  loginAccountsPanelBranchFilter: string;
  setLoginAccountsPanelBranchFilter: React.Dispatch<React.SetStateAction<string>>;
  employeesAccessPanel: "login" | null;
  setEmployeesAccessPanel: React.Dispatch<React.SetStateAction<"login" | null>>;
  branchHrSummaryOpen: boolean;
  setBranchHrSummaryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canManage: boolean;
  canManageRolePermissions: boolean;
  canManageRolesOnEmployeesPage: boolean;
  isOrgManager: boolean;
  isTenantScopedView: boolean;
  branchDirectory: PharmacySettings[];
  orgTier: ReturnType<typeof resolveOrganizationTier>;
  orgUserUsage: ReturnType<typeof getOrganizationUserUsage> | null;
  showOrgHrManage: boolean;
  showOrgHr: boolean;
  showEmployeesBranchColumn: boolean;
  canFilterEmployeesByBranch: boolean;
  orgHrReadOnly: boolean;
  hrManagePharmacyId: string | undefined;
  canViewLoginAccountsTab: boolean;
  canManageLoginAccountsCatalog: boolean;
  canRequestLoginAccounts: boolean;
  canShowEmployeesAccessPanels: boolean;
  shouldLoadLoginCatalog: boolean;
  loadOrgEmployeeScope: boolean;
  centralHrUpgradeNotice: string;
  orgBranchIds: string[];
  isCatalogOwner: boolean;
  pharmacyName: string;
  branchLabel: (id: string) => string;
  tabs: { id: TabId; ar: string; en: string }[];
  isHrTab: boolean;
  hasRole: typeof hasRole;
};

export type StaffSharedDerived = {
  employeeById: Map<string, Employee>;
  pendingCatalogAccounts: PharmacyLoginAccount[];
  catalogByEmployeeId: Map<string, PharmacyLoginAccount>;
  loginCatalogByEmail: Map<string, PharmacyLoginAccount>;
  loginCatalogByPharmacy: Map<string, PharmacyLoginAccount[]>;
  generalManagerScope: PharmacyGeneralManagerScope;
  systemUserByEmail: Map<string, SystemUser>;
  branchHrSummaryRows: ReturnType<typeof buildBranchHrSummaryRows>;
  filteredEmployees: Employee[];
  employeesPanelPharmacyId: string;
};

export function useStaffSharedContext({
  isArabic,
  appUser,
  pharmacyId,
  pharmacies = [],
  tenantScopePharmacyId = null,
  currency,
  currentUid,
  onActivityLog,
  onOpenSubscriptionSettings,
  subscriptionBlocksWrite = false,
}: EmployeesUsersPageProps): StaffSharedContext {
  const isAccountantOnly = appUser?.role === "accountant";
  const [activeTab, setActiveTab] = useState<TabId>(isAccountantOnly ? "attendance" : "employees");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");
  const [employeeBranchFilter, setEmployeeBranchFilter] = useState("all");
  const [catalogBranchFilter, setCatalogBranchFilter] = useState("");
  const [loginAccountsPanelBranchFilter, setLoginAccountsPanelBranchFilter] = useState("all");
  const [employeesAccessPanel, setEmployeesAccessPanel] = useState<"login" | null>(null);
  const [branchHrSummaryOpen, setBranchHrSummaryOpen] = useState(false);

  const canManage =
    (isPharmacyManager(appUser) || isSuperAdmin(appUser)) && !subscriptionBlocksWrite;
  const canManageRolePermissions =
    canManageStaffRolePermissions(appUser) && !subscriptionBlocksWrite;
  const canManageRolesOnEmployeesPage =
    canManageRolePermissions && !isSuperAdmin(appUser);

  const isOrgManager = isOrgPharmacyAdmin(appUser);
  const isTenantScopedView = Boolean(tenantScopePharmacyId && isSuperAdmin(appUser));
  const branchDirectory = useMemo(() => {
    if (!isTenantScopedView || !tenantScopePharmacyId) return pharmacies;
    const anchor = pharmacies.find((branch) => branch.id === tenantScopePharmacyId);
    if (!anchor) return pharmacies;
    const organizationId = resolveOrganizationId(anchor);
    return pharmacies.filter((branch) => resolveOrganizationId(branch) === organizationId);
  }, [isTenantScopedView, tenantScopePharmacyId, pharmacies]);

  const orgTier = useMemo(
    () => resolveOrganizationTier(branchDirectory, pharmacyId),
    [branchDirectory, pharmacyId],
  );

  const showOrgHrManage = canShowCentralHrWithTier(appUser, orgTier, branchDirectory.length);
  const showOrgHr = canViewOrgHrWithTier(appUser, orgTier, branchDirectory.length);
  const showEmployeesBranchColumn = branchDirectory.length > 1;
  const canFilterEmployeesByBranch =
    showEmployeesBranchColumn &&
    (showOrgHr || isTenantScopedView || isOrgPharmacyAdmin(appUser));
  const orgHrReadOnly = showOrgHr && isAccountant(appUser) && !isOrgPharmacyAdmin(appUser);
  const hrManagePharmacyId = orgHrReadOnly ? appUser?.pharmacyId : undefined;
  const canViewLoginAccountsTab = isSuperAdmin(appUser) || isOrgPharmacyAdmin(appUser);
  const canManageLoginAccountsCatalog = isSuperAdmin(appUser);
  const canRequestLoginAccounts = isOrgPharmacyAdmin(appUser) && !canManageLoginAccountsCatalog;
  const canShowEmployeesAccessPanels = canViewLoginAccountsTab;
  const shouldLoadLoginCatalog =
    canViewLoginAccountsTab || isPharmacyManager(appUser);
  const loadOrgEmployeeScope =
    showOrgHr || shouldLoadLoginCatalog || (isOrgPharmacyAdmin(appUser) && showEmployeesBranchColumn);
  const centralHrUpgradeNotice = useMemo(
    () => getTierUpgradeNotice(appUser, orgTier, branchDirectory.length, "centralHr", isArabic),
    [appUser, orgTier, branchDirectory.length, isArabic],
  );
  const orgBranchIds = useMemo(() => branchDirectory.map((branch) => branch.id), [branchDirectory]);
  const isCatalogOwner = canManageLoginAccountsCatalog;

  const pharmacyName = useMemo(() => {
    const branch = branchDirectory.find((p) => p.id === pharmacyId);
    if (!branch) return pharmacyId || "main";
    return (isArabic ? branch.name : branch.name_en) || branch.name || pharmacyId;
  }, [branchDirectory, pharmacyId, isArabic]);

  const branchLabel = useCallback(
    (id: string) => getBranchLabel(id, branchDirectory, isArabic),
    [branchDirectory, isArabic],
  );

  const tabs: { id: TabId; ar: string; en: string }[] = useMemo(() => {
    const all: { id: TabId; ar: string; en: string }[] = [
      { id: "employees", ar: "الموظفين", en: "Employees" },
      { id: "attendance", ar: "الحضور والانصراف", en: "Attendance" },
      { id: "requests", ar: "طلبات الموظفين", en: "Employee requests" },
      { id: "payroll", ar: "حساب المرتبات", en: "Payroll" },
      { id: "permissions", ar: "الصلاحيات", en: "Permissions" },
      { id: "activity", ar: "سجل النشاط", en: "Activity Log" },
    ];
    if (isAccountantOnly) {
      return all.filter(
        (tab) =>
          tab.id === "attendance" ||
          tab.id === "requests" ||
          tab.id === "payroll" ||
          tab.id === "activity",
      );
    }
    return all;
  }, [isAccountantOnly]);

  const isHrTab = activeTab === "attendance" || activeTab === "payroll" || activeTab === "requests";

  useEffect(() => {
    if (!tenantScopePharmacyId || !isSuperAdmin(appUser)) return;
    setEmployeeBranchFilter(tenantScopePharmacyId);
    setCatalogBranchFilter(tenantScopePharmacyId);
    setActiveTab("employees");
  }, [tenantScopePharmacyId, appUser]);

  useEffect(() => {
    if (activeTab !== "employees") {
      setEmployeesAccessPanel(null);
    }
  }, [activeTab]);

  return {
    isArabic,
    appUser,
    pharmacyId,
    pharmacies,
    tenantScopePharmacyId,
    currency,
    currentUid,
    onActivityLog,
    onOpenSubscriptionSettings,
    isAccountantOnly,
    activeTab,
    setActiveTab,
    busy,
    setBusy,
    loading,
    setLoading,
    loadError,
    setLoadError,
    employeeBranchFilter,
    setEmployeeBranchFilter,
    catalogBranchFilter,
    setCatalogBranchFilter,
    loginAccountsPanelBranchFilter,
    setLoginAccountsPanelBranchFilter,
    employeesAccessPanel,
    setEmployeesAccessPanel,
    branchHrSummaryOpen,
    setBranchHrSummaryOpen,
    canManage,
    canManageRolePermissions,
    canManageRolesOnEmployeesPage,
    isOrgManager,
    isTenantScopedView,
    branchDirectory,
    orgTier,
    orgUserUsage: null,
    showOrgHrManage,
    showOrgHr,
    showEmployeesBranchColumn,
    canFilterEmployeesByBranch,
    orgHrReadOnly,
    hrManagePharmacyId,
    canViewLoginAccountsTab,
    canManageLoginAccountsCatalog,
    canRequestLoginAccounts,
    canShowEmployeesAccessPanels,
    shouldLoadLoginCatalog,
    loadOrgEmployeeScope,
    centralHrUpgradeNotice,
    orgBranchIds,
    isCatalogOwner,
    pharmacyName,
    branchLabel,
    tabs,
    isHrTab,
    hasRole,
  };
}

type StaffSharedDerivedParams = Pick<
  StaffSharedContext,
  | "isArabic"
  | "appUser"
  | "pharmacyId"
  | "tenantScopePharmacyId"
  | "showOrgHr"
  | "canFilterEmployeesByBranch"
  | "isTenantScopedView"
  | "orgBranchIds"
  | "employeeBranchFilter"
  | "loginAccountsPanelBranchFilter"
  | "branchDirectory"
  | "pharmacies"
> & {
  employees: Employee[];
  loginCatalog: PharmacyLoginAccount[];
  systemUsers: SystemUser[];
};

export function useStaffSharedDerived(
  ctx: StaffSharedDerivedParams,
): Omit<StaffSharedDerived, never> & { orgUserUsage: ReturnType<typeof getOrganizationUserUsage> | null } {
  const {
    isArabic,
    appUser,
    pharmacyId,
    tenantScopePharmacyId,
    showOrgHr,
    canFilterEmployeesByBranch,
    isTenantScopedView,
    orgBranchIds,
    employeeBranchFilter,
    loginAccountsPanelBranchFilter,
    branchDirectory,
    pharmacies,
    employees,
    loginCatalog,
    systemUsers,
  } = ctx;

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const pendingCatalogAccounts = useMemo(
    () =>
      loginCatalog.filter(
        (item) => item.status === "pending" || item.editPending || item.linkRequestPending,
      ),
    [loginCatalog],
  );

  const catalogByEmployeeId = useMemo(() => {
    const map = new Map<string, PharmacyLoginAccount>();
    loginCatalog.forEach((item) => {
      if (!item.employeeId || !isStaffAssignableLoginAccount(item)) return;
      const existing = map.get(item.employeeId);
      if (!existing || item.status === "approved") {
        map.set(item.employeeId, item);
      }
    });
    return map;
  }, [loginCatalog]);

  const loginCatalogByEmail = useMemo(() => {
    const map = new Map<string, PharmacyLoginAccount>();
    loginCatalog.forEach((account) => {
      if (account.email) map.set(account.email.trim().toLowerCase(), account);
    });
    return map;
  }, [loginCatalog]);

  const generalManagerScope = useMemo((): PharmacyGeneralManagerScope => {
    return {
      employees: employees.map((employee) => ({
        id: employee.id,
        pharmacyId: employee.pharmacyId,
        jobTitle: employee.jobTitle,
      })),
      loginAccounts: loginCatalog.map((account) => ({
        id: account.id,
        pharmacyId: account.pharmacyId,
        role: account.role,
        employeeId: account.employeeId,
        status: account.status,
        email: account.email,
      })),
    };
  }, [employees, loginCatalog]);

  const systemUserByEmail = useMemo(() => {
    const map = new Map<string, SystemUser>();
    systemUsers.forEach((user) => {
      if (user.email) map.set(user.email.trim().toLowerCase(), user);
    });
    return map;
  }, [systemUsers]);

  const loginCatalogByPharmacy = useMemo(() => {
    const map = new Map<string, PharmacyLoginAccount[]>();
    loginCatalog.forEach((account) => {
      const list = map.get(account.pharmacyId) || [];
      list.push(account);
      map.set(account.pharmacyId, list);
    });
    return map;
  }, [loginCatalog]);

  const orgUserUsage = useMemo(() => {
    const anchorPharmacy =
      branchDirectory.find((branch) => branch.id === pharmacyId) ||
      branchDirectory.find((branch) => branch.id === tenantScopePharmacyId || "") ||
      branchDirectory.find((branch) => branch.id === appUser?.pharmacyId) ||
      branchDirectory[0];
    if (!anchorPharmacy) return null;
    return getOrganizationUserUsage(systemUsers, branchDirectory, anchorPharmacy);
  }, [systemUsers, branchDirectory, pharmacyId, tenantScopePharmacyId, appUser?.pharmacyId]);

  const branchHrSummaryRows = useMemo(
    () =>
      showOrgHr ? buildBranchHrSummaryRows({ employees, branches: pharmacies, isArabic }) : [],
    [showOrgHr, employees, pharmacies, isArabic],
  );

  const filteredEmployees = useMemo(() => {
    if (isTenantScopedView) {
      if (employeeBranchFilter === "all") {
        return employees.filter((employee) => orgBranchIds.includes(employee.pharmacyId || ""));
      }
      return employees.filter((employee) => employee.pharmacyId === employeeBranchFilter);
    }
    if (!canFilterEmployeesByBranch || employeeBranchFilter === "all") return employees;
    return employees.filter((employee) => employee.pharmacyId === employeeBranchFilter);
  }, [
    employees,
    canFilterEmployeesByBranch,
    employeeBranchFilter,
    isTenantScopedView,
    orgBranchIds,
  ]);

  const employeesPanelPharmacyId = useMemo(() => {
    if (loginAccountsPanelBranchFilter !== "all") return loginAccountsPanelBranchFilter;
    if (employeeBranchFilter !== "all") return employeeBranchFilter;
    return pharmacyId || appUser?.pharmacyId || branchDirectory[0]?.id || "main";
  }, [
    loginAccountsPanelBranchFilter,
    employeeBranchFilter,
    pharmacyId,
    appUser?.pharmacyId,
    branchDirectory,
  ]);

  return {
    employeeById,
    pendingCatalogAccounts,
    catalogByEmployeeId,
    loginCatalogByEmail,
    loginCatalogByPharmacy,
    generalManagerScope,
    systemUserByEmail,
    orgUserUsage,
    branchHrSummaryRows,
    filteredEmployees,
    employeesPanelPharmacyId,
  };
}
