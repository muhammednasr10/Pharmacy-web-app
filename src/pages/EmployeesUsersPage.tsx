import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActivityLog,
  AppUser,
  Employee,
  PharmacyLoginAccount,
  PharmacySettings,
  UserRole,
} from "../types";
import * as pharmacyService from "../services/pharmacyService";
import HrPage, { type HrTab } from "./HrPage";
import {
  getRoleLabel,
  hasRole,
  isSuperAdmin,
  loginAccountRoleOptions,
  parseLoginAccountRole,
  getDefaultLoginAccountDraft,
  rolePermissionMatrix,
  STAFF_ACTIVITY_TYPES,
} from "../utils/roles";
import WorkScheduleEditor from "../components/WorkScheduleEditor";
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

function formatUserCreationError(message: string, isArabic: boolean) {
  if (message === "email_address_invalid_format") {
    return isArabic ? "صيغة الإيميل غير صحيحة" : "Invalid email format";
  }
  if (message === "email_domain_rejected" || message === "email_address_invalid") {
    return isArabic
      ? "Supabase يرفض هذا الدومين. استخدم بريداً حقيقياً."
      : "Email domain rejected. Use a real mailbox.";
  }
  if (message.includes("already registered")) {
    return isArabic ? "هذا الإيميل مسجل بالفعل" : "Email already registered";
  }
  if (message === "auth_pending_confirmation") {
    return isArabic
      ? "تم إنشاء الحساب. قد يحتاج المستخدم لتأكيد البريد."
      : "Account created. User may need email confirmation.";
  }
  return message;
}

const emptyEmployeeForm = {
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
  workBreaks: [] as typeof DEFAULT_PHARMACY_SHIFTS[0]["breaks"],
  hireDate: "",
  notes: "",
  isActive: true,
};

function pickCatalogAccountForRole(
  accounts: PharmacyLoginAccount[],
  role: UserRole
): PharmacyLoginAccount | undefined {
  const matches = accounts.filter((item) => parseLoginAccountRole(item.role) === role);
  if (matches.length === 0) return undefined;

  const statusRank: Record<PharmacyLoginAccount["status"], number> = {
    approved: 0,
    pending: 1,
    rejected: 2,
  };

  return [...matches].sort((a, b) => {
    const byStatus = statusRank[a.status] - statusRank[b.status];
    if (byStatus !== 0) return byStatus;
    return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
  })[0];
}

function EmployeePhotoThumb({
  photoBase64,
  name,
  variant = "table",
}: {
  photoBase64?: string;
  name: string;
  variant?: "table" | "form";
}) {
  const className = variant === "form" ? "employeePhotoThumb employeePhotoThumbForm" : "employeePhotoThumb";
  const placeholderClassName =
    variant === "form" ? "employeePhotoPlaceholder employeePhotoPlaceholderForm" : "employeePhotoPlaceholder";

  if (photoBase64) {
    return <img src={photoBase64} alt="" className={className} />;
  }
  const initial = name.trim().charAt(0) || "?";
  return <span className={placeholderClassName}>{initial}</span>;
}

function readEmployeePhotoFile(
  file: File | null,
  isArabic: boolean,
  onLoad: (dataUrl: string) => void
) {
  if (!file) return;
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    alert(isArabic ? "يرجى اختيار صورة PNG أو JPG أو WebP" : "Please choose a PNG, JPG, or WebP image");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert(isArabic ? "حجم الصورة كبير. الحد الأقصى 2 ميجابايت" : "Image is too large. Maximum size is 2 MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result || ""));
  reader.onerror = () => alert(isArabic ? "تعذر قراءة الصورة" : "Could not read the image");
  reader.readAsDataURL(file);
}

export default function EmployeesUsersPage({
  isArabic,
  appUser,
  pharmacyId,
  pharmacies,
  currency,
  currentUid,
  onActivityLog,
}: EmployeesUsersPageProps) {
  const isAccountantOnly = appUser?.role === "accountant";
  const [activeTab, setActiveTab] = useState<TabId>(isAccountantOnly ? "attendance" : "employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginCatalog, setLoginCatalog] = useState<PharmacyLoginAccount[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");

  const [employeeModal, setEmployeeModal] = useState<"add" | "edit" | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [pharmacyShifts, setPharmacyShifts] = useState(clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS));
  const [pharmacyDefaultShiftId, setPharmacyDefaultShiftId] = useState<ShiftId>("A");

  const [accountModal, setAccountModal] = useState<"add" | "edit" | null>(null);
  const [editCatalogId, setEditCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState(() => ({
    role: "cashier" as UserRole,
    email: "",
    password: "",
  }));

  const catalogRoleOptions = loginAccountRoleOptions;
  const canManage = appUser?.role === "pharmacy_admin" || isSuperAdmin(appUser);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const pendingCatalogAccounts = useMemo(
    () => loginCatalog.filter((item) => item.status === "pending"),
    [loginCatalog]
  );

  const catalogByEmployeeId = useMemo(() => {
    const map = new Map<string, PharmacyLoginAccount>();
    loginCatalog.forEach((item) => {
      if (!item.employeeId) return;
      const existing = map.get(item.employeeId);
      if (!existing || item.status === "approved") {
        map.set(item.employeeId, item);
      }
    });
    return map;
  }, [loginCatalog]);

  const catalogByRole = useMemo(() => {
    const map = new Map<UserRole, PharmacyLoginAccount>();
    catalogRoleOptions.forEach((role) => {
      const account = pickCatalogAccountForRole(loginCatalog, role);
      if (account) map.set(role, account);
    });
    return map;
  }, [loginCatalog, catalogRoleOptions]);

  const staffEmployeeOptions = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name, isArabic ? "ar" : "en"));
  }, [employees, isArabic]);

  function catalogEmployeeOptionsForRow(assignedEmployeeId?: string) {
    const assigned = assignedEmployeeId ? employeeById.get(assignedEmployeeId) : undefined;
    if (assigned && !staffEmployeeOptions.some((item) => item.id === assigned.id)) {
      return [assigned, ...staffEmployeeOptions];
    }
    return staffEmployeeOptions;
  }

  function catalogStatusLabel(status: PharmacyLoginAccount["status"]) {
    if (status === "pending") return isArabic ? "قيد الاعتماد" : "Pending";
    if (status === "rejected") return isArabic ? "مرفوض" : "Rejected";
    return isArabic ? "معتمد" : "Approved";
  }

  const pharmacyName = useMemo(() => {
    const branch = pharmacies.find((p) => p.id === pharmacyId);
    return branch?.name || pharmacyId || "main";
  }, [pharmacies, pharmacyId]);

  const branchLabel = useCallback(
    (id: string) => {
      const branch = pharmacies.find((p) => p.id === id);
      return branch?.name || id;
    },
    [pharmacies]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
      const [empRows, logs, catalog] = await Promise.all([
        pharmacyService.getEmployees(),
        pharmacyService.getActivityLogs(),
        pharmacyService.getPharmacyLoginAccounts(targetPharmacyId),
      ]);
      setEmployees(empRows);
      setActivityLogs(logs);
      setLoginCatalog(catalog);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "load_failed");
      setEmployees([]);
      setLoginCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [appUser, pharmacyId]);

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
      activityLogs.filter((log) =>
        STAFF_ACTIVITY_TYPES.includes(log.type) || log.referenceType === "employee" || log.referenceType === "user"
      ),
    [activityLogs]
  );

  function openAddEmployee() {
    setEditEmployeeId(null);
    const defaultShift =
      pharmacyShifts.find((item) => item.id === pharmacyDefaultShiftId) || pharmacyShifts[0];
    setEmployeeForm({
      ...emptyEmployeeForm,
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
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
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
            pharmacyDefaultShiftId
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
        workDayStart: employeeForm.useCustomWorkSchedule ? employeeForm.workDayStart : (null as unknown as undefined),
        workDayEnd: employeeForm.useCustomWorkSchedule ? employeeForm.workDayEnd : (null as unknown as undefined),
        workBreaks: employeeForm.useCustomWorkSchedule ? employeeForm.workBreaks : (null as unknown as undefined),
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

  function openCatalogAccountForRole(role: UserRole) {
    const existing = catalogByRole.get(role);
    const defaults = getDefaultLoginAccountDraft(role);
    if (existing) {
      setEditCatalogId(existing.id);
      setCatalogForm({
        role: parseLoginAccountRole(existing.role),
        email: existing.email,
        password: existing.password || defaults.password,
      });
      setAccountModal("edit");
      return;
    }
    setEditCatalogId(null);
    setCatalogForm({
      role,
      email: defaults.email,
      password: defaults.password,
    });
    setAccountModal("add");
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
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
      const autoApprove = isSuperAdmin(appUser);
      const existing = catalogByRole.get(role);

      if (accountModal === "edit" && editCatalogId) {
        await pharmacyService.updatePharmacyLoginAccount(editCatalogId, {
          email,
          password,
          role,
          ...(autoApprove ? {} : { status: "pending" }),
        });
      } else if (existing) {
        await pharmacyService.updatePharmacyLoginAccount(existing.id, {
          email,
          password,
          role,
          ...(autoApprove ? {} : { status: "pending" }),
        });
      } else {
        await pharmacyService.createPharmacyLoginAccount({
          pharmacyId: targetPharmacyId,
          email,
          password,
          role,
          ...(autoApprove ? { status: "approved" } : { status: "pending" }),
          requestedBy: appUser?.uid,
          requestedByName: appUser?.name,
        });
      }
      setAccountModal(null);
      await loadAll();
      alert(
        autoApprove
          ? isArabic
            ? "تم الحفظ"
            : "Saved"
          : accountModal === "edit" || existing
          ? isArabic
            ? "تم إرسال التعديل للاعتماد"
            : "Changes sent for approval"
          : isArabic
          ? "تم إرسال الحساب للاعتماد"
          : "Account sent for approval"
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

  async function assignCatalogRowEmployee(role: UserRole, employeeId: string) {
    const acc = catalogByRole.get(role);
    if (!acc || acc.status !== "approved") return;

    setBusy(`assign-role-${role}`);
    try {
      const targetPharmacyId = pharmacyId || appUser?.pharmacyId || "main";
      const previousEmployeeId = acc.employeeId;

      if (!employeeId) {
        await pharmacyService.assignPharmacyLoginAccountToEmployee(acc.id, null, targetPharmacyId);
        if (previousEmployeeId) {
          await pharmacyService.updateEmployee(previousEmployeeId, { jobTitle: "" });
        }
      } else {
        const employee = employeeById.get(employeeId);
        if (!employee) return;
        await pharmacyService.assignPharmacyLoginAccountToEmployee(acc.id, employee.id, targetPharmacyId);
        await pharmacyService.updateEmployee(employee.id, { jobTitle: acc.role });
        if (previousEmployeeId && previousEmployeeId !== employee.id) {
          await pharmacyService.updateEmployee(previousEmployeeId, { jobTitle: "" });
        }
      }
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "login_account_already_assigned"
          ? isArabic
            ? "هذا الحساب مربوط بموظف آخر"
            : "This account is assigned to another employee"
          : msg || (isArabic ? "تعذر الربط" : "Assign failed")
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
      return all.filter((tab) => tab.id === "attendance" || tab.id === "requests" || tab.id === "payroll" || tab.id === "activity");
    }
    return all;
  }, [isAccountantOnly]);

  const isHrTab = activeTab === "attendance" || activeTab === "payroll" || activeTab === "requests";

  function renderEmployeeRoleCell(emp: Employee) {
    const account = catalogByEmployeeId.get(emp.id);
    if (account) {
      return getRoleLabel(account.role, isArabic);
    }
    return <span className="catalogEmptyCell">—</span>;
  }

  function renderEmployeeLoginCell(emp: Employee) {
    const account = catalogByEmployeeId.get(emp.id);
    if (account) {
      return (
        <span dir="ltr" className="catalogEmailCell">
          {account.email}
        </span>
      );
    }
    return <span className="catalogEmptyCell">—</span>;
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
        <nav className="settingsTabsNav" aria-label={isArabic ? "أقسام الموظفين" : "Staff sections"}>
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

      {isHrTab && (
        <div className="settingsTabPanel hrPage">
          <HrPage
            embedded
            activeTab={activeTab}
            isArabic={isArabic}
            appUser={appUser}
            pharmacyId={pharmacyId}
            currency={currency}
            hasRole={(roles) => hasRole(appUser, roles)}
          />
        </div>
      )}

      {activeTab === "employees" && !loading && (
        <div className="settingsTabPanel">
          {employees.length === 0 ? (
            <p className="empty">{isArabic ? "لا يوجد موظفون" : "No employees"}</p>
          ) : (
            <div className="tableWrap staffEmployeesTableWrap">
              <table className="staffEmployeesTable">
                <thead>
                  <tr>
                    <th>{isArabic ? "كود الموظف" : "Code"}</th>
                    <th className="col-photo">{isArabic ? "الصورة" : "Photo"}</th>
                    <th>{isArabic ? "الاسم" : "Name"}</th>
                    <th>{isArabic ? "الهاتف" : "Phone"}</th>
                    <th>{isArabic ? "الدور" : "Role"}</th>
                    <th>{isArabic ? "الشيفت" : "Shift"}</th>
                    <th>{isArabic ? "التعيين" : "Hire date"}</th>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "حساب الدخول" : "Login account"}</th>
                    {canManage && <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                      <tr key={emp.id}>
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
                                isArabic
                              )}
                        </td>
                        <td>{formatDate(emp.hireDate, isArabic)}</td>
                        <td>
                          <span className={emp.isActive ? "badge ok" : "badge danger"}>
                            {emp.isActive ? (isArabic ? "نشط" : "Active") : isArabic ? "موقوف" : "Inactive"}
                          </span>
                        </td>
                        <td>{renderEmployeeLoginCell(emp)}</td>
                        {canManage && (
                          <td className="col-actions">
                            <div className="staffEmployeesActions">
                              <button
                                type="button"
                                className="editBtn staffEmployeesActionBtn"
                                onClick={() => openEditEmployee(emp)}
                              >
                                {isArabic ? "تعديل" : "Edit"}
                              </button>
                              <button
                                type="button"
                                className={`smallBtn staffEmployeesActionBtn${emp.isActive ? " dangerBtn" : ""}`}
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

      {activeTab === "accounts" && !loading && (
        <div className="settingsTabPanel">
          {canManage && pendingCatalogAccounts.length > 0 && (
            <div className="staffAccountsToolbar">
              <span className="badge warn">
                {pendingCatalogAccounts.length}{" "}
                {isArabic ? "بانتظار الاعتماد" : "awaiting approval"}
              </span>
            </div>
          )}
          <div className="tableWrap">
            <table className="catalogAccountsTable">
              <thead>
                <tr>
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الإيميل" : "Email"}</th>
                  <th>{isArabic ? "كلمة المرور" : "Password"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{isArabic ? "الموظف" : "Employee"}</th>
                  {canManage && <th>{isArabic ? "إجراء" : "Action"}</th>}
                </tr>
              </thead>
              <tbody>
                {catalogRoleOptions.map((role) => {
                  const acc = catalogByRole.get(role);
                  const defaults = getDefaultLoginAccountDraft(role);
                  const employeeOptions = catalogEmployeeOptionsForRow(acc?.employeeId);
                  const statusClass =
                    acc?.status === "approved" ? "ok" : acc?.status === "rejected" ? "danger" : "warn";
                  const rowBusy =
                    busy === "save-catalog" ||
                    busy === `assign-role-${role}` ||
                    busy === `del-${acc?.id}`;
                  const canAssignEmployee = canManage && acc?.status === "approved";

                  return (
                    <tr key={role}>
                      <td className="catalogRoleCell">{getRoleLabel(role, isArabic)}</td>
                      <td dir="ltr" className="catalogEmailCell">
                        {acc?.email || defaults.email}
                      </td>
                      <td dir="ltr" className="catalogPasswordCell">
                        <code className="catalogPasswordCode">{acc?.password || defaults.password}</code>
                      </td>
                      <td>
                        {acc ? (
                          <span className={`badge ${statusClass}`}>{catalogStatusLabel(acc.status)}</span>
                        ) : (
                          <span className="catalogEmptyCell">—</span>
                        )}
                      </td>
                      <td className="catalogEmployeeCell">
                        {canManage ? (
                          <select
                            className="tableSelect catalogEmployeeSelect"
                            value={canAssignEmployee ? acc?.employeeId || "" : ""}
                            disabled={rowBusy || !canAssignEmployee}
                            onChange={(e) => void assignCatalogRowEmployee(role, e.target.value)}
                          >
                            <option value="">
                              {canAssignEmployee
                                ? isArabic
                                  ? "— اختر موظف —"
                                  : "— Select employee —"
                                : isArabic
                                ? "—"
                                : "—"}
                            </option>
                            {employeeOptions.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name}
                              </option>
                            ))}
                          </select>
                        ) : assignedEmployee ? (
                          assignedEmployee.name
                        ) : (
                          "—"
                        )}
                      </td>
                      {canManage && (
                        <td className="hrActionsCell">
                          <button
                            type="button"
                            className="smallBtn"
                            disabled={rowBusy}
                            onClick={() => openCatalogAccountForRole(role)}
                          >
                            {isArabic ? "تعديل" : "Edit"}
                          </button>
                          {acc && (
                            <button
                              type="button"
                              className="smallBtn dangerBtn"
                              disabled={rowBusy}
                              onClick={() => void deleteCatalogAccount(acc)}
                            >
                              {isArabic ? "حذف" : "Delete"}
                            </button>
                          )}
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

      {activeTab === "permissions" && (
        <div className="settingsTabPanel">
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الصلاحيات" : "Permissions"}</th>
                </tr>
              </thead>
              <tbody>
                {rolePermissionMatrix.map((row) => (
                  <tr key={row.role}>
                    <td>{isArabic ? row.labelAr : row.labelEn}</td>
                    <td>{isArabic ? row.summaryAr : row.summaryEn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {employeeModal && (
        <div className="modalOverlay" onClick={() => setEmployeeModal(null)}>
          <div className="invoiceModal userModal" onClick={(e) => e.stopPropagation()} dir={isArabic ? "rtl" : "ltr"}>
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
              <button type="button" className="deleteSmallBtn" onClick={() => setEmployeeModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
              <div className="userFormGrid">
                <div className="employeeTopRow">
                  <label className="employeeCodeField">
                    {isArabic ? "كود الموظف" : "Employee code"}
                    <input
                      className="searchInput"
                      value={employeeForm.employeeCode}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
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
                          setEmployeeForm({ ...employeeForm, photoBase64: dataUrl })
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
                    setEmployeeForm({ ...employeeForm, requiredWorkHours: Number(e.target.value) || 0 })
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
                        pharmacyShifts.find((item) => item.id === assignedShiftId) || pharmacyShifts[0];
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
                              breaks:
                                prev.workBreaks.length > 0 ? prev.workBreaks : shift.breaks,
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
                    {isArabic ? "مواعيد عمل مخصصة (بدل الشيفت)" : "Custom work schedule (override shift)"}
                  </span>
                </label>

                {employeeForm.useCustomWorkSchedule ? (
                  <WorkScheduleEditor
                    isArabic={isArabic}
                    schedule={{
                      dayStart: employeeForm.workDayStart,
                      dayEnd: employeeForm.workDayEnd,
                      breaks: employeeForm.workBreaks,
                    }}
                    onChange={updateEmployeeWorkSchedule}
                  />
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
              <button type="button" className="completeBtn" disabled={!!busy} onClick={() => void saveEmployee()}>
                {isArabic ? "حفظ" : "Save"}
              </button>
              <button type="button" className="editBtn" onClick={() => setEmployeeModal(null)}>
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
            <div className="modalHeader">
              <h2>
                {isArabic
                  ? `تعديل حساب — ${getRoleLabel(catalogForm.role, isArabic)}`
                  : `Edit account — ${getRoleLabel(catalogForm.role, isArabic)}`}
              </h2>
              <button type="button" className="deleteSmallBtn" onClick={() => setAccountModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="userFormGrid loginRequestForm catalogAccountForm">
              <div className="catalogRoleBadge">{getRoleLabel(catalogForm.role, isArabic)}</div>
              <label>
                {isArabic ? "البريد الإلكتروني" : "Email"} *
                <input
                  type="email"
                  className="searchInput"
                  dir="ltr"
                  value={catalogForm.email}
                  onChange={(e) => setCatalogForm({ ...catalogForm, email: e.target.value })}
                  autoFocus
                />
              </label>
              <label>
                {isArabic ? "كلمة المرور" : "Password"} *
                <input
                  type="text"
                  className="searchInput"
                  dir="ltr"
                  value={catalogForm.password}
                  onChange={(e) => setCatalogForm({ ...catalogForm, password: e.target.value })}
                />
              </label>
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
