import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActivityLog,
  AppUser,
  Employee,
  LoginAccountRequest,
  PharmacySettings,
  SystemUser,
  UserRole,
} from "../types";
import * as pharmacyService from "../services/pharmacyService";
import HrPage, { type HrTab } from "./HrPage";
import {
  getRoleLabel,
  hasRole,
  isSuperAdmin,
  pharmacyAdminRoleOptions,
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
  jobTitle: "",
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
  createLogin: false,
  username: "",
  email: "",
  password: "",
  role: "cashier" as UserRole,
};

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
  const [accounts, setAccounts] = useState<SystemUser[]>([]);
  const [loginAccountRequests, setLoginAccountRequests] = useState<LoginAccountRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");

  const [employeeModal, setEmployeeModal] = useState<"add" | "edit" | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [pharmacyShifts, setPharmacyShifts] = useState(clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS));
  const [pharmacyDefaultShiftId, setPharmacyDefaultShiftId] = useState<ShiftId>("A");

  const [accountModal, setAccountModal] = useState<"link-request" | "edit" | null>(null);
  const [editAccountUid, setEditAccountUid] = useState<string | null>(null);
  const [linkRequestEmployee, setLinkRequestEmployee] = useState<Employee | null>(null);
  const [linkRequestForm, setLinkRequestForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "cashier" as UserRole,
  });
  const [editAccountForm, setEditAccountForm] = useState({
    username: "",
    role: "cashier" as UserRole,
    isActive: true,
    employeeId: "",
  });

  const roleOptions = pharmacyAdminRoleOptions;
  const canManage = appUser?.role === "pharmacy_admin" || isSuperAdmin(appUser);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const accountByEmployeeId = useMemo(() => {
    const map = new Map<string, SystemUser>();
    accounts.forEach((a) => {
      if (a.employeeId) map.set(a.employeeId, a);
    });
    return map;
  }, [accounts]);

  const pendingRequestByEmployeeId = useMemo(() => {
    const map = new Map<string, LoginAccountRequest>();
    loginAccountRequests
      .filter((r) => r.status === "pending")
      .forEach((r) => map.set(r.employeeId, r));
    return map;
  }, [loginAccountRequests]);

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
      const [empRows, logs, loginReqs] = await Promise.all([
        pharmacyService.getEmployees(),
        pharmacyService.getActivityLogs(),
        pharmacyId
          ? pharmacyService.getPharmacyLoginAccountRequests(pharmacyId)
          : Promise.resolve([] as LoginAccountRequest[]),
      ]);
      setEmployees(empRows);
      setActivityLogs(logs);
      setLoginAccountRequests(loginReqs);

      if (isSuperAdmin(appUser)) {
        setAccounts(await pharmacyService.getAllSystemUsers());
      } else if (pharmacyId) {
        setAccounts(await pharmacyService.getSystemUsers(pharmacyId));
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "load_failed");
      setEmployees([]);
      setAccounts([]);
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
      jobTitle: employee.jobTitle || "",
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
      createLogin: false,
      username: "",
      email: "",
      password: "",
      role: "cashier",
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
        jobTitle: employeeForm.jobTitle.trim() || undefined,
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

      if (employeeModal === "add" && employeeForm.createLogin) {
        if (!employeeForm.email.trim() || !employeeForm.password.trim()) {
          alert(
            isArabic
              ? "تم حفظ الموظف. أرسل طلب حساب دخول من زر «ربط بحساب»."
              : "Employee saved. Submit a login request via Link account."
          );
        } else if (isSuperAdmin(appUser)) {
          try {
            const uid = await pharmacyService.createSystemUser({
              name: payload.name,
              email: employeeForm.email.trim(),
              password: employeeForm.password,
              role: employeeForm.role,
              pharmacyId: targetPharmacyId,
              employeeId: savedEmployee.id,
              username: employeeForm.username.trim() || undefined,
            });
            await onActivityLog({
              type: "user_create",
              title: isArabic ? "إنشاء حساب دخول" : "Login Account Created",
              description: isArabic
                ? `تم إنشاء حساب دخول للموظف ${payload.name}`
                : `Login account created for ${payload.name}`,
              referenceType: "user",
              referenceId: uid,
            });
          } catch (authErr) {
            const msg = authErr instanceof Error ? authErr.message : "";
            alert(formatUserCreationError(msg, isArabic));
          }
        } else {
          try {
            await pharmacyService.createLoginAccountRequest({
              pharmacyId: targetPharmacyId,
              pharmacyName,
              employeeId: savedEmployee.id,
              employeeName: payload.name,
              email: employeeForm.email.trim(),
              username: employeeForm.username.trim() || payload.name.replace(/\s+/g, "").toLowerCase(),
              password: employeeForm.password,
              role: employeeForm.role,
              requestedBy: appUser?.uid,
              requestedByName: appUser?.name,
            });
            await onActivityLog({
              type: "login_account_request",
              title: isArabic ? "طلب حساب دخول" : "Login Account Request",
              description: isArabic
                ? `طلب حساب للموظف ${payload.name}`
                : `Login request for ${payload.name}`,
              referenceType: "login_account_request",
              referenceId: String(savedEmployee.id),
            });
            alert(
              isArabic
                ? "تم إرسال طلب إنشاء الحساب لمالك النظام للاعتماد."
                : "Login request sent to system owner for approval."
            );
          } catch (reqErr) {
            const msg = reqErr instanceof Error ? reqErr.message : "";
            alert(
              msg === "pending_login_request_exists"
                ? isArabic
                  ? "يوجد طلب قيد المراجعة لهذا الموظف"
                  : "A pending request already exists for this employee"
                : isArabic
                ? "تم حفظ الموظف لكن تعذر إرسال الطلب"
                : "Employee saved but request failed"
            );
          }
        }
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

  function openLinkAccountRequest(employee: Employee) {
    const pending = pendingRequestByEmployeeId.get(employee.id);
    if (pending) {
      alert(
        isArabic
          ? `يوجد طلب قيد المراجعة (${pending.requestNumber})`
          : `Pending request exists (${pending.requestNumber})`
      );
      return;
    }
    setLinkRequestEmployee(employee);
    setLinkRequestForm({
      email: "",
      username: employee.name.replace(/\s+/g, "").toLowerCase().slice(0, 24),
      password: "",
      role: "cashier",
    });
    setAccountModal("link-request");
  }

  async function submitLinkAccountRequest() {
    if (!linkRequestEmployee) return;

    const email = linkRequestForm.email.trim().toLowerCase();
    const username = linkRequestForm.username.trim();
    const password = linkRequestForm.password;

    if (!email || !username || !password) {
      alert(isArabic ? "أكمل الإيميل واسم المستخدم وكلمة المرور" : "Fill email, username, and password");
      return;
    }
    if (password.length < 6) {
      alert(isArabic ? "كلمة المرور 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setBusy("link-request");
    try {
      const targetPharmacyId = linkRequestEmployee.pharmacyId || pharmacyId || appUser?.pharmacyId || "main";
      await pharmacyService.createLoginAccountRequest({
        pharmacyId: targetPharmacyId,
        pharmacyName,
        employeeId: linkRequestEmployee.id,
        employeeName: linkRequestEmployee.name,
        email,
        username,
        password,
        role: linkRequestForm.role,
        requestedBy: appUser?.uid,
        requestedByName: appUser?.name,
      });
      await onActivityLog({
        type: "login_account_request",
        title: isArabic ? "طلب حساب دخول" : "Login Account Request",
        description: isArabic
          ? `طلب حساب للموظف ${linkRequestEmployee.name} (${username})`
          : `Login request for ${linkRequestEmployee.name} (${username})`,
        referenceType: "login_account_request",
        referenceId: linkRequestEmployee.id,
      });
      setAccountModal(null);
      setLinkRequestEmployee(null);
      await loadAll();
      alert(
        isArabic
          ? "تم إرسال الطلب لمالك النظام. ستصلك رسالة بعد الاعتماد أو الرفض."
          : "Request sent to system owner for approval."
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      alert(
        msg === "pending_login_request_exists"
          ? isArabic
            ? "يوجد طلب قيد المراجعة لهذا الموظف"
            : "Pending request already exists"
          : msg.includes("login_account_requests")
          ? isArabic
            ? "شغّل supabase/login-account-requests.sql في Supabase"
            : "Run supabase/login-account-requests.sql in Supabase"
          : msg || (isArabic ? "تعذر إرسال الطلب" : "Request failed")
      );
    } finally {
      setBusy("");
    }
  }

  function openEditAccount(account: SystemUser) {
    setEditAccountUid(account.uid);
    setEditAccountForm({
      username: account.username || "",
      role: account.role,
      isActive: account.isActive,
      employeeId: account.employeeId || "",
    });
    setAccountModal("edit");
  }

  async function saveEditAccount() {
    if (!editAccountUid) return;
    if (editAccountUid === currentUid && !editAccountForm.isActive) {
      alert(isArabic ? "لا يمكنك تعطيل حسابك" : "Cannot deactivate your own account");
      return;
    }

    setBusy("edit-account");
    try {
      const prev = accounts.find((a) => a.uid === editAccountUid);
      await pharmacyService.updateLoginAccount(editAccountUid, {
        username: editAccountForm.username.trim() || undefined,
        role: editAccountForm.role,
        isActive: editAccountForm.isActive,
      });

      if (editAccountForm.employeeId !== (prev?.employeeId || "")) {
        await pharmacyService.linkUserToEmployee(
          editAccountUid,
          editAccountForm.employeeId || null
        );
        await onActivityLog({
          type: editAccountForm.employeeId ? "user_link_employee" : "user_unlink_employee",
          title: editAccountForm.employeeId
            ? isArabic
              ? "ربط موظف"
              : "Employee Linked"
            : isArabic
            ? "فصل حساب عن موظف"
            : "Account Unlinked",
          description: prev?.name || editAccountUid,
          referenceType: "user",
          referenceId: editAccountUid,
        });
      }

      if (prev && prev.role !== editAccountForm.role) {
        await onActivityLog({
          type: "user_role_change",
          title: isArabic ? "تعديل صلاحية" : "Role Changed",
          description: isArabic
            ? `${prev.name}: ${getRoleLabel(prev.role, true)} → ${getRoleLabel(editAccountForm.role, true)}`
            : `${prev.name}: ${getRoleLabel(prev.role, false)} → ${getRoleLabel(editAccountForm.role, false)}`,
          referenceType: "user",
          referenceId: editAccountUid,
        });
      }

      await onActivityLog({
        type: editAccountForm.isActive ? "user_activate" : "user_deactivate",
        title: isArabic ? "تحديث حساب" : "Account Updated",
        description: prev?.name || editAccountUid,
        referenceType: "user",
        referenceId: editAccountUid,
      });

      setAccountModal(null);
      await loadAll();
      alert(isArabic ? "تم التحديث" : "Updated");
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر التحديث" : "Update failed");
    } finally {
      setBusy("");
    }
  }

  async function unlinkAccount(account: SystemUser) {
    if (!confirm(isArabic ? "فصل الحساب عن الموظف؟" : "Unlink account from employee?")) return;
    setBusy(`unlink-${account.uid}`);
    try {
      await pharmacyService.linkUserToEmployee(account.uid, null);
      await onActivityLog({
        type: "user_unlink_employee",
        title: isArabic ? "فصل حساب" : "Account Unlinked",
        description: account.name,
        referenceType: "user",
        referenceId: account.uid,
      });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  const tabs: { id: TabId; ar: string; en: string }[] = useMemo(() => {
    const all: { id: TabId; ar: string; en: string }[] = [
      { id: "employees", ar: "الموظفين", en: "Employees" },
      { id: "accounts", ar: "حسابات الدخول", en: "Login Accounts" },
      { id: "attendance", ar: "الحضور والانصراف", en: "Attendance" },
      { id: "payroll", ar: "حساب المرتبات", en: "Payroll" },
      { id: "permissions", ar: "الصلاحيات", en: "Permissions" },
      { id: "activity", ar: "سجل النشاط", en: "Activity Log" },
    ];
    if (isAccountantOnly) {
      return all.filter((tab) => tab.id === "attendance" || tab.id === "payroll" || tab.id === "activity");
    }
    return all;
  }, [isAccountantOnly]);

  const isHrTab = activeTab === "attendance" || activeTab === "payroll";

  function renderLoginCell(emp: Employee) {
    const linked = accountByEmployeeId.get(emp.id);
    if (linked) {
      return (
        <span title={linked.email}>
          {linked.username || linked.email}
        </span>
      );
    }
    const pending = pendingRequestByEmployeeId.get(emp.id);
    if (pending) {
      return (
        <span className="badge warn" title={pending.requestNumber}>
          {isArabic ? "طلب قيد المراجعة" : "Pending approval"}
        </span>
      );
    }
    if (canManage && emp.isActive) {
      return (
        <button
          type="button"
          className="smallBtn linkAccountBtn"
          disabled={!!busy}
          onClick={() => openLinkAccountRequest(emp)}
        >
          {isArabic ? "ربط بحساب" : "Link account"}
        </button>
      );
    }
    return <span className="badge">{isArabic ? "بدون حساب" : "No account"}</span>;
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
                    <th>{isArabic ? "الوظيفة" : "Job"}</th>
                    <th>{isArabic ? "الشيفت" : "Shift"}</th>
                    <th>{isArabic ? "التعيين" : "Hire date"}</th>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "حساب الدخول" : "Login"}</th>
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
                        <td>{emp.jobTitle || "—"}</td>
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
                        <td>{renderLoginCell(emp)}</td>
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
          <p className="returnsSectionHint">
            {isArabic
              ? "حسابات الدخول المربوطة بالموظفين. لطلب حساب جديد استخدم «ربط بحساب» من تبويب الموظفين."
              : "Linked login accounts. Request new accounts from the Employees tab."}
          </p>
          {accounts.length === 0 ? (
            <p className="empty">{isArabic ? "لا توجد حسابات" : "No accounts"}</p>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{isArabic ? "الموظف" : "Employee"}</th>
                    <th>{isArabic ? "username" : "Username"}</th>
                    <th>{isArabic ? "الإيميل" : "Email"}</th>
                    <th>{isArabic ? "الدور" : "Role"}</th>
                    {isSuperAdmin(appUser) && <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>}
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "آخر دخول" : "Last login"}</th>
                    {canManage && <th>{isArabic ? "إجراء" : "Action"}</th>}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => {
                    const emp = acc.employeeId ? employeeById.get(acc.employeeId) : undefined;
                    return (
                      <tr key={acc.uid}>
                        <td>{emp?.name || acc.name}</td>
                        <td>{acc.username || "—"}</td>
                        <td>{acc.email}</td>
                        <td>{getRoleLabel(acc.role, isArabic)}</td>
                        {isSuperAdmin(appUser) && <td>{branchLabel(acc.pharmacyId)}</td>}
                        <td>
                          <span className={acc.isActive ? "badge ok" : "badge danger"}>
                            {acc.isActive ? (isArabic ? "نشط" : "Active") : isArabic ? "موقوف" : "Inactive"}
                          </span>
                        </td>
                        <td>{formatDateTime(acc.lastLoginAt, isArabic)}</td>
                        {canManage && (
                          <td className="hrActionsCell">
                            <button type="button" className="smallBtn" onClick={() => openEditAccount(acc)}>
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                            {acc.employeeId && (
                              <button
                                type="button"
                                className="smallBtn dangerBtn"
                                disabled={!!busy}
                                onClick={() => void unlinkAccount(acc)}
                              >
                                {isArabic ? "فصل" : "Unlink"}
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
          )}
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
                {isArabic ? "الوظيفة" : "Job title"}
                <input
                  className="searchInput"
                  value={employeeForm.jobTitle}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })}
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

            {employeeModal === "add" && (
              <>
                <label className="checkboxRow">
                  <input
                    type="checkbox"
                    checked={employeeForm.createLogin}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, createLogin: e.target.checked })}
                  />
                  {isArabic ? "إنشاء حساب دخول لهذا الموظف" : "Create login account for this employee"}
                </label>
                {employeeForm.createLogin && (
                  <div className="userFormGrid">
                    <label>
                      username
                      <input
                        className="searchInput"
                        value={employeeForm.username}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                      />
                    </label>
                    <label>
                      {isArabic ? "الإيميل" : "Email"} *
                      <input
                        type="email"
                        className="searchInput"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                      />
                    </label>
                    <label>
                      {isArabic ? "كلمة المرور" : "Password"} *
                      <input
                        type="password"
                        className="searchInput"
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                      />
                    </label>
                    <label>
                      {isArabic ? "الدور" : "Role"}
                      <select
                        className="tableSelect"
                        value={employeeForm.role}
                        onChange={(e) =>
                          setEmployeeForm({ ...employeeForm, role: e.target.value as UserRole })
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role, isArabic)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}

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

      {accountModal === "link-request" && linkRequestEmployee && (
        <div className="modalOverlay" onClick={() => setAccountModal(null)}>
          <div className="invoiceModal userModal" onClick={(e) => e.stopPropagation()} dir={isArabic ? "rtl" : "ltr"}>
            <div className="modalHeader">
              <h2>
                {isArabic
                  ? `طلب حساب دخول — ${linkRequestEmployee.name}`
                  : `Login request — ${linkRequestEmployee.name}`}
              </h2>
              <button type="button" className="deleteSmallBtn" onClick={() => setAccountModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <p className="returnsSectionHint">
              {isArabic
                ? "سيُرسل الطلب لمالك النظام في صفحة إدارة الصيدليات للاعتماد أو الرفض."
                : "This request goes to the system owner on the Pharmacies (SaaS) page for approval."}
            </p>
            <div className="userFormGrid">
              <label>
                {isArabic ? "البريد الإلكتروني" : "Email"} *
                <input
                  type="email"
                  className="searchInput"
                  value={linkRequestForm.email}
                  onChange={(e) => setLinkRequestForm({ ...linkRequestForm, email: e.target.value })}
                  placeholder="user@gmail.com"
                />
              </label>
              <label>
                {isArabic ? "اسم المستخدم" : "Username"} *
                <input
                  className="searchInput"
                  value={linkRequestForm.username}
                  onChange={(e) => setLinkRequestForm({ ...linkRequestForm, username: e.target.value })}
                  placeholder={isArabic ? "مثل: admin" : "e.g. admin"}
                />
              </label>
              <label>
                {isArabic ? "كلمة المرور" : "Password"} *
                <input
                  type="password"
                  className="searchInput"
                  value={linkRequestForm.password}
                  onChange={(e) => setLinkRequestForm({ ...linkRequestForm, password: e.target.value })}
                  placeholder={isArabic ? "6 أحرف على الأقل" : "Min. 6 characters"}
                />
              </label>
              <label>
                {isArabic ? "الدور" : "Role"} *
                <select
                  className="tableSelect"
                  value={linkRequestForm.role}
                  onChange={(e) =>
                    setLinkRequestForm({ ...linkRequestForm, role: e.target.value as UserRole })
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role, isArabic)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modalActions">
              <button
                type="button"
                className="completeBtn"
                disabled={!!busy}
                onClick={() => void submitLinkAccountRequest()}
              >
                {busy === "link-request"
                  ? isArabic
                    ? "جاري الإرسال..."
                    : "Sending..."
                  : isArabic
                  ? "إرسال الطلب"
                  : "Submit request"}
              </button>
              <button type="button" className="editBtn" onClick={() => setAccountModal(null)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountModal === "edit" && editAccountUid && (
        <div className="modalOverlay" onClick={() => setAccountModal(null)}>
          <div className="invoiceModal userModal" onClick={(e) => e.stopPropagation()} dir={isArabic ? "rtl" : "ltr"}>
            <div className="modalHeader">
              <h2>{isArabic ? "تعديل حساب دخول" : "Edit Login Account"}</h2>
              <button type="button" className="deleteSmallBtn" onClick={() => setAccountModal(null)}>
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="userFormGrid">
              <label>
                username
                <input
                  className="searchInput"
                  value={editAccountForm.username}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, username: e.target.value })}
                />
              </label>
              <label>
                {isArabic ? "الدور" : "Role"}
                <select
                  className="tableSelect"
                  value={editAccountForm.role}
                  onChange={(e) =>
                    setEditAccountForm({ ...editAccountForm, role: e.target.value as UserRole })
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role, isArabic)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {isArabic ? "ربط بموظف" : "Link to employee"}
                <select
                  className="tableSelect"
                  value={editAccountForm.employeeId}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, employeeId: e.target.value })}
                >
                  <option value="">{isArabic ? "بدون ربط" : "Not linked"}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={editAccountForm.isActive}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, isActive: e.target.checked })}
                />
                {isArabic ? "حساب نشط" : "Account active"}
              </label>
            </div>
            <div className="modalActions">
              <button type="button" className="completeBtn" disabled={!!busy} onClick={() => void saveEditAccount()}>
                {isArabic ? "حفظ" : "Save"}
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
