import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActivityLog,
  AppUser,
  Employee,
  Page,
  PharmacyCustomRole,
  PharmacyRoleConfig,
  PharmacyLoginAccount,
  PharmacySettings,
  SystemUser,
  UserRole,
} from "../types";
import * as pharmacyService from "../services/pharmacyService";
import type { HrTab } from "./HrPage";
import TierUpgradeNotice from "../components/TierUpgradeNotice";
import { EmployeePhotoThumb, readEmployeePhotoFile } from "../components/staff/EmployeePhotoThumb";
import {
  LazyEmployeeAttendanceBadgeModal,
  LazyHrPage,
  LazyWorkScheduleEditor,
} from "./staff/lazyStaffModules";
import { formatLoginAccountSyncError } from "../utils/staffLoginAccountErrors";
import { pickCatalogAccountForRole, suggestLoginAccountDraft } from "../utils/staffCatalog";
import {
  CUSTOM_ROLE_PAGE_OPTIONS,
  CUSTOM_ROLE_TEMPLATE_OPTIONS,
  defaultPagesForCustomRoleTemplate,
} from "../utils/customRolePages";
import RolePermissionsEditorModal, {
  buildDefaultRoleAccess,
  normalizeEditorAccess,
  type RolePermissionsEditorTarget,
} from "../components/staff/RolePermissionsEditorModal";
import {
  EDITABLE_BUILTIN_ROLES,
  roleAccessSummaryTitle,
  summarizeRoleAccess,
  type RolePermissionFlags,
} from "../utils/rolePermissions";
import { getEffectiveRoleAccess } from "../utils/roleAccess";
import {
  canManageOrgLoginAccountsWithTier,
  canShowCentralHrWithTier,
  canViewOrgHrWithTier,
  getTierUpgradeNotice,
  resolveOrganizationTier,
} from "../utils/subscriptionFeatures";
import {
  getRoleLabel,
  hasRole,
  isSuperAdmin,
  isPharmacyManager,
  isOrgPharmacyAdmin,
  isAccountant,
  loginAccountRoleOptionsFor,
  parseLoginAccountRole,
  getDefaultLoginAccountDraft,
  STAFF_ACTIVITY_TYPES,
} from "../utils/roles";
import { getBranchLabel } from "../utils/branchLabel";
import { buildBranchHrSummaryRows } from "../utils/branchHrSummary";
import { buildBranchLoginSummaryRows } from "../utils/branchLoginSummary";
import {
  computeWorkHoursFromSchedule,
  getShiftDisplayName,
  parseWorkBreaks,
  resolveWorkSchedule,
  DEFAULT_PHARMACY_SHIFTS,
  clonePharmacyShifts,
  type ShiftId,
} from "../utils/workSchedule";

type TabId = "employees" | "accounts" | "permissions" | "activity" | HrTab;

type ActivityInput = {
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
};

type EmployeesUsersPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  pharmacies: PharmacySettings[];
  currency: string;
  currentUid?: string;
  onActivityLog: (data: ActivityInput) => Promise<void>;
  onOpenSubscriptionSettings?: () => void;
};

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString(isArabic ? "ar-EG" : "en-GB");
}

function formatDateTime(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

/** Login username matches employee display name exactly. */
function usernameFromEmployeeName(name: string) {
  return name.trim();
}

const emptyEmployeeForm = {
  pharmacyId: "",
  employeeCode: "",
  photoBase64: "",
  name: "",
  phone: "",
  salary: 0,
  commissionRate: 0,
  requiredWorkHours: 8,
  assignedShiftId: "A" as ShiftId,
  useCustomWorkSchedule: false,
  workDayStart: DEFAULT_PHARMACY_SHIFTS[0].dayStart,
  workDayEnd: DEFAULT_PHARMACY_SHIFTS[0].dayEnd,
  workBreaks: [] as (typeof DEFAULT_PHARMACY_SHIFTS)[0]["breaks"],
  hireDate: "",
  notes: "",
  isActive: true,
};

export default function EmployeesUsersPage({
  isArabic,
  appUser,
  pharmacyId,
  pharmacies,
  currency,
  currentUid,
  onActivityLog,
  onOpenSubscriptionSettings,
}: EmployeesUsersPageProps) {
  const isAccountantOnly = appUser?.role === "accountant";
  const [activeTab, setActiveTab] = useState<TabId>(isAccountantOnly ? "attendance" : "employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginCatalog, setLoginCatalog] = useState<PharmacyLoginAccount[]>([]);
  const [customRoles, setCustomRoles] = useState<PharmacyCustomRole[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<PharmacyRoleConfig[]>([]);
  const [permissionEditorTarget, setPermissionEditorTarget] =
    useState<RolePermissionsEditorTarget | null>(null);
  const [permissionEditorPages, setPermissionEditorPages] = useState<Page[]>([]);
  const [permissionEditorPermissions, setPermissionEditorPermissions] =
    useState<RolePermissionFlags>({});
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");

  const [employeeModal, setEmployeeModal] = useState<"add" | "edit" | null>(null);
  const [attendanceBadgeEmployee, setAttendanceBadgeEmployee] = useState<Employee | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [pharmacyShifts, setPharmacyShifts] = useState(
    clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS),
  );
  const [pharmacyDefaultShiftId, setPharmacyDefaultShiftId] = useState<ShiftId>("A");

  const [accountModal, setAccountModal] = useState<"add" | "edit" | null>(null);
  const [editCatalogId, setEditCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState(() => ({
    role: "cashier" as UserRole,
    email: "",
    password: "",
  }));
  const [customRoleModal, setCustomRoleModal] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState(() => ({
    nameAr: "",
    nameEn: "",
    baseRole: "cashier" as UserRole,
    allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
  }));

  const catalogRoleOptions = loginAccountRoleOptionsFor(appUser);
  const customRoleTemplateOptions = useMemo(
    () =>
      isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)
        ? CUSTOM_ROLE_TEMPLATE_OPTIONS
        : CUSTOM_ROLE_TEMPLATE_OPTIONS.filter((role) => role !== "pharmacy_admin"),
    [appUser],
  );
  const canManage = isPharmacyManager(appUser) || isSuperAdmin(appUser);

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

  const isOrgManager = isOrgPharmacyAdmin(appUser);
  const orgTier = useMemo(
    () => resolveOrganizationTier(pharmacies, appUser?.pharmacyId),
    [pharmacies, appUser?.pharmacyId],
  );
  const showOrgHrManage = canShowCentralHrWithTier(appUser, orgTier, pharmacies.length);
  const showOrgHr = canViewOrgHrWithTier(appUser, orgTier, pharmacies.length);
  const orgHrReadOnly = showOrgHr && isAccountant(appUser) && !isOrgPharmacyAdmin(appUser);
  const hrManagePharmacyId = orgHrReadOnly ? appUser?.pharmacyId : undefined;
  const showOrgLoginAccounts = canManageOrgLoginAccountsWithTier(
    appUser,
    orgTier,
    pharmacies.length,
  );
  const centralHrUpgradeNotice = useMemo(
    () => getTierUpgradeNotice(appUser, orgTier, pharmacies.length, "centralHr", isArabic),
    [appUser, orgTier, pharmacies.length, isArabic],
  );
  const loginAccountsUpgradeNotice = useMemo(
    () => getTierUpgradeNotice(appUser, orgTier, pharmacies.length, "branchesPage", isArabic),
    [appUser, orgTier, pharmacies.length, isArabic],
  );
  const orgBranchIds = useMemo(() => pharmacies.map((branch) => branch.id), [pharmacies]);
  const [employeeBranchFilter, setEmployeeBranchFilter] = useState("all");
  const [catalogBranchFilter, setCatalogBranchFilter] = useState("");
  const isCatalogOwner = isSuperAdmin(appUser);

  const catalogTargetPharmacyId = useMemo(() => {
    const fallback = pharmacyId || appUser?.pharmacyId || pharmacies[0]?.id || "main";
    if (!showOrgLoginAccounts) return fallback;
    return catalogBranchFilter || fallback;
  }, [showOrgLoginAccounts, catalogBranchFilter, pharmacyId, appUser?.pharmacyId, pharmacies]);

  const branchLoginCatalog = useMemo(() => {
    if (!showOrgLoginAccounts) return loginCatalog;
    return loginCatalog.filter((item) => item.pharmacyId === catalogTargetPharmacyId);
  }, [loginCatalog, showOrgLoginAccounts, catalogTargetPharmacyId]);

  const catalogByEmployeeId = useMemo(() => {
    const map = new Map<string, PharmacyLoginAccount>();
    branchLoginCatalog.forEach((item) => {
      if (!item.employeeId) return;
      const existing = map.get(item.employeeId);
      if (!existing || item.status === "approved") {
        map.set(item.employeeId, item);
      }
    });
    return map;
  }, [branchLoginCatalog]);

  const branchCustomRoles = useMemo(
    () => customRoles.filter((role) => role.pharmacyId === catalogTargetPharmacyId),
    [customRoles, catalogTargetPharmacyId],
  );

  const loginAccountRoleSelectOptions = useMemo(
    () => [...catalogRoleOptions, ...branchCustomRoles.map((role) => role.roleKey)],
    [catalogRoleOptions, branchCustomRoles],
  );

  const sortedBranchLoginAccounts = useMemo(
    () =>
      [...branchLoginCatalog].sort((a, b) => {
        const byRole = getRoleLabel(a.role, isArabic).localeCompare(
          getRoleLabel(b.role, isArabic),
          isArabic ? "ar" : "en",
        );
        if (byRole !== 0) return byRole;
        return a.email.localeCompare(b.email);
      }),
    [branchLoginCatalog, isArabic],
  );

  const branchLoginSummaryRows = useMemo(
    () =>
      showOrgLoginAccounts
        ? buildBranchLoginSummaryRows({
            accounts: loginCatalog,
            branches: pharmacies,
            isArabic,
          })
        : [],
    [showOrgLoginAccounts, loginCatalog, pharmacies, isArabic],
  );

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

  function employeeLoginAccountOptionsFor(pharmacyId: string, employeeId: string) {
    const accounts = loginCatalogByPharmacy.get(pharmacyId) || [];
    return accounts
      .filter(
        (account) =>
          account.status === "approved" &&
          (!account.employeeId || account.employeeId === employeeId),
      )
      .sort((a, b) => {
        const byRole = getRoleLabel(a.role, isArabic).localeCompare(
          getRoleLabel(b.role, isArabic),
          isArabic ? "ar" : "en",
        );
        if (byRole !== 0) return byRole;
        return a.email.localeCompare(b.email);
      });
  }

  function getEmployeeAssignedAccountId(employee: Employee): string {
    return catalogByEmployeeId.get(employee.id)?.id || "";
  }

  function isAccountCustomRole(roleKey: string) {
    return branchCustomRoles.some((role) => role.roleKey === roleKey);
  }

  const pharmacyName = useMemo(() => {
    const branch = pharmacies.find((p) => p.id === pharmacyId);
    if (!branch) return pharmacyId || "main";
    return (isArabic ? branch.name : branch.name_en) || branch.name || pharmacyId;
  }, [pharmacies, pharmacyId, isArabic]);

  const branchLabel = useCallback(
    (id: string) => getBranchLabel(id, pharmacies, isArabic),
    [pharmacies, isArabic],
  );

  const branchHrSummaryRows = useMemo(
    () =>
      showOrgHr ? buildBranchHrSummaryRows({ employees, branches: pharmacies, isArabic }) : [],
    [showOrgHr, employees, pharmacies, isArabic],
  );

  const filteredEmployees = useMemo(() => {
    if (!showOrgHr || employeeBranchFilter === "all") return employees;
    return employees.filter((employee) => employee.pharmacyId === employeeBranchFilter);
  }, [employees, showOrgHr, employeeBranchFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
      const loadOrgScope = showOrgHr || showOrgLoginAccounts;
      const [empRows, logs, catalog, users, roleRows, configRows] = await Promise.all([
        loadOrgScope
          ? pharmacyService.getEmployeesForPharmacies(orgBranchIds)
          : pharmacyService.getEmployees(),
        pharmacyService.getActivityLogs(),
        showOrgLoginAccounts
          ? pharmacyService.getPharmacyLoginAccountsForPharmacies(orgBranchIds)
          : pharmacyService.getPharmacyLoginAccounts(targetPharmacyId),
        loadOrgScope
          ? pharmacyService.getSystemUsersForPharmacies(orgBranchIds)
          : pharmacyService.getSystemUsers(targetPharmacyId),
        loadOrgScope
          ? pharmacyService.getPharmacyCustomRolesForPharmacies(orgBranchIds)
          : pharmacyService.getPharmacyCustomRoles(targetPharmacyId),
        loadOrgScope
          ? pharmacyService.getPharmacyRoleConfigsForPharmacies(orgBranchIds)
          : pharmacyService.getPharmacyRoleConfigs(targetPharmacyId),
      ]);
      setEmployees(empRows);
      setActivityLogs(logs);
      setLoginCatalog(catalog);
      setSystemUsers(users);
      setCustomRoles(roleRows);
      setRoleConfigs(configRows);
      pharmacyService.setPharmacyCustomRoles(roleRows);
      pharmacyService.setPharmacyRoleConfigs(configRows);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "load_failed");
      setEmployees([]);
      setLoginCatalog([]);
      setSystemUsers([]);
      setCustomRoles([]);
      setRoleConfigs([]);
      pharmacyService.setPharmacyCustomRoles([]);
      pharmacyService.setPharmacyRoleConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [appUser, pharmacyId, showOrgHr, showOrgLoginAccounts, orgBranchIds]);

  useEffect(() => {
    if (!showOrgLoginAccounts) return;
    const fallback = pharmacyId || appUser?.pharmacyId || pharmacies[0]?.id || "";
    if (!fallback) return;
    setCatalogBranchFilter((current) => current || fallback);
  }, [showOrgLoginAccounts, pharmacyId, appUser?.pharmacyId, pharmacies]);

  async function approveCatalogAccount(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic
        ? `اعتماد حساب ${account.email}؟\n\nتأكد من إنشاء الحساب في Supabase Auth بنفس الإيميل.`
        : `Approve account ${account.email}?\n\nEnsure the Auth user exists with the same email.`,
    );
    if (!confirmed) return;

    setBusy(`approve-account-${account.id}`);
    try {
      await pharmacyService.superAdminApprovePharmacyLoginAccountCatalog(
        account.id,
        appUser?.uid,
        appUser?.name,
      );
      await loadAll();
      alert(isArabic ? "تم اعتماد الحساب" : "Account approved");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر اعتماد الحساب"
            : "Could not approve account",
      );
    } finally {
      setBusy("");
    }
  }

  async function approveCatalogEdit(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic ? `اعتماد تعديل حساب ${account.email}؟` : `Approve changes to ${account.email}?`,
    );
    if (!confirmed) return;

    setBusy(`approve-edit-${account.id}`);
    try {
      await pharmacyService.approvePharmacyLoginAccountEdit(
        account.id,
        appUser?.uid,
        appUser?.name,
      );
      await loadAll();
      alert(isArabic ? "تم اعتماد التعديل" : "Changes approved");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر اعتماد التعديل"
            : "Could not approve changes",
      );
    } finally {
      setBusy("");
    }
  }

  async function approveCatalogLink(account: PharmacyLoginAccount) {
    const confirmed = window.confirm(
      isArabic
        ? `ربط حساب ${account.email} بالنظام؟\n\nتأكد من وجود الحساب في Supabase Auth.`
        : `Link account ${account.email} to the system?\n\nEnsure the Auth user exists in Supabase.`,
    );
    if (!confirmed) return;

    setBusy(`link-approve-${account.id}`);
    try {
      if (account.linkRequestPending) {
        await pharmacyService.approvePharmacyLoginAccountLink(
          account.id,
          appUser?.uid,
          appUser?.name,
        );
      } else {
        const employee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
        await pharmacyService.syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      }
      await loadAll();
      alert(isArabic ? "تم ربط الحساب" : "Account linked");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر ربط الحساب"
            : "Could not link account",
      );
    } finally {
      setBusy("");
    }
  }

  async function unlinkCatalogAccount(account: PharmacyLoginAccount, linkedUser: SystemUser) {
    if (linkedUser.uid === currentUid || linkedUser.uid === appUser?.uid) {
      alert(isArabic ? "لا يمكنك فصل حسابك الحالي" : "You cannot unlink your own account");
      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? `فصل ربط ${account.email}؟\n\nسيتم طرد المستخدم فوراً إن كان متصلاً بالتطبيق.`
        : `Unlink ${account.email}?\n\nThe user will be signed out immediately if online.`,
    );
    if (!confirmed) return;

    setBusy(`unlink-${account.id}`);
    try {
      await pharmacyService.unlinkLoginAccountFromSystem(linkedUser.uid, account.id, appUser?.uid);
      await onActivityLog({
        type: "user_update",
        title: isArabic ? "فصل ربط حساب" : "Account unlinked",
        description: isArabic ? `تم فصل ${account.email}` : `Unlinked ${account.email}`,
        referenceType: "user",
        referenceId: linkedUser.uid,
      });
      await loadAll();
      alert(isArabic ? "تم فصل الربط" : "Account unlinked");
    } catch (err) {
      alert(
        err instanceof Error
          ? formatLoginAccountSyncError(err.message, isArabic)
          : isArabic
            ? "تعذر فصل الربط"
            : "Could not unlink account",
      );
    } finally {
      setBusy("");
    }
  }

  async function syncSavedCatalogAccount(
    targetPharmacyId: string,
    role: UserRole,
    accountId?: string | null,
  ) {
    const refreshed = await pharmacyService.getPharmacyLoginAccounts(targetPharmacyId);
    const saved =
      (accountId ? refreshed.find((item) => item.id === accountId) : undefined) ||
      pickCatalogAccountForRole(refreshed, role);
    if (!saved || saved.status !== "approved") return;

    const employee = saved.employeeId ? employeeById.get(saved.employeeId) : undefined;
    await pharmacyService.syncPharmacyLoginAccountToUser(saved, { name: employee?.name });
  }

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!pharmacyId) return;
    void pharmacyService.loadPayrollSettings(pharmacyId).then((settings) => {
      setPharmacyShifts(clonePharmacyShifts(settings.workShifts));
      setPharmacyDefaultShiftId(settings.defaultShiftId);
    });
  }, [pharmacyId]);

  const staffActivity = useMemo(
    () =>
      activityLogs.filter(
        (log) =>
          STAFF_ACTIVITY_TYPES.includes(log.type) ||
          log.referenceType === "employee" ||
          log.referenceType === "user",
      ),
    [activityLogs],
  );

  function openAddEmployee() {
    setEditEmployeeId(null);
    const defaultShift =
      pharmacyShifts.find((item) => item.id === pharmacyDefaultShiftId) || pharmacyShifts[0];
    setEmployeeForm({
      ...emptyEmployeeForm,
      pharmacyId: pharmacyId || appUser?.pharmacyId || "main",
      hireDate: new Date().toISOString().slice(0, 10),
      assignedShiftId: pharmacyDefaultShiftId,
      workDayStart: defaultShift.dayStart,
      workDayEnd: defaultShift.dayEnd,
      workBreaks: defaultShift.breaks.map((item) => ({ ...item })),
    });
    setEmployeeModal("add");
    void pharmacyService.suggestNextEmployeeCode(pharmacyId || appUser?.pharmacyId).then((code) => {
      setEmployeeForm((prev) => ({ ...prev, employeeCode: code }));
    });
  }

  function openEditEmployee(employee: Employee) {
    setEditEmployeeId(employee.id);
    setEmployeeForm({
      pharmacyId: employee.pharmacyId,
      employeeCode: employee.employeeCode || "",
      photoBase64: employee.photoBase64 || "",
      name: employee.name,
      phone: employee.phone || "",
      salary: employee.salary,
      commissionRate: employee.commissionRate,
      requiredWorkHours: employee.requiredWorkHours ?? 8,
      assignedShiftId: (employee.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
      useCustomWorkSchedule: Boolean(employee.useCustomWorkSchedule),
      workDayStart: employee.workDayStart || pharmacyShifts[0].dayStart,
      workDayEnd: employee.workDayEnd || pharmacyShifts[0].dayEnd,
      workBreaks: parseWorkBreaks(employee.workBreaks),
      hireDate: employee.hireDate || "",
      notes: employee.notes || "",
      isActive: employee.isActive,
    });
    setEmployeeModal("edit");
  }

  function updateEmployeeWorkSchedule(schedule: WorkSchedule) {
    const requiredWorkHours = computeWorkHoursFromSchedule(schedule);
    setEmployeeForm((prev) => ({
      ...prev,
      workDayStart: schedule.dayStart,
      workDayEnd: schedule.dayEnd,
      workBreaks: schedule.breaks,
      requiredWorkHours,
    }));
  }

  async function saveEmployee() {
    if (!employeeForm.name.trim()) {
      alert(isArabic ? "أدخل اسم الموظف" : "Enter employee name");
      return;
    }

    setBusy("save-employee");
    try {
      const targetPharmacyId =
        (showOrgHrManage && employeeForm.pharmacyId) || pharmacyId || appUser?.pharmacyId || "main";
      const customSchedule = employeeForm.useCustomWorkSchedule
        ? {
            dayStart: employeeForm.workDayStart,
            dayEnd: employeeForm.workDayEnd,
            breaks: employeeForm.workBreaks,
          }
        : resolveWorkSchedule(
            {
              assignedShiftId: employeeForm.assignedShiftId,
              useCustomWorkSchedule: false,
            },
            pharmacyShifts,
            pharmacyDefaultShiftId,
          );
      const requiredWorkHours = computeWorkHoursFromSchedule(customSchedule);

      const payload = {
        pharmacyId: targetPharmacyId,
        employeeCode: employeeForm.employeeCode.trim() || undefined,
        photoBase64: employeeForm.photoBase64 || undefined,
        name: employeeForm.name.trim(),
        phone: employeeForm.phone.trim() || undefined,
        salary: Number(employeeForm.salary) || 0,
        commissionRate: Number(employeeForm.commissionRate) || 0,
        requiredWorkHours,
        assignedShiftId: employeeForm.assignedShiftId,
        useCustomWorkSchedule: employeeForm.useCustomWorkSchedule,
        workDayStart: employeeForm.useCustomWorkSchedule
          ? employeeForm.workDayStart
          : (null as unknown as undefined),
        workDayEnd: employeeForm.useCustomWorkSchedule
          ? employeeForm.workDayEnd
          : (null as unknown as undefined),
        workBreaks: employeeForm.useCustomWorkSchedule
          ? employeeForm.workBreaks
          : (null as unknown as undefined),
        hireDate: employeeForm.hireDate || undefined,
        notes: employeeForm.notes.trim() || undefined,
        isActive: employeeForm.isActive,
      };

      let savedEmployee: Employee;

      if (employeeModal === "edit" && editEmployeeId) {
        await pharmacyService.updateEmployee(editEmployeeId, payload);
        savedEmployee = { ...employeeById.get(editEmployeeId)!, ...payload, id: editEmployeeId };
        await onActivityLog({
          type: "employee_update",
          title: isArabic ? "تعديل موظف" : "Employee Updated",
          description: isArabic
            ? `تم تعديل بيانات الموظف ${payload.name}`
            : `Employee ${payload.name} was updated`,
          referenceType: "employee",
          referenceId: editEmployeeId,
        });
      } else {
        savedEmployee = await pharmacyService.createEmployee(payload);
        await onActivityLog({
          type: "employee_create",
          title: isArabic ? "إضافة موظف" : "Employee Added",
          description: isArabic
            ? `تم إضافة الموظف ${payload.name}`
            : `Employee ${payload.name} was added`,
          referenceType: "employee",
          referenceId: savedEmployee.id,
        });
      }

      setEmployeeModal(null);
      await loadAll();
      alert(isArabic ? "تم الحفظ" : "Saved");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setBusy("");
    }
  }

  async function deleteEmployeeRecord(employee: Employee) {
    const linkedAccount = catalogByEmployeeId.get(employee.id);
    const linkedUser = systemUsers.find((user) => user.employeeId === employee.id);
    let confirmMessage = isArabic
      ? `حذف الموظف «${employee.name}» نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Permanently delete employee "${employee.name}"? This cannot be undone.`;
    if (linkedAccount) {
      confirmMessage += isArabic
        ? `\n\nسيتم فك ربط حساب الدخول ${linkedAccount.email}.`
        : `\n\nLogin account ${linkedAccount.email} will be unlinked.`;
    }
    if (linkedUser) {
      confirmMessage += isArabic
        ? `\nسيتم فك ربط المستخدم ${linkedUser.email || linkedUser.name}.`
        : `\nUser ${linkedUser.email || linkedUser.name} will be unlinked.`;
    }
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBusy(`del-emp-${employee.id}`);
    try {
      await pharmacyService.deleteEmployee(employee.id);
      await onActivityLog({
        type: "employee_delete",
        title: isArabic ? "حذف موظف" : "Employee Deleted",
        description: employee.name,
        referenceType: "employee",
        referenceId: employee.id,
      });
      if (editEmployeeId === employee.id) {
        setEmployeeModal(null);
        setEditEmployeeId(null);
      }
      if (attendanceBadgeEmployee?.id === employee.id) {
        setAttendanceBadgeEmployee(null);
      }
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحذف" : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  async function toggleEmployeeActive(employee: Employee) {
    setBusy(`emp-${employee.id}`);
    try {
      const next = !employee.isActive;
      await pharmacyService.setEmployeeActive(employee.id, next);
      await onActivityLog({
        type: next ? "employee_activate" : "employee_deactivate",
        title: next
          ? isArabic
            ? "تفعيل موظف"
            : "Employee Activated"
          : isArabic
            ? "تعطيل موظف"
            : "Employee Deactivated",
        description: `${employee.name}`,
        referenceType: "employee",
        referenceId: employee.id,
      });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  function openCustomRoleModal() {
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
      const created = await pharmacyService.createPharmacyCustomRole({
        pharmacyId: catalogTargetPharmacyId,
        nameAr: customRoleForm.nameAr,
        nameEn: customRoleForm.nameEn,
        baseRole: customRoleForm.baseRole,
        allowedPages: customRoleForm.allowedPages,
      });
      setCustomRoleModal(false);
      await loadAll();
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

  const permissionsBranchCustomRoles = useMemo(
    () => customRoles.filter((role) => role.pharmacyId === catalogTargetPharmacyId),
    [customRoles, catalogTargetPharmacyId],
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

  async function resetRolePermissionsToDefaults(
    target: RolePermissionsEditorTarget,
  ) {
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
            ? "لا يمكن حذف الدور — يوجد حساب أو مستخدم يستخدمه"
            : "Cannot delete — an account or user uses this role"
          : msg || (isArabic ? "تعذر حذف الدور" : "Could not delete role"),
      );
    } finally {
      setBusy("");
    }
  }

  function openCatalogAccountAdd(preferredRole?: string) {
    const role = preferredRole ?? loginAccountRoleSelectOptions[0] ?? "cashier";
    const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
    setEditCatalogId(null);
    setCatalogForm({
      role,
      email: defaults.email,
      password: defaults.password,
    });
    setAccountModal("add");
  }

  function openCatalogAccountEdit(account: PharmacyLoginAccount) {
    const defaults = getDefaultLoginAccountDraft(account.role);
    setEditCatalogId(account.id);
    setCatalogForm({
      role: parseLoginAccountRole(account.role),
      email: account.email,
      password: account.password || defaults.password,
    });
    setAccountModal("edit");
  }

  function openCatalogAccountDuplicate(account: PharmacyLoginAccount) {
    const role = parseLoginAccountRole(account.role);
    const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
    setEditCatalogId(null);
    setCatalogForm({
      role,
      email: defaults.email,
      password: defaults.password,
    });
    setAccountModal("add");
  }

  function onCatalogFormRoleChange(nextRole: UserRole) {
    const role = parseLoginAccountRole(nextRole);
    if (accountModal === "add") {
      const defaults = suggestLoginAccountDraft(branchLoginCatalog, role);
      setCatalogForm({
        role,
        email: defaults.email,
        password: defaults.password,
      });
      return;
    }
    setCatalogForm((prev) => ({ ...prev, role }));
  }

  async function saveCatalogAccount() {
    const email = catalogForm.email.trim().toLowerCase();
    const password = catalogForm.password;
    const role = parseLoginAccountRole(catalogForm.role);
    if (!email || !password) {
      alert(isArabic ? "أكمل الإيميل وكلمة المرور" : "Fill email and password");
      return;
    }
    if (password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setBusy("save-catalog");
    try {
      const targetPharmacyId = catalogTargetPharmacyId;
      const autoApprove = isSuperAdmin(appUser);
      let savedAccountId = editCatalogId || null;

      if (accountModal === "edit" && editCatalogId) {
        const editing = branchLoginCatalog.find((item) => item.id === editCatalogId);
        if (!autoApprove && editing?.status === "approved") {
          await pharmacyService.submitPharmacyLoginAccountEditRequest(
            editCatalogId,
            { email, password, role },
            appUser?.uid,
            appUser?.name,
          );
        } else {
          await pharmacyService.updatePharmacyLoginAccount(editCatalogId, {
            email,
            password,
            role,
            ...(autoApprove || editing?.status === "approved" ? {} : { status: "pending" }),
          });
        }
        savedAccountId = editCatalogId;
      } else if (accountModal === "add") {
        const duplicateEmail = branchLoginCatalog.some(
          (item) => item.email.trim().toLowerCase() === email,
        );
        if (duplicateEmail) {
          alert(
            isArabic
              ? "هذا الإيميل مستخدم بالفعل في هذا الفرع."
              : "This email is already used for this branch.",
          );
          return;
        }
        const created = await pharmacyService.createPharmacyLoginAccount({
          pharmacyId: targetPharmacyId,
          email,
          password,
          role,
          ...(autoApprove ? { status: "approved" } : { status: "pending" }),
          requestedBy: appUser?.uid,
          requestedByName: appUser?.name,
        });
        savedAccountId = created.id;
      }

      if (autoApprove) {
        try {
          await syncSavedCatalogAccount(targetPharmacyId, role, savedAccountId);
        } catch (syncErr) {
          const syncMessage =
            syncErr instanceof Error
              ? formatLoginAccountSyncError(syncErr.message, isArabic)
              : isArabic
                ? "تعذر ربط المستخدم"
                : "Could not link user";
          alert(
            isArabic
              ? `تم حفظ الحساب لكن الربط فشل:\n${syncMessage}`
              : `Account saved but linking failed:\n${syncMessage}`,
          );
        }
      }

      setAccountModal(null);
      await loadAll();
      alert(
        autoApprove
          ? isArabic
            ? "تم الحفظ"
            : "Saved"
          : accountModal === "edit"
            ? isArabic
              ? "تم إرسال التعديل للاعتماد"
              : "Changes sent for approval"
            : isArabic
              ? "تم إرسال الحساب للاعتماد"
              : "Account sent for approval",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setBusy("");
    }
  }

  async function deleteCatalogAccount(account: PharmacyLoginAccount) {
    const linkedEmployee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
    const confirmMessage = linkedEmployee
      ? isArabic
        ? `حذف حساب ${account.email}؟ سيتم فك ربطه بالموظف ${linkedEmployee.name}.`
        : `Delete account ${account.email}? It will be unlinked from ${linkedEmployee.name}.`
      : isArabic
        ? `حذف حساب ${account.email}؟`
        : `Delete account ${account.email}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setBusy(`del-${account.id}`);
    try {
      await pharmacyService.deletePharmacyLoginAccount(account.id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر الحذف" : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  async function assignEmployeeLoginAccount(employee: Employee, accountId: string) {
    const targetPharmacyId = employee.pharmacyId;
    const currentAccountId = getEmployeeAssignedAccountId(employee);

    if (!accountId) {
      const linked = catalogByEmployeeId.get(employee.id);
      if (!linked) return;
      setBusy(`assign-emp-${employee.id}`);
      try {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(
          linked.id,
          null,
          targetPharmacyId,
        );
        await pharmacyService.updateEmployee(employee.id, { jobTitle: "" });
        await loadAll();
      } catch (err) {
        alert(err instanceof Error ? err.message : isArabic ? "تعذر فك الربط" : "Unlink failed");
      } finally {
        setBusy("");
      }
      return;
    }

    if (accountId === currentAccountId) return;

    const accounts = loginCatalogByPharmacy.get(targetPharmacyId) || [];
    const acc = accounts.find((item) => item.id === accountId);
    if (!acc) {
      alert(isArabic ? "الحساب غير موجود" : "Account not found");
      return;
    }
    if (acc.status !== "approved") {
      alert(
        isArabic
          ? "اعتمد حساب الدخول أولاً من تبويب حسابات الدخول."
          : "Approve this login account first under Login Accounts.",
      );
      return;
    }
    if (acc.employeeId && acc.employeeId !== employee.id) {
      const other = employeeById.get(acc.employeeId);
      alert(
        isArabic
          ? `هذا الحساب مربوط بالفعل بالموظف «${other?.name || "آخر"}».`
          : `This account is already assigned to ${other?.name || "another employee"}.`,
      );
      return;
    }

    setBusy(`assign-emp-${employee.id}`);
    try {
      const previousLinked = catalogByEmployeeId.get(employee.id);
      if (previousLinked && previousLinked.id !== acc.id) {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(
          previousLinked.id,
          null,
          targetPharmacyId,
        );
      }

      await pharmacyService.assignPharmacyLoginAccountToEmployee(
        acc.id,
        employee.id,
        targetPharmacyId,
      );
      await pharmacyService.updateEmployee(employee.id, { jobTitle: acc.role });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "login_account_already_assigned"
          ? isArabic
            ? "هذا الحساب مربوط بموظف آخر"
            : "This account is assigned to another employee"
          : msg || (isArabic ? "تعذر الربط" : "Assign failed"),
      );
    } finally {
      setBusy("");
    }
  }

  const tabs: { id: TabId; ar: string; en: string }[] = useMemo(() => {
    const all: { id: TabId; ar: string; en: string }[] = [
      { id: "employees", ar: "الموظفين", en: "Employees" },
      { id: "accounts", ar: "حسابات الدخول", en: "Login Accounts" },
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

  function renderEmployeeRoleCell(emp: Employee) {
    const linked = catalogByEmployeeId.get(emp.id);
    if (!linked) {
      return <span className="catalogEmptyCell">—</span>;
    }
    return getRoleLabel(linked.role, isArabic);
  }

  function renderEmployeeLoginCell(emp: Employee) {
    const linked = catalogByEmployeeId.get(emp.id);
    const accountOptions = employeeLoginAccountOptionsFor(emp.pharmacyId, emp.id);
    const rowBusy = busy === `assign-emp-${emp.id}`;
    const selectedAccountId = getEmployeeAssignedAccountId(emp);

    if (canManage) {
      return (
        <select
          className="tableSelect employeeLoginAccountSelect"
          value={selectedAccountId}
          disabled={rowBusy}
          onChange={(e) => void assignEmployeeLoginAccount(emp, e.target.value)}
        >
          <option value="">{isArabic ? "— بدون حساب —" : "— No account —"}</option>
          {accountOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {getRoleLabel(account.role, isArabic)} — {account.email}
            </option>
          ))}
        </select>
      );
    }

    if (!linked?.email) {
      return <span className="catalogEmptyCell">—</span>;
    }

    return (
      <div className="employeeLoginEmailCell">
        <span dir="ltr" className="catalogEmailCell">
          {linked.email}
        </span>
        {linked.status === "approved" &&
          systemUserByEmail.has(linked.email.trim().toLowerCase()) && (
            <span className="badge ok employeeLoginLinkedBadge">
              {isArabic ? "مربوط" : "Linked"}
            </span>
          )}
      </div>
    );
  }

  return (
    <section className="card settingsPage staffPage">
      {loadError && (
        <p className="errorText" style={{ padding: "0 1rem" }}>
          {isArabic
            ? "تأكد من تنفيذ supabase/employees-users-migration.sql في Supabase"
            : "Run supabase/employees-users-migration.sql in Supabase"}
        </p>
      )}

      <div className="staffPageTabsBar">
        <nav
          className="settingsTabsNav"
          aria-label={isArabic ? "أقسام الموظفين" : "Staff sections"}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settingsTabBtn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isArabic ? tab.ar : tab.en}
            </button>
          ))}
        </nav>
        {canManage && activeTab === "employees" && (
          <button type="button" className="printBtn staffAddEmployeeBtn" onClick={openAddEmployee}>
            {isArabic ? "+ إضافة موظف" : "+ Add Employee"}
          </button>
        )}
      </div>

      {loading && !isHrTab && (
        <p className="hintText" style={{ padding: "0 1rem" }}>
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </p>
      )}

      {isHrTab && centralHrUpgradeNotice && onOpenSubscriptionSettings && (
        <TierUpgradeNotice
          isArabic={isArabic}
          message={centralHrUpgradeNotice}
          onAction={onOpenSubscriptionSettings}
        />
      )}

      {isHrTab && (
        <div className="settingsTabPanel hrPage">
          <Suspense
            fallback={
              <p className="hintText" style={{ padding: "0 1rem" }}>
                {isArabic ? "جاري تحميل الموارد البشرية..." : "Loading HR module..."}
              </p>
            }
          >
            <LazyHrPage
              embedded
              activeTab={activeTab}
              isArabic={isArabic}
              appUser={appUser}
              pharmacyId={pharmacyId}
              pharmacyName={pharmacyName}
              currency={currency}
              hasRole={(roles) => hasRole(appUser, roles)}
              showOrgHr={showOrgHr}
              orgBranchIds={orgBranchIds}
              resolveBranchLabel={branchLabel}
              hrManagePharmacyId={hrManagePharmacyId}
              orgHrReadOnly={orgHrReadOnly}
            />
          </Suspense>
        </div>
      )}

      {showOrgHr && branchHrSummaryRows.length > 0 && (activeTab === "employees" || isHrTab) && (
        <section className="card branchReportBreakdown branchHrSummaryCard">
          <h3>{isArabic ? "الموظفون حسب الفرع" : "Staff by branch"}</h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الفرع" : "Branch"}</th>
                  <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  <th>{isArabic ? "نشط" : "Active"}</th>
                  <th>{isArabic ? "موقوف" : "Inactive"}</th>
                </tr>
              </thead>
              <tbody>
                {branchHrSummaryRows.map((row) => (
                  <tr key={row.branchId}>
                    <td>{row.branchLabel}</td>
                    <td>{row.totalEmployees}</td>
                    <td>{row.activeEmployees}</td>
                    <td>{row.inactiveEmployees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "employees" && !loading && (
        <div className="settingsTabPanel">
          {showOrgHr && pharmacies.length > 1 && (
            <div className="filtersBar staffBranchFilterBar">
              <select
                value={employeeBranchFilter}
                onChange={(e) => setEmployeeBranchFilter(e.target.value)}
              >
                <option value="all">{isArabic ? "كل الفروع" : "All branches"}</option>
                {pharmacies.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {(isArabic ? branch.name : branch.name_en) || branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {filteredEmployees.length === 0 ? (
            <p className="empty">{isArabic ? "لا يوجد موظفون" : "No employees"}</p>
          ) : (
            <div className="tableWrap staffEmployeesTableWrap">
              <table className="staffEmployeesTable">
                <thead>
                  <tr>
                    {showOrgHr && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                    <th>{isArabic ? "كود الموظف" : "Code"}</th>
                    <th className="col-photo">{isArabic ? "الصورة" : "Photo"}</th>
                    <th>{isArabic ? "الاسم" : "Name"}</th>
                    <th>{isArabic ? "الهاتف" : "Phone"}</th>
                    <th>{isArabic ? "الدور" : "Role"}</th>
                    <th>{isArabic ? "الشيفت" : "Shift"}</th>
                    <th>{isArabic ? "التعيين" : "Hire date"}</th>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "حساب الدخول" : "Login account"}</th>
                    {canManage && (
                      <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      {showOrgHr && <td>{branchLabel(emp.pharmacyId)}</td>}
                      <td dir="ltr">
                        <code>{emp.employeeCode || "—"}</code>
                      </td>
                      <td className="col-photo">
                        <EmployeePhotoThumb photoBase64={emp.photoBase64} name={emp.name} />
                      </td>
                      <td>{emp.name}</td>
                      <td>{emp.phone || "—"}</td>
                      <td>{renderEmployeeRoleCell(emp)}</td>
                      <td>
                        {emp.useCustomWorkSchedule
                          ? isArabic
                            ? "مخصص"
                            : "Custom"
                          : getShiftDisplayName(
                              (emp.assignedShiftId as ShiftId) || pharmacyDefaultShiftId,
                              pharmacyShifts,
                              isArabic,
                            )}
                      </td>
                      <td>{formatDate(emp.hireDate, isArabic)}</td>
                      <td>
                        <span className={emp.isActive ? "badge ok" : "badge danger"}>
                          {emp.isActive
                            ? isArabic
                              ? "نشط"
                              : "Active"
                            : isArabic
                              ? "موقوف"
                              : "Inactive"}
                        </span>
                      </td>
                      <td>{renderEmployeeLoginCell(emp)}</td>
                      {canManage && (
                        <td className="col-actions">
                          <div className="staffEmployeesActions">
                            {emp.employeeCode && (
                              <button
                                type="button"
                                className="smallBtn staffEmployeesActionBtn"
                                onClick={() => setAttendanceBadgeEmployee(emp)}
                              >
                                {isArabic ? "بطاقة QR" : "QR badge"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="editBtn staffEmployeesActionBtn"
                              onClick={() => openEditEmployee(emp)}
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                            <button
                              type="button"
                              className={`staffEmployeesActionBtn${emp.isActive ? " dangerBtn" : " smallBtn"}`}
                              disabled={!!busy}
                              onClick={() => void toggleEmployeeActive(emp)}
                            >
                              {emp.isActive
                                ? isArabic
                                  ? "تعطيل"
                                  : "Deactivate"
                                : isArabic
                                  ? "تفعيل"
                                  : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="deleteSmallBtn staffEmployeesActionBtn"
                              disabled={!!busy}
                              onClick={() => void deleteEmployeeRecord(emp)}
                            >
                              {busy === `del-emp-${emp.id}`
                                ? "…"
                                : isArabic
                                  ? "حذف"
                                  : "Delete"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showOrgLoginAccounts &&
        branchLoginSummaryRows.length > 0 &&
        activeTab === "accounts" &&
        !loading && (
          <section className="card branchReportBreakdown branchHrSummaryCard">
            <h3>{isArabic ? "حسابات الدخول حسب الفرع" : "Login accounts by branch"}</h3>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{isArabic ? "الفرع" : "Branch"}</th>
                    <th>{isArabic ? "معتمد" : "Approved"}</th>
                    <th>{isArabic ? "معلّق" : "Pending"}</th>
                    <th>{isArabic ? "الحسابات" : "Accounts"}</th>
                  </tr>
                </thead>
                <tbody>
                  {branchLoginSummaryRows.map((row) => (
                    <tr
                      key={row.branchId}
                      className={
                        row.branchId === catalogTargetPharmacyId ? "branchSummaryRowActive" : ""
                      }
                      style={{ cursor: "pointer" }}
                      onClick={() => setCatalogBranchFilter(row.branchId)}
                    >
                      <td>{row.branchLabel}</td>
                      <td>{row.approvedAccounts}</td>
                      <td>
                        {row.pendingAccounts > 0 ? (
                          <span className="badge warn">{row.pendingAccounts}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td>{row.totalAccounts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      {activeTab === "accounts" && !loading && (
        <div className="settingsTabPanel">
          {loginAccountsUpgradeNotice && onOpenSubscriptionSettings && (
            <TierUpgradeNotice
              isArabic={isArabic}
              message={loginAccountsUpgradeNotice}
              onAction={onOpenSubscriptionSettings}
            />
          )}
          {showOrgLoginAccounts && pharmacies.length > 1 && (
            <div className="filtersBar staffBranchFilterBar">
              <label>
                {isArabic ? "فرع الحسابات" : "Accounts branch"}
                <select
                  value={catalogTargetPharmacyId}
                  onChange={(e) => setCatalogBranchFilter(e.target.value)}
                >
                  {pharmacies.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {(isArabic ? branch.name : branch.name_en) || branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="catalogLinkToolbarHint">
                {isArabic
                  ? `إدارة حسابات فرع: ${branchLabel(catalogTargetPharmacyId)}`
                  : `Managing accounts for: ${branchLabel(catalogTargetPharmacyId)}`}
              </p>
            </div>
          )}
          <div className="staffAccountsToolbar">
              {canManage && (
                <>
                  <button
                    type="button"
                    className="completeBtn catalogAddRoleBtn"
                    disabled={!!busy}
                    onClick={() => openCustomRoleModal()}
                  >
                    {isArabic ? "إضافة دور جديد" : "Add new role"}
                  </button>
                  <button
                    type="button"
                    className="editBtn catalogAddAccountBtn"
                    disabled={!!busy}
                    onClick={() => openCatalogAccountAdd()}
                  >
                    {isArabic ? "إضافة حساب دخول" : "Add login account"}
                  </button>
                </>
              )}
              {pendingCatalogAccounts.length > 0 && (
                <span className="badge warn">
                  {pendingCatalogAccounts.length}{" "}
                  {isArabic ? "بانتظار مراجعتك" : "awaiting your review"}
                  {showOrgLoginAccounts && (
                    <small> ({isArabic ? "كل الفروع" : "all branches"})</small>
                  )}
                </span>
              )}
              {isCatalogOwner && (
                <p className="catalogLinkToolbarHint">
                  {isArabic
                    ? "يمكنك إضافة نفس الدور أكثر من مرة (مثلاً كاشيرين). «دور جديد» = صلاحيات جديدة. عيّن الحسابات للموظفين من تبويب الموظفين."
                    : "You can add the same role multiple times (e.g. two cashiers). «Add new role» = new permissions. Assign accounts to employees on the Employees tab."}
                </p>
              )}
              {isOrgManager && pendingCatalogAccounts.length > 0 && (
                <p className="catalogLinkToolbarHint">
                  {isArabic
                    ? "تعديلاتك بانتظار اعتماد مالك النظام"
                    : "Your changes are awaiting system owner approval"}
                </p>
              )}
            </div>
          <div className="tableWrap catalogAccountsTableWrap">
            <table className="catalogAccountsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الإيميل" : "Email"}</th>
                  <th>{isArabic ? "كلمة المرور" : "Password"}</th>
                  <th>{isArabic ? "الموظف المعيّن" : "Assigned employee"}</th>
                  {canManage && (
                    <th className="catalogWorkflowActionsHead">
                      {isArabic ? "إجراءات" : "Actions"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedBranchLoginAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="catalogEmptyCell">
                      {isArabic
                        ? "لا توجد حسابات دخول. أضف حساباً أو أنشئ دوراً جديداً."
                        : "No login accounts yet. Add an account or create a new role."}
                    </td>
                  </tr>
                ) : (
                  sortedBranchLoginAccounts.map((acc) => {
                    const role = parseLoginAccountRole(acc.role);
                    const isCustom = isAccountCustomRole(role);
                    const linkedUser = systemUserByEmail.get(acc.email.trim().toLowerCase());
                    const rowBusy =
                      busy === "save-catalog" ||
                      busy === `del-${acc.id}` ||
                      busy === `link-approve-${acc.id}` ||
                      busy === `approve-account-${acc.id}` ||
                      busy === `approve-edit-${acc.id}` ||
                      busy === `unlink-${acc.id}`;
                    const assignedEmployee = acc.employeeId
                      ? employeeById.get(acc.employeeId)
                      : undefined;

                    return (
                      <tr key={acc.id}>
                        <td className="catalogRoleCell">
                          {getRoleLabel(role, isArabic)}
                          {isCustom && (
                            <span className="badge catalogRoleStatusBadge">
                              {isArabic ? "مخصص" : "Custom"}
                            </span>
                          )}
                          {acc.status === "pending" && (
                            <span className="badge warn catalogRoleStatusBadge">
                              {isArabic ? "معلّق" : "Pending"}
                            </span>
                          )}
                          {acc.status === "rejected" && (
                            <span className="badge danger catalogRoleStatusBadge">
                              {isArabic ? "مرفوض" : "Rejected"}
                            </span>
                          )}
                        </td>
                        <td dir="ltr" className="catalogEmailCell">
                          {acc.email}
                        </td>
                        <td dir="ltr" className="catalogPasswordCell">
                          <code className="catalogPasswordCode">{acc.password || "—"}</code>
                        </td>
                        <td className="catalogEmployeeCell">
                          {assignedEmployee ? (
                            assignedEmployee.name
                          ) : (
                            <span className="catalogEmptyCell hintText">
                              {isArabic ? "عيّن من صفحة الموظفين" : "Assign from Employees tab"}
                            </span>
                          )}
                        </td>
                        {canManage && (
                          <td className="catalogAccountActionsCell">
                            <div className="catalogAccountActions">
                              {isCatalogOwner && (
                                <>
                                  {(acc.status === "pending" ||
                                    acc.status === "rejected" ||
                                    acc.editPending) && (
                                    <button
                                      type="button"
                                      className="smallBtn catalogAccountActionBtn catalogWorkflowBtn"
                                      disabled={rowBusy}
                                      onClick={() =>
                                        void (acc.editPending
                                          ? approveCatalogEdit(acc)
                                          : approveCatalogAccount(acc))
                                      }
                                    >
                                      {busy === `approve-account-${acc.id}` ||
                                      busy === `approve-edit-${acc.id}`
                                        ? "…"
                                        : isArabic
                                          ? "اعتماد"
                                          : "Approve"}
                                    </button>
                                  )}
                                  {acc.status === "approved" && !acc.editPending && !linkedUser && (
                                    <button
                                      type="button"
                                      className="smallBtn linkAccountBtn catalogAccountActionBtn catalogWorkflowBtn"
                                      disabled={rowBusy}
                                      onClick={() => void approveCatalogLink(acc)}
                                    >
                                      {busy === `link-approve-${acc.id}`
                                        ? "…"
                                        : isArabic
                                          ? "ربط"
                                          : "Link"}
                                    </button>
                                  )}
                                  {acc.status === "approved" && !acc.editPending && linkedUser && (
                                    <button
                                      type="button"
                                      className="catalogAccountActionBtn catalogUnlinkBtn"
                                      disabled={rowBusy}
                                      onClick={() => void unlinkCatalogAccount(acc, linkedUser)}
                                    >
                                      {busy === `unlink-${acc.id}`
                                        ? "…"
                                        : isArabic
                                          ? "فصل"
                                          : "Unlink"}
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                className="editBtn catalogAccountActionBtn"
                                disabled={rowBusy}
                                onClick={() => openCatalogAccountEdit(acc)}
                              >
                                {isArabic ? "تعديل" : "Edit"}
                              </button>
                              <button
                                type="button"
                                className="smallBtn catalogAccountActionBtn"
                                disabled={rowBusy}
                                onClick={() => openCatalogAccountDuplicate(acc)}
                              >
                                {isArabic ? "نسخ الدور" : "Same role"}
                              </button>
                              {isCatalogOwner && (
                                <button
                                  type="button"
                                  className="dangerBtn catalogAccountActionBtn"
                                  disabled={rowBusy}
                                  onClick={() => void deleteCatalogAccount(acc)}
                                >
                                  {isArabic ? "حذف" : "Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "permissions" && (
        <div className="settingsTabPanel">
          {showOrgLoginAccounts && pharmacies.length > 1 && (
            <div className="filtersBar staffBranchFilterBar">
              <label>
                {isArabic ? "فرع الصلاحيات" : "Permissions branch"}
                <select
                  value={catalogTargetPharmacyId}
                  onChange={(e) => setCatalogBranchFilter(e.target.value)}
                >
                  {pharmacies.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {(isArabic ? branch.name : branch.name_en) || branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {canManage && (
            <p className="catalogLinkToolbarHint">
              {isArabic
                ? "حدّد لكل دور الصفحات التي يراها والصلاحيات الإضافية (حذف، إعدادات…). التغييرات تُطبَّق بعد الحفظ."
                : "Set visible pages and extra permissions (delete, settings…) per role. Changes apply after save."}
            </p>
          )}
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الملخص" : "Summary"}</th>
                  {canManage && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
                </tr>
              </thead>
              <tbody>
                {EDITABLE_BUILTIN_ROLES.map((roleKey) => {
                  const access = getEffectiveRoleAccess(roleKey, catalogTargetPharmacyId);
                  return (
                    <tr key={roleKey}>
                      <td>{getRoleLabel(roleKey, isArabic)}</td>
                      <td
                        title={roleAccessSummaryTitle(
                          access.allowedPages,
                          access.permissions,
                          isArabic,
                        )}
                      >
                        {summarizeRoleAccess(access.allowedPages, access.permissions, isArabic)}
                        {access.isCustomized && (
                          <span className="badge warn" style={{ marginInlineStart: "0.5rem" }}>
                            {isArabic ? "مخصّص" : "Customized"}
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td>
                          <div className="catalogAccountActions">
                            <button
                              type="button"
                              className="editBtn smallBtn"
                              disabled={!!busy}
                              onClick={() => openPermissionEditorBuiltin(roleKey)}
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                            {access.isCustomized && (
                              <button
                                type="button"
                                className="smallBtn"
                                disabled={!!busy}
                                onClick={() =>
                                  void resetRolePermissionsToDefaults({
                                    kind: "builtin",
                                    roleKey,
                                  })
                                }
                              >
                                {isArabic ? "افتراضي" : "Default"}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {permissionsBranchCustomRoles.map((role) => {
                  const access = getEffectiveRoleAccess(role.roleKey, role.pharmacyId);
                  return (
                    <tr key={role.id}>
                      <td>
                        {isArabic ? role.nameAr : role.nameEn}{" "}
                        <span className="badge">{isArabic ? "مخصص" : "Custom"}</span>
                      </td>
                      <td
                        title={roleAccessSummaryTitle(
                          access.allowedPages,
                          access.permissions,
                          isArabic,
                        )}
                      >
                        {summarizeRoleAccess(access.allowedPages, access.permissions, isArabic)}
                      </td>
                      {canManage && (
                        <td>
                          <div className="catalogAccountActions">
                            <button
                              type="button"
                              className="editBtn smallBtn"
                              disabled={!!busy}
                              onClick={() => openPermissionEditorCustom(role)}
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                            {isCatalogOwner && (
                              <button
                                type="button"
                                className="dangerBtn smallBtn"
                                disabled={busy === `del-role-${role.id}`}
                                onClick={() =>
                                  void deleteCustomRoleDefinition(
                                    role.id,
                                    isArabic ? role.nameAr : role.nameEn,
                                  )
                                }
                              >
                                {isArabic ? "حذف" : "Delete"}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RolePermissionsEditorModal
        isArabic={isArabic}
        open={Boolean(permissionEditorTarget)}
        busy={busy === "save-role-permissions"}
        target={permissionEditorTarget}
        allowedPages={permissionEditorPages}
        permissions={permissionEditorPermissions}
        onClose={() => setPermissionEditorTarget(null)}
        onChangePages={setPermissionEditorPages}
        onChangePermissions={setPermissionEditorPermissions}
        onSave={() => void savePermissionEditor()}
        onResetDefaults={resetPermissionEditorDefaults}
      />

      {activeTab === "activity" && !loading && (
        <div className="settingsTabPanel">
          {staffActivity.length === 0 ? (
            <p className="empty">{isArabic ? "لا يوجد نشاط مسجل" : "No staff activity yet"}</p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{isArabic ? "التاريخ" : "Date"}</th>
                    <th>{isArabic ? "النوع" : "Type"}</th>
                    <th>{isArabic ? "العنوان" : "Title"}</th>
                    <th>{isArabic ? "التفاصيل" : "Details"}</th>
                    <th>{isArabic ? "بواسطة" : "By"}</th>
                  </tr>
                </thead>
                <tbody>
                  {staffActivity.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.createdAt, isArabic)}</td>
                      <td>{log.type}</td>
                      <td>{log.title}</td>
                      <td>{log.description}</td>
                      <td>{log.userName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {attendanceBadgeEmployee && (
        <Suspense fallback={null}>
          <LazyEmployeeAttendanceBadgeModal
            isArabic={isArabic}
            employee={attendanceBadgeEmployee}
            branchLabel={branchLabel(attendanceBadgeEmployee.pharmacyId)}
            onClose={() => setAttendanceBadgeEmployee(null)}
          />
        </Suspense>
      )}

      {employeeModal && (
        <div className="modalOverlay" onClick={() => setEmployeeModal(null)}>
          <div
            className="invoiceModal userModal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader">
              <h2>
                {employeeModal === "add"
                  ? isArabic
                    ? "إضافة موظف"
                    : "Add Employee"
                  : isArabic
                    ? "تعديل موظف"
                    : "Edit Employee"}
              </h2>
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setEmployeeModal(null)}
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="userFormGrid">
              {showOrgHrManage && employeeModal === "add" && (
                <label className="userFormFullWidth">
                  {isArabic ? "الفرع" : "Branch"}
                  <select
                    value={employeeForm.pharmacyId}
                    onChange={(e) => {
                      const nextBranchId = e.target.value;
                      setEmployeeForm({ ...employeeForm, pharmacyId: nextBranchId });
                      void pharmacyService.suggestNextEmployeeCode(nextBranchId).then((code) => {
                        setEmployeeForm((prev) =>
                          prev.pharmacyId === nextBranchId ? { ...prev, employeeCode: code } : prev,
                        );
                      });
                    }}
                  >
                    {pharmacies.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {(isArabic ? branch.name : branch.name_en) || branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="employeeTopRow">
                <label className="employeeCodeField">
                  {isArabic ? "كود الموظف" : "Employee code"}
                  <input
                    className="searchInput"
                    value={employeeForm.employeeCode}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })
                    }
                    placeholder="EMP-001"
                    dir="ltr"
                  />
                </label>
                <div className="employeePhotoCompact">
                  <span className="employeePhotoCompactLabel">
                    {isArabic ? "صورة الموظف" : "Employee photo"}
                  </span>
                  <label className="employeePhotoPicker" htmlFor="employee-photo-input">
                    <EmployeePhotoThumb
                      variant="form"
                      photoBase64={employeeForm.photoBase64}
                      name={employeeForm.name || "?"}
                    />
                    <span className="employeePhotoPickerHint">
                      {employeeForm.photoBase64
                        ? isArabic
                          ? "تغيير"
                          : "Change"
                        : isArabic
                          ? "رفع صورة"
                          : "Upload"}
                    </span>
                  </label>
                  <input
                    id="employee-photo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="employeePhotoFileInput"
                    onChange={(e) =>
                      readEmployeePhotoFile(e.target.files?.[0] ?? null, isArabic, (dataUrl) =>
                        setEmployeeForm({ ...employeeForm, photoBase64: dataUrl }),
                      )
                    }
                  />
                  {employeeForm.photoBase64 && (
                    <button
                      type="button"
                      className="employeePhotoRemoveBtn"
                      onClick={() => setEmployeeForm({ ...employeeForm, photoBase64: "" })}
                    >
                      {isArabic ? "حذف" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
              <label>
                {isArabic ? "الاسم" : "Name"} *
                <input
                  className="searchInput"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                />
              </label>
              <label>
                {isArabic ? "الهاتف" : "Phone"}
                <input
                  className="searchInput"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                />
              </label>
              <label>
                {isArabic ? "تاريخ التعيين" : "Hire date"}
                <input
                  type="date"
                  className="searchInput"
                  value={employeeForm.hireDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                {isArabic ? "ملاحظات" : "Notes"}
                <input
                  className="searchInput"
                  value={employeeForm.notes}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                />
              </label>
              <label>
                {isArabic ? "ساعات العمل المطلوبة (يومياً)" : "Required work hours (daily)"}
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  className="searchInput"
                  value={employeeForm.requiredWorkHours}
                  disabled={employeeForm.useCustomWorkSchedule}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      requiredWorkHours: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>

              <div className="workScheduleEmployeeSection" style={{ gridColumn: "1 / -1" }}>
                <label>
                  {isArabic ? "الشيفت" : "Shift"}
                  <select
                    className="tableSelect"
                    value={employeeForm.assignedShiftId}
                    disabled={employeeForm.useCustomWorkSchedule}
                    onChange={(e) => {
                      const assignedShiftId = e.target.value as ShiftId;
                      const shift =
                        pharmacyShifts.find((item) => item.id === assignedShiftId) ||
                        pharmacyShifts[0];
                      setEmployeeForm((prev) => ({
                        ...prev,
                        assignedShiftId,
                        workDayStart: shift.dayStart,
                        workDayEnd: shift.dayEnd,
                        workBreaks: shift.breaks.map((item) => ({ ...item })),
                        requiredWorkHours: computeWorkHoursFromSchedule({
                          dayStart: shift.dayStart,
                          dayEnd: shift.dayEnd,
                          breaks: shift.breaks,
                        }),
                      }));
                    }}
                  >
                    {pharmacyShifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {getShiftDisplayName(shift.id, pharmacyShifts, isArabic)} ({shift.dayStart}–
                        {shift.dayEnd})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="workScheduleCustomRow">
                  <input
                    type="checkbox"
                    checked={employeeForm.useCustomWorkSchedule}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const shift =
                        pharmacyShifts.find((item) => item.id === employeeForm.assignedShiftId) ||
                        pharmacyShifts[0];
                      setEmployeeForm((prev) => ({
                        ...prev,
                        useCustomWorkSchedule: enabled,
                        workDayStart: enabled ? prev.workDayStart : shift.dayStart,
                        workDayEnd: enabled ? prev.workDayEnd : shift.dayEnd,
                        workBreaks: enabled
                          ? prev.workBreaks.length > 0
                            ? prev.workBreaks
                            : shift.breaks.map((item) => ({ ...item }))
                          : shift.breaks.map((item) => ({ ...item })),
                        requiredWorkHours: enabled
                          ? computeWorkHoursFromSchedule({
                              dayStart: prev.workDayStart,
                              dayEnd: prev.workDayEnd,
                              breaks: prev.workBreaks.length > 0 ? prev.workBreaks : shift.breaks,
                            })
                          : computeWorkHoursFromSchedule({
                              dayStart: shift.dayStart,
                              dayEnd: shift.dayEnd,
                              breaks: shift.breaks,
                            }),
                      }));
                    }}
                  />
                  <span>
                    {isArabic
                      ? "مواعيد عمل مخصصة (بدل الشيفت)"
                      : "Custom work schedule (override shift)"}
                  </span>
                </label>

                {employeeForm.useCustomWorkSchedule ? (
                  <Suspense
                    fallback={
                      <p className="hintText">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
                    }
                  >
                    <LazyWorkScheduleEditor
                      isArabic={isArabic}
                      schedule={{
                        dayStart: employeeForm.workDayStart,
                        dayEnd: employeeForm.workDayEnd,
                        breaks: employeeForm.workBreaks,
                      }}
                      onChange={updateEmployeeWorkSchedule}
                    />
                  </Suspense>
                ) : (
                  <p className="workScheduleHint">
                    {isArabic
                      ? `مواعيد ${getShiftDisplayName(employeeForm.assignedShiftId, pharmacyShifts, true)}: ${employeeForm.workDayStart} → ${employeeForm.workDayEnd}`
                      : `${getShiftDisplayName(employeeForm.assignedShiftId, pharmacyShifts, false)} schedule: ${employeeForm.workDayStart} → ${employeeForm.workDayEnd}`}
                  </p>
                )}
              </div>
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="completeBtn"
                disabled={!!busy}
                onClick={() => void saveEmployee()}
              >
                {isArabic ? "حفظ" : "Save"}
              </button>
              <button type="button" className="editBtn" onClick={() => setEmployeeModal(null)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {customRoleModal && (
        <div className="modalOverlay" onClick={() => setCustomRoleModal(false)}>
          <div
            className="invoiceModal userModal loginRequestModal customRoleModal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader catalogAccountModalHeader">
              <h2>{isArabic ? "إضافة دور جديد" : "Add new role"}</h2>
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setCustomRoleModal(false)}
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="catalogAccountFormFields">
              <div className="settingsField settingsFieldFull">
                <label htmlFor="custom-role-name-ar">{isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"} *</label>
                <input
                  id="custom-role-name-ar"
                  value={customRoleForm.nameAr}
                  onChange={(e) => setCustomRoleForm({ ...customRoleForm, nameAr: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="settingsField settingsFieldFull">
                <label htmlFor="custom-role-name-en">{isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"} *</label>
                <input
                  id="custom-role-name-en"
                  dir="ltr"
                  value={customRoleForm.nameEn}
                  onChange={(e) => setCustomRoleForm({ ...customRoleForm, nameEn: e.target.value })}
                />
              </div>
              <div className="settingsField settingsFieldFull">
                <label htmlFor="custom-role-template">
                  {isArabic ? "قالب الصلاحيات" : "Permission template"}
                </label>
                <select
                  id="custom-role-template"
                  className="tableSelect"
                  value={customRoleForm.baseRole}
                  onChange={(e) => onCustomRoleBaseChange(e.target.value as UserRole)}
                >
                  {customRoleTemplateOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role, isArabic)}
                    </option>
                  ))}
                </select>
                <p className="catalogLinkToolbarHint">
                  {isArabic
                    ? "يُنسخ من الدور المختار ويمكنك تعديل الصفحات أدناه."
                    : "Pages are copied from the template; adjust the checklist below."}
                </p>
              </div>
              <fieldset className="customRolePagesFieldset settingsFieldFull">
                <legend>{isArabic ? "الصفحات المسموحة" : "Allowed pages"}</legend>
                <div className="customRolePagesGrid">
                  {CUSTOM_ROLE_PAGE_OPTIONS.map((option) => (
                    <label key={option.page} className="customRolePageCheck">
                      <input
                        type="checkbox"
                        checked={customRoleForm.allowedPages.includes(option.page)}
                        onChange={() => toggleCustomRolePage(option.page)}
                      />
                      <span>{isArabic ? option.labelAr : option.labelEn}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="modalActions catalogAccountModalActions">
              <button
                type="button"
                className="completeBtn"
                disabled={!!busy}
                onClick={() => void saveCustomRole()}
              >
                {busy === "save-custom-role"
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "إنشاء الدور"
                    : "Create role"}
              </button>
              <button type="button" className="editBtn" onClick={() => setCustomRoleModal(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountModal && (
        <div className="modalOverlay" onClick={() => setAccountModal(null)}>
          <div
            className="invoiceModal userModal loginRequestModal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader catalogAccountModalHeader">
              <div className="catalogAccountModalTitle">
                <h2>
                  {accountModal === "add"
                    ? isArabic
                      ? "إضافة حساب دخول"
                      : "Add login account"
                    : isArabic
                      ? "تعديل حساب الدخول"
                      : "Edit login account"}
                </h2>
                <span className="catalogRoleBadge">{getRoleLabel(catalogForm.role, isArabic)}</span>
              </div>
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setAccountModal(null)}
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="catalogAccountFormFields">
              {accountModal === "add" && (
                <div className="settingsField settingsFieldFull">
                  <label htmlFor="catalog-account-role">
                    {isArabic ? "الدور" : "Role"} *
                  </label>
                  <select
                    id="catalog-account-role"
                    className="tableSelect catalogAccountRoleSelect"
                    value={catalogForm.role}
                    onChange={(e) => onCatalogFormRoleChange(e.target.value as UserRole)}
                  >
                    {loginAccountRoleSelectOptions.map((roleKey) => (
                      <option key={roleKey} value={roleKey}>
                        {getRoleLabel(roleKey, isArabic)}
                      </option>
                    ))}
                  </select>
                  <p className="catalogLinkToolbarHint">
                    {isArabic
                      ? "يمكنك اختيار نفس الدور أكثر من مرة — سيُقترح إيميل جديد تلقائياً."
                      : "You can pick the same role again — a new email will be suggested automatically."}
                  </p>
                </div>
              )}
              <div className="settingsField settingsFieldFull">
                <label htmlFor="catalog-account-email">
                  {isArabic ? "البريد الإلكتروني" : "Email"} *
                </label>
                <input
                  id="catalog-account-email"
                  type="email"
                  dir="ltr"
                  value={catalogForm.email}
                  onChange={(e) => setCatalogForm({ ...catalogForm, email: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="settingsField settingsFieldFull">
                <label htmlFor="catalog-account-password">
                  {isArabic ? "كلمة المرور" : "Password"} *
                </label>
                <input
                  id="catalog-account-password"
                  type="text"
                  dir="ltr"
                  value={catalogForm.password}
                  onChange={(e) => setCatalogForm({ ...catalogForm, password: e.target.value })}
                />
              </div>
            </div>
            <div className="modalActions catalogAccountModalActions">
              <button
                type="button"
                className="completeBtn"
                disabled={!!busy}
                onClick={() => void saveCatalogAccount()}
              >
                {busy === "save-catalog"
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "حفظ"
                    : "Save"}
              </button>
              <button type="button" className="editBtn" onClick={() => setAccountModal(null)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
