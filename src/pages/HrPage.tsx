import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppUser, AttendanceRecord, AttendanceStatus, EarlyLeaveOutcome, Employee, EmployeeRequest, PayrollRecord, ShiftId, SystemUser } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import {
  computeWorkHoursFromSchedule,
  evaluateAttendanceTiming,
  isEarlyLeaveApproved,
  resolveEarlyLeaveOutcome,
  getShiftDisplayName,
  isCheckInLate,
  resolveAllowedLateMinutes,
  resolveScheduleForShiftId,
  resolveWorkSchedule,
  SHIFT_IDS,
} from "../utils/workSchedule";

type HrTab = "attendance" | "payroll" | "requests";

type HrStaffRow = {
  employeeId: string;
  name: string;
  attendanceKey: string;
  salary: number;
  requiredWorkHours: number;
  commissionRate: number;
  assignedShiftId: ShiftId;
  useCustomWorkSchedule: boolean;
  workDayStart?: string;
  workDayEnd?: string;
  workBreaks?: Employee["workBreaks"];
};

type PayrollAdditionsDraft = {
  specialAllowances: number;
  bonuses: number;
  incentives: number;
  commission: number;
};

type AttendanceLogDraft = {
  userId: string;
  userName: string;
  workDate: string;
  status: AttendanceStatus | "";
  checkInTime: string;
  checkOutTime: string;
  actualShiftId: ShiftId;
  recordId?: number;
};

type HrPageProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  currency: string;
  hasRole: (roles: AppUser["role"][]) => boolean;
  embedded?: boolean;
  activeTab?: HrTab;
};

export type { HrTab };

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTime(iso: string | undefined, isArabic: boolean) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcWorkedHours(checkIn?: string, checkOut?: string): number | null {
  return pharmacyService.calcAttendanceWorkedHours(checkIn, checkOut);
}

function formatHoursWithMinutes(hours: number, isArabic: boolean) {
  const minutes = Math.round(hours * 60);
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} (${minutes} دقيقة)` : `${hoursText} (${minutes} min)`;
}

function formatActualHours(checkIn?: string, checkOut?: string, isArabic = false) {
  const hours = calcWorkedHours(checkIn, checkOut);
  if (hours === null) return "—";
  return formatHoursWithMinutes(hours, isArabic);
}

function isoToTimeInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatTimeWithOvernight(
  iso: string | undefined,
  isArabic: boolean,
  spansNextDay = false
) {
  if (!iso) return "—";
  const time = new Date(iso).toLocaleTimeString(isArabic ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!spansNextDay) return time;
  return isArabic ? `${time} (+1)` : `${time} (+1d)`;
}

function attendanceSpansNextDay(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return false;
  const inDay = checkIn.slice(0, 10);
  const outDay = checkOut.slice(0, 10);
  return inDay !== outDay;
}

function statusClearsTimes(status: AttendanceStatus | "") {
  return status === "absent" || status === "leave" || status === "sick";
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = formatLocalDate(new Date(y, m, 1));
  const end = formatLocalDate(new Date(y, m + 1, 0));
  return { start, end };
}

function monthBoundsFromDate(dateStr: string) {
  return monthBounds(new Date(`${dateStr}T12:00:00`));
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthAnchorDate(monthValue: string) {
  return `${monthValue}-01`;
}

function listDaysInMonth(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    days.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatTotalWorked(minutes: number, isArabic: boolean) {
  const hours = minutes / 60;
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} ساعة (${minutes} دقيقة)` : `${hoursText} hrs (${minutes} min)`;
}

function formatWorkMinutes(minutes: number, isArabic: boolean) {
  if (!minutes) return "0";
  const hours = minutes / 60;
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText} (${minutes} د)` : `${hoursText} (${minutes}m)`;
}

function countPeriodDays(start: string, end: string) {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

function statusLabel(status: AttendanceStatus | string, isArabic: boolean) {
  const map: Record<string, { ar: string; en: string }> = {
    present: { ar: "حاضر", en: "Present" },
    absent: { ar: "غائب", en: "Absent" },
    late: { ar: "حضور (تأخير)", en: "Present (late)" },
    leave: { ar: "إجازة", en: "Leave" },
    sick: { ar: "مرضي", en: "Sick leave" },
  };
  const item = map[status] || map.present;
  return isArabic ? item.ar : item.en;
}

function attendanceStatusBadge(
  status: AttendanceStatus | string | undefined,
  isArabic: boolean,
  timing?: { isLate: boolean; isEarlyLeave: boolean },
  earlyLeave?: {
    rawEarlyLeave: boolean;
    effectiveOutcome: EarlyLeaveOutcome;
    canToggle?: boolean;
    resolving?: boolean;
    onToggle?: (outcome: EarlyLeaveOutcome) => void;
  }
) {
  if (!status) {
    return (
      <span className="hrAttendanceStatus hrAttendanceStatusEmpty">
        {isArabic ? "لم يسجل" : "Not recorded"}
      </span>
    );
  }

  const hasEarlyLeaveUi = Boolean(earlyLeave?.rawEarlyLeave);
  const isWorkAttendance =
    status === "present" ||
    status === "late" ||
    (timing && timing.isLate) ||
    hasEarlyLeaveUi;

  if (isWorkAttendance && (status === "present" || status === "late" || timing || hasEarlyLeaveUi)) {
    const earlyLeaveIsPermission = earlyLeave?.effectiveOutcome !== "deduction";
    const earlyLeaveLabel = earlyLeaveIsPermission
      ? isArabic
        ? "إذن"
        : "Permission"
      : isArabic
        ? "خصم"
        : "Deduction";
    const earlyLeaveClass = earlyLeaveIsPermission
      ? "hrAttendanceFlagPermission"
      : "hrAttendanceFlagDeduction";
    const toggleTitle = earlyLeave?.canToggle
      ? earlyLeaveIsPermission
        ? isArabic
          ? "اضغط للتحويل إلى خصم"
          : "Click to mark as deduction"
        : isArabic
          ? "اضغط للتحويل إلى إذن"
          : "Click to mark as permission"
      : undefined;

    return (
      <span className="hrAttendanceStatusWrap">
        <span className="hrAttendanceStatus hrAttendanceStatus-present">
          {isArabic ? "حاضر" : "Present"}
        </span>
        {timing?.isLate && (
          <span className="hrAttendanceFlag hrAttendanceFlagLate">
            {isArabic ? "تأخير" : "Late"}
          </span>
        )}
        {hasEarlyLeaveUi &&
          (earlyLeave?.canToggle ? (
            <button
              type="button"
              className={`hrAttendanceFlag ${earlyLeaveClass} hrAttendanceFlagClickable`}
              title={toggleTitle}
              disabled={earlyLeave.resolving}
              onClick={() =>
                earlyLeave.onToggle?.(earlyLeaveIsPermission ? "deduction" : "permission")
              }
            >
              {earlyLeaveLabel}
            </button>
          ) : (
            <span className={`hrAttendanceFlag ${earlyLeaveClass}`}>{earlyLeaveLabel}</span>
          ))}
      </span>
    );
  }

  return (
    <span className={`hrAttendanceStatus hrAttendanceStatus-${status}`}>
      {statusLabel(status, isArabic)}
    </span>
  );
}

function isShiftOnlyPresetRecord(record?: AttendanceRecord) {
  return Boolean(record?.shiftId && !record.checkIn && !record.checkOut);
}

function isAttendanceWorkDay(record?: AttendanceRecord) {
  if (!record || isShiftOnlyPresetRecord(record)) return false;
  if (record.status === "present" || record.status === "late") return true;
  if (["absent", "leave", "sick"].includes(record.status)) return false;
  return Boolean(record.checkIn || record.checkOut);
}

function formatAttendanceDateCell(dateStr: string, isArabic: boolean) {
  const d = new Date(`${dateStr}T12:00:00`);
  return {
    day: d.getDate(),
    weekday: d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", { weekday: "short" }),
    monthYear: d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      month: "short",
      year: "numeric",
    }),
  };
}

export default function HrPage({
  isArabic,
  appUser,
  pharmacyId,
  currency,
  hasRole,
  embedded = false,
  activeTab: controlledTab,
}: HrPageProps) {
  const [internalTab, setInternalTab] = useState<HrTab>("attendance");
  const activeTab = embedded && controlledTab ? controlledTab : internalTab;
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonthValue);
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<EmployeeRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [staffRows, setStaffRows] = useState<HrStaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [attendanceLogEdit, setAttendanceLogEdit] = useState<AttendanceLogDraft | null>(null);
  const [additionsModal, setAdditionsModal] = useState<{
    record: PayrollRecord;
    draft: PayrollAdditionsDraft;
    commissionRate: number;
    overtimeMinutes: number;
    overtimePercent: number;
  } | null>(null);
  const [deductionsModal, setDeductionsModal] = useState<{
    record: PayrollRecord;
    breakdown: pharmacyService.AttendanceDeductionBreakdown;
  } | null>(null);

  const monthDefault = useMemo(() => monthBounds(), []);
  const [periodStart, setPeriodStart] = useState(monthDefault.start);
  const [periodEnd, setPeriodEnd] = useState(monthDefault.end);
  const [payrollConfig, setPayrollConfig] = useState<pharmacyService.PayrollSettingsValues>(() => ({
    ...pharmacyService.PAYROLL_DEFAULTS,
    workShifts: pharmacyService.PAYROLL_DEFAULTS.workShifts.map((item) => ({
      ...item,
      breaks: item.breaks.map((br) => ({ ...br })),
    })),
    workBreaks: [],
  }));
  const payrollConfigRef = useRef(payrollConfig);
  payrollConfigRef.current = payrollConfig;

  const canManage = hasRole(["pharmacy_admin", "super_admin", "accountant"]);
  const canEditAttendanceLog = hasRole(["pharmacy_admin", "super_admin"]);
  const activeEmployees = useMemo(
    () => staffRows.filter((row) => row.name),
    [staffRows]
  );

  const loadStaff = useCallback(async () => {
    try {
      const [employees, accounts] = await Promise.all([
        pharmacyService.getEmployees(),
        pharmacyId ? pharmacyService.getSystemUsers(pharmacyId) : Promise.resolve([] as SystemUser[]),
      ]);
      const accountByEmployee = new Map<string, SystemUser>();
      accounts.forEach((acc) => {
        if (acc.employeeId) accountByEmployee.set(acc.employeeId, acc);
      });
      const rows: HrStaffRow[] = employees
        .filter((e: Employee) => e.isActive)
        .map((emp: Employee) => {
          const linked = accountByEmployee.get(emp.id);
          return {
            employeeId: emp.id,
            name: emp.name,
            attendanceKey: linked?.uid || emp.id,
            salary: emp.salary,
            requiredWorkHours: emp.requiredWorkHours ?? 8,
            commissionRate: emp.commissionRate ?? 0,
            assignedShiftId: (emp.assignedShiftId as ShiftId) || payrollConfigRef.current.defaultShiftId || "A",
            useCustomWorkSchedule: Boolean(emp.useCustomWorkSchedule),
            workDayStart: emp.workDayStart,
            workDayEnd: emp.workDayEnd,
            workBreaks: emp.workBreaks,
          };
        });
      setStaffRows(rows);
    } catch (err) {
      console.error(err);
      setStaffRows([]);
    }
  }, [pharmacyId]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadStaff();
      const { start, end } = monthBoundsFromDate(monthAnchorDate(attendanceMonth));
      const rows = await pharmacyService.getAttendanceRecords(start, end);
      setAttendanceRecords(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [attendanceMonth, loadStaff]);

  const loadEmployeeRequests = useCallback(async () => {
    try {
      const pending = await pharmacyService.getEmployeeRequests({ status: "pending" });
      const { start, end } = monthBoundsFromDate(monthAnchorDate(attendanceMonth));
      const monthRows = await pharmacyService.getEmployeeRequests({ fromDate: start, toDate: end });
      const byId = new Map<number, EmployeeRequest>();
      for (const row of [...pending, ...monthRows]) {
        byId.set(row.id, row);
      }
      setEmployeeRequests(
        [...byId.values()].sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        )
      );
    } catch {
      setEmployeeRequests([]);
    }
  }, [attendanceMonth]);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadStaff();
      const [employees, accounts] = await Promise.all([
        pharmacyService.getEmployees(),
        pharmacyId ? pharmacyService.getSystemUsers(pharmacyId) : Promise.resolve([] as SystemUser[]),
      ]);
      const accountByEmployee = new Map<string, SystemUser>();
      accounts.forEach((acc) => {
        if (acc.employeeId) accountByEmployee.set(acc.employeeId, acc);
      });
      const payrollStaff = employees
        .filter((e: Employee) => e.isActive)
        .map((emp: Employee) => {
          const linked = accountByEmployee.get(emp.id);
          return {
            uid: linked?.uid || emp.id,
            name: emp.name,
            salary: emp.salary,
            isActive: true,
          };
        });

      const config = payrollConfigRef.current;
      const rows =
        payrollStaff.length > 0
          ? await pharmacyService.generatePayroll(periodStart, periodEnd, payrollStaff, {
              sickDeductionPercent: config.sickDeductionPercent,
              absentDeductionPercent: config.absentDeductionPercent,
              maxLeaveDays: config.maxLeaveDays,
              standardWorkHours: config.standardWorkHours,
              overtimePercent: config.overtimePercent,
              defaultTaxes: config.defaultTaxes,
              defaultInsurance: config.defaultInsurance,
              workShifts: config.workShifts,
              defaultShiftId: config.defaultShiftId,
            })
          : await pharmacyService.getPayrollRecords(periodStart, periodEnd);
      setPayrollRecords(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd, loadStaff, pharmacyId]);

  useEffect(() => {
    if (activeTab === "attendance") {
      void loadAttendance();
      void loadEmployeeRequests();
    } else if (activeTab === "requests") {
      void loadEmployeeRequests();
    } else {
      void loadPayroll();
    }
  }, [activeTab, loadAttendance, loadPayroll, loadEmployeeRequests]);

  useEffect(() => {
    if (!pharmacyId) return;
    void pharmacyService.loadPayrollSettings(pharmacyId).then(setPayrollConfig);
  }, [pharmacyId, activeTab]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleCheckIn(userId: string, userName: string, workDate = todayIso) {
    setBusyAction(`in-${userId}`);
    try {
      const staff = staffRows.find((row) => row.attendanceKey === userId);
      const schedule = staff
        ? resolveWorkSchedule(staff, payrollConfig.workShifts, payrollConfig.defaultShiftId)
        : null;
      const graceMinutes = schedule
        ? resolveAllowedLateMinutes(schedule.shiftId, payrollConfig.workShifts)
        : undefined;
      await pharmacyService.recordCheckIn(userId, userName, workDate, {
        expectedSchedule: schedule ?? undefined,
        shiftId: schedule?.shiftId,
        graceMinutes,
      });
      await loadAttendance();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      alert(
        code === "already_checked_in"
          ? isArabic
            ? "تم تسجيل الحضور مسبقاً"
            : "Already checked in"
          : isArabic
          ? "تعذر تسجيل الحضور"
          : "Could not check in"
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleCheckOut(userId: string, userName: string, workDate = todayIso) {
    setBusyAction(`out-${userId}`);
    try {
      await pharmacyService.recordCheckOut(userId, userName, workDate);
      await loadAttendance();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      alert(
        code === "check_in_required"
          ? isArabic
            ? "سجّل الحضور أولاً"
            : "Check in first"
          : code === "already_checked_out"
          ? isArabic
            ? "تم تسجيل الانصراف مسبقاً"
            : "Already checked out"
          : isArabic
          ? "تعذر تسجيل الانصراف"
          : "Could not check out"
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSetStatus(
    userId: string,
    userName: string,
    status: AttendanceStatus,
    workDate = todayIso
  ) {
    setBusyAction(`status-${userId}`);
    try {
      await pharmacyService.setAttendanceStatus(userId, userName, workDate, status);
      await loadAttendance();
    } catch {
      alert(isArabic ? "تعذر تحديث الحالة" : "Could not update status");
    } finally {
      setBusyAction("");
    }
  }

  async function editBaseSalary(record: PayrollRecord) {
    if (!canManage || !record.id || record.status !== "draft") return;

    const input = window.prompt(
      isArabic
        ? `الراتب الأساسي لـ ${record.userName} (${currency}):`
        : `Base salary for ${record.userName} (${currency}):`,
      String(record.baseSalary)
    );
    if (input == null) return;

    const newSalary = Number(input);
    if (!Number.isFinite(newSalary) || newSalary < 0) {
      alert(isArabic ? "قيمة غير صالحة" : "Invalid value");
      return;
    }
    if (newSalary === record.baseSalary) return;

    const confirmed = window.confirm(
      isArabic
        ? `تأكيد تغيير الراتب الأساسي من ${formatMoney(record.baseSalary)} إلى ${formatMoney(newSalary)} ${currency}؟`
        : `Change base salary from ${formatMoney(record.baseSalary)} to ${formatMoney(newSalary)} ${currency}?`
    );
    if (!confirmed) return;

    setBusyAction(`base-salary-${record.id}`);
    try {
      const staff = staffByAttendanceKey.get(record.userId);
      if (staff?.employeeId) {
        await pharmacyService.updateEmployee(staff.employeeId, { salary: newSalary });
      }

      const breakdown = pharmacyService.computeAttendanceDeductionBreakdown(
        {
          baseSalary: newSalary,
          absentDays: record.absentDays,
          sickDays: record.sickDays,
          leaveDays: record.leaveDays,
        },
        {
          absentPct: payrollConfig.absentDeductionPercent,
          sickPct: payrollConfig.sickDeductionPercent,
        }
      );
      const calculatedSalary = pharmacyService.computeEarnedSalary(
        newSalary,
        record.workMinutes ?? 0,
        staff?.requiredWorkHours ?? 8
      );
      const merged: PayrollRecord = {
        ...record,
        baseSalary: newSalary,
        calculatedSalary,
        deductions: breakdown.attendanceTotal,
      };
      const netPay = pharmacyService.computePayrollNet(merged);

      await pharmacyService.updatePayrollRecord(record.id, {
        baseSalary: newSalary,
        calculatedSalary,
        deductions: breakdown.attendanceTotal,
        netPay,
      });
      await loadStaff();
      await loadPayroll();
    } catch {
      alert(isArabic ? "تعذر تحديث الراتب الأساسي" : "Could not update base salary");
    } finally {
      setBusyAction("");
    }
  }

  const staffByAttendanceKey = useMemo(() => {
    const map = new Map<string, HrStaffRow>();
    staffRows.forEach((row) => map.set(row.attendanceKey, row));
    return map;
  }, [staffRows]);

  function findStaffForPayrollRecord(record: PayrollRecord) {
    return (
      staffByAttendanceKey.get(record.userId) ||
      staffRows.find((row) => row.employeeId === record.userId)
    );
  }

  async function resolvePayrollOvertimeIncentives(record: PayrollRecord) {
    const staff = findStaffForPayrollRecord(record);
    const config = payrollConfigRef.current;
    if (!staff || !record.periodStart || !record.periodEnd) {
      return {
        incentives: record.incentives ?? 0,
        overtimeMinutes: 0,
        overtimePercent: config.overtimePercent,
      };
    }

    const attendance = await pharmacyService.getAttendanceRecords(record.periodStart, record.periodEnd);
    const empAttendance = pharmacyService.filterAttendanceForEmployee(
      attendance,
      record.userId,
      staff.employeeId
    );
    const schedule = resolveWorkSchedule(staff, config.workShifts, config.defaultShiftId);
    const requiredWorkHours =
      computeWorkHoursFromSchedule(schedule) ||
      staff.requiredWorkHours ||
      config.standardWorkHours ||
      8;
    const overtime = pharmacyService.computeEmployeeOvertimeIncentives(
      record.baseSalary,
      empAttendance,
      requiredWorkHours,
      config.overtimePercent
    );

    return {
      incentives: overtime.overtimePay,
      overtimeMinutes: overtime.overtimeMinutes,
      overtimePercent: config.overtimePercent,
    };
  }

  async function openAdditionsModal(record: PayrollRecord) {
    const staff = findStaffForPayrollRecord(record);
    setBusyAction(`additions-open-${record.userId}`);
    try {
      const overtime = await resolvePayrollOvertimeIncentives(record);
      if (record.id && overtime.incentives !== (record.incentives ?? 0)) {
        const merged = { ...record, incentives: overtime.incentives };
        const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
          merged,
          payrollConfigRef.current.defaultTaxes,
          payrollConfigRef.current.defaultInsurance
        );
        const netPay = pharmacyService.computePayrollNet({ ...merged, taxes, insurance });
        await pharmacyService.updatePayrollRecord(record.id, {
          incentives: overtime.incentives,
          taxes,
          insurance,
          netPay,
        });
      }
      setPayrollRecords((prev) =>
        prev.map((row) => {
          const sameRow =
            (record.id && row.id === record.id) ||
            row.userId === record.userId ||
            (staff ? row.userId === staff.employeeId || row.userId === staff.attendanceKey : false);
          if (!sameRow) return row;
          const next = { ...row, incentives: overtime.incentives };
          const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
            next,
            payrollConfigRef.current.defaultTaxes,
            payrollConfigRef.current.defaultInsurance
          );
          return { ...next, taxes, insurance, netPay: pharmacyService.computePayrollNet({ ...next, taxes, insurance }) };
        })
      );
      setAdditionsModal({
        record,
        draft: {
          specialAllowances: record.specialAllowances ?? 0,
          bonuses: record.bonuses ?? 0,
          incentives: overtime.incentives,
          commission: record.commission ?? 0,
        },
        commissionRate: staff?.commissionRate ?? 0,
        overtimeMinutes: overtime.overtimeMinutes,
        overtimePercent: overtime.overtimePercent,
      });
    } finally {
      setBusyAction("");
    }
  }

  async function savePayrollAdditions() {
    if (!additionsModal?.record.id) return;
    setBusyAction("additions");
    try {
      const { record, draft } = additionsModal;
      const overtime = await resolvePayrollOvertimeIncentives(record);
      const payload = { ...draft, incentives: overtime.incentives };
      const merged = { ...record, ...payload };
      const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
        merged,
        payrollConfigRef.current.defaultTaxes,
        payrollConfigRef.current.defaultInsurance
      );
      const mergedWithTax = { ...merged, taxes, insurance };
      const netPay = pharmacyService.computePayrollNet(mergedWithTax);
      await pharmacyService.updatePayrollRecord(record.id, {
        ...payload,
        taxes,
        insurance,
        netPay,
      });
      setAdditionsModal(null);
      await loadPayroll();
    } finally {
      setBusyAction("");
    }
  }

  function openDeductionsModal(record: PayrollRecord) {
    const breakdown = pharmacyService.computeAttendanceDeductionBreakdown(record, {
      absentPct: payrollConfig.absentDeductionPercent,
      sickPct: payrollConfig.sickDeductionPercent,
    });
    setDeductionsModal({ record, breakdown });
  }

  function beginAttendanceLogEdit(workDate: string, emp: HrStaffRow, record?: AttendanceRecord) {
    const plannedSchedule = resolveWorkSchedule(
      emp,
      payrollConfig.workShifts,
      payrollConfig.defaultShiftId
    );
    setAttendanceLogEdit({
      userId: emp.attendanceKey,
      userName: emp.name,
      workDate,
      status: record?.status ?? "",
      checkInTime: isoToTimeInput(record?.checkIn),
      checkOutTime: isoToTimeInput(record?.checkOut),
      actualShiftId: record?.shiftId || plannedSchedule.shiftId,
      recordId: record?.id,
    });
  }

  async function updateActualShiftOnly(
    emp: HrStaffRow,
    workDate: string,
    record: AttendanceRecord | undefined,
    actualShiftId: ShiftId,
    plannedShiftId: ShiftId
  ) {
    if (!record && actualShiftId === plannedShiftId) return;

    setBusyAction(`shift-${emp.attendanceKey}-${workDate}`);
    try {
      if (!record) {
        await pharmacyService.upsertAttendanceRecord({
          userId: emp.attendanceKey,
          userName: emp.name,
          workDate,
          shiftId: actualShiftId,
          status: "absent",
        });
      } else if (
        isShiftOnlyPresetRecord(record) &&
        actualShiftId === plannedShiftId
      ) {
        await pharmacyService.deleteAttendanceRecord(record.id);
      } else {
        await pharmacyService.upsertAttendanceRecord({
          id: record.id,
          userId: emp.attendanceKey,
          userName: emp.name,
          workDate,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          shiftId: actualShiftId,
        });
      }
      await loadAttendance();
    } catch {
      alert(isArabic ? "تعذر تحديث الشيفت الفعلي" : "Could not update actual shift");
    } finally {
      setBusyAction("");
    }
  }

  async function setEarlyLeaveOutcome(
    emp: HrStaffRow,
    workDate: string,
    record: AttendanceRecord,
    outcome: EarlyLeaveOutcome
  ) {
    setBusyAction(`early-${emp.attendanceKey}-${workDate}`);
    try {
      await pharmacyService.upsertAttendanceRecord({
        id: record.id,
        userId: emp.attendanceKey,
        userName: emp.name,
        workDate,
        status: record.status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        shiftId: record.shiftId,
        earlyLeaveOutcome: outcome,
      });
      await loadAttendance();
    } catch {
      alert(isArabic ? "تعذر حفظ قرار الانصراف المبكر" : "Could not save early leave decision");
    } finally {
      setBusyAction("");
    }
  }

  async function saveAttendanceLogEdit() {
    if (!attendanceLogEdit) return;
    const { userId, userName, workDate, status, checkInTime, checkOutTime, actualShiftId, recordId } =
      attendanceLogEdit;
    setBusyAction(`attendance-log-${userId}-${workDate}`);
    try {
      if (!status) {
        if (recordId) {
          await pharmacyService.deleteAttendanceRecord(recordId);
        }
      } else {
        const clearsTimes = statusClearsTimes(status);
        const checkIn = clearsTimes
          ? undefined
          : pharmacyService.buildAttendanceCheckInIso(workDate, checkInTime);
        const checkOut = clearsTimes
          ? undefined
          : pharmacyService.buildAttendanceCheckOutIso(workDate, checkInTime, checkOutTime);
        const actualSchedule = resolveScheduleForShiftId(
          actualShiftId,
          payrollConfig.workShifts,
          payrollConfig.defaultShiftId
        );
        let finalStatus = status;
        if (checkIn && (status === "present" || status === "late")) {
          const graceMinutes = resolveAllowedLateMinutes(
            actualSchedule.shiftId,
            payrollConfig.workShifts
          );
          finalStatus = isCheckInLate(checkIn, actualSchedule, graceMinutes) ? "late" : "present";
        }
        await pharmacyService.upsertAttendanceRecord({
          id: recordId,
          userId,
          userName,
          workDate,
          status: finalStatus,
          checkIn,
          checkOut,
          shiftId: actualSchedule.shiftId,
        });
      }
      await loadAttendance();
      setAttendanceLogEdit(null);
    } catch {
      alert(isArabic ? "تعذر حفظ سجل الحضور" : "Could not save attendance record");
    } finally {
      setBusyAction("");
    }
  }

  const attendanceMonthBounds = useMemo(
    () => monthBoundsFromDate(monthAnchorDate(attendanceMonth)),
    [attendanceMonth]
  );

  const filteredAttendanceEmployees = useMemo(() => {
    if (!attendanceEmployeeFilter) return activeEmployees;
    return activeEmployees.filter((emp) => emp.attendanceKey === attendanceEmployeeFilter);
  }, [activeEmployees, attendanceEmployeeFilter]);

  const attendanceTableRows = useMemo(() => {
    const { start, end } = attendanceMonthBounds;
    if (!start || !end) return [];
    const days = listDaysInMonth(start, end);
    const recordByKey = new Map(
      attendanceRecords.map((record) => [`${record.userId}:${record.workDate}`, record])
    );
    const rows: { emp: HrStaffRow; workDate: string; record?: AttendanceRecord }[] = [];
    for (const emp of filteredAttendanceEmployees) {
      for (const workDate of days) {
        rows.push({
          emp,
          workDate,
          record: recordByKey.get(`${emp.attendanceKey}:${workDate}`),
        });
      }
    }
    return rows.sort(
      (a, b) => a.workDate.localeCompare(b.workDate) || a.emp.name.localeCompare(b.emp.name)
    );
  }, [attendanceMonthBounds, attendanceRecords, filteredAttendanceEmployees]);

  const attendanceHoursSummary = useMemo(() => {
    const keys = new Set(
      attendanceTableRows.map(({ emp, workDate }) => `${emp.attendanceKey}:${workDate}`)
    );
    const filteredRecords = attendanceRecords.filter((r) => keys.has(`${r.userId}:${r.workDate}`));
    const recordsByUser = new Map<string, AttendanceRecord[]>();

    for (const record of filteredRecords) {
      const list = recordsByUser.get(record.userId) || [];
      list.push(record);
      recordsByUser.set(record.userId, list);
    }

    let regularMinutes = 0;
    let overtimeMinutes = 0;
    let lateCount = 0;
    let permissionCount = 0;
    let earlyLeaveDeductionCount = 0;

    for (const { emp, workDate, record } of attendanceTableRows) {
      if (!record || !isAttendanceWorkDay(record)) continue;

      const plannedSchedule = resolveWorkSchedule(
        emp,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId
      );
      const actualSchedule = resolveScheduleForShiftId(
        record.shiftId || plannedSchedule.shiftId,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId
      );
      const graceMinutes = resolveAllowedLateMinutes(
        actualSchedule.shiftId,
        payrollConfig.workShifts
      );
      const hasApprovedPermission = pharmacyService.hasApprovedPermissionForDate(
        employeeRequests,
        emp.attendanceKey,
        emp.employeeId,
        workDate
      );
      const approvedEarlyLeave = isEarlyLeaveApproved(
        record.earlyLeaveOutcome,
        hasApprovedPermission
      );
      const rawEarlyLeave = evaluateAttendanceTiming(
        workDate,
        record.checkIn,
        record.checkOut,
        actualSchedule,
        graceMinutes,
        { approvedEarlyLeave: false }
      ).isEarlyLeave;
      const timing = evaluateAttendanceTiming(
        workDate,
        record.checkIn,
        record.checkOut,
        actualSchedule,
        graceMinutes,
        { approvedEarlyLeave }
      );
      if (timing.isLate) lateCount += 1;
      if (rawEarlyLeave) {
        if (record.earlyLeaveOutcome === "deduction") {
          earlyLeaveDeductionCount += 1;
        } else {
          permissionCount += 1;
        }
      }
    }

    for (const emp of filteredAttendanceEmployees) {
      const empRecords = recordsByUser.get(emp.attendanceKey) || [];
      if (empRecords.length === 0) continue;

      const schedule = resolveWorkSchedule(
        emp,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId
      );
      const standardHoursPerDay =
        computeWorkHoursFromSchedule(schedule) ||
        emp.requiredWorkHours ||
        payrollConfig.standardWorkHours ||
        8;

      const split = pharmacyService.splitRegularAndOvertimeMinutes(
        empRecords,
        standardHoursPerDay
      );
      regularMinutes += split.regularMinutes;
      overtimeMinutes += split.overtimeMinutes;
    }

    return { regularMinutes, overtimeMinutes, lateCount, permissionCount, earlyLeaveDeductionCount };
  }, [
    attendanceTableRows,
    attendanceRecords,
    filteredAttendanceEmployees,
    payrollConfig.workShifts,
    payrollConfig.defaultShiftId,
    payrollConfig.standardWorkHours,
    employeeRequests,
  ]);

  const showEmployeeColumn = !attendanceEmployeeFilter;
  const showAttendanceActions = canManage || canEditAttendanceLog;

  const attendanceTableColSpan =
    7 + (showEmployeeColumn ? 1 : 0) + (showAttendanceActions ? 1 : 0);

  const tabs: { id: HrTab; ar: string; en: string }[] = [
    { id: "attendance", ar: "الحضور والانصراف", en: "Attendance" },
    { id: "requests", ar: "طلبات الموظفين", en: "Employee requests" },
    { id: "payroll", ar: "حساب المرتبات", en: "Payroll" },
  ];

  const payrollRows = useMemo(() => {
    const recordByUser = new Map<string, PayrollRecord>();
    for (const record of payrollRecords) {
      recordByUser.set(record.userId, record);
    }
    const workingDays = countPeriodDays(periodStart, periodEnd);
    return activeEmployees.map((emp) => {
      const existing =
        recordByUser.get(emp.attendanceKey) || recordByUser.get(emp.employeeId);
      if (existing) return existing;
      return {
        id: 0,
        userId: emp.attendanceKey,
        userName: emp.name,
        periodStart,
        periodEnd,
        workingDays,
        presentDays: 0,
        absentDays: 0,
        sickDays: 0,
        leaveDays: 0,
        workMinutes: 0,
        baseSalary: emp.salary,
        calculatedSalary: 0,
        specialAllowances: 0,
        bonuses: 0,
        incentives: 0,
        commission: 0,
        deductions: 0,
        taxes: 0,
        insurance: 0,
        netPay: 0,
        status: "draft" as const,
      } satisfies PayrollRecord;
    });
  }, [activeEmployees, payrollRecords, periodStart, periodEnd]);

  const totalNetPay = payrollRows.reduce((sum, r) => sum + (r.netPay || 0), 0);

  function renderAttendanceDeductionLine(
    labelAr: string,
    labelEn: string,
    days: number,
    amount: number,
    percent: number
  ) {
    const dayWord = isArabic ? (days === 1 ? "يوم" : "أيام") : days === 1 ? "day" : "days";
    return (
      <div className="hrDeductionLine">
        <span>
          {isArabic ? labelAr : labelEn}: <strong>{days}</strong> {dayWord}
        </span>
        <span>
          = {formatMoney(amount)} {currency}
          <small>
            {" "}
            ({isArabic ? "خصم" : "deduct"} {percent}%)
          </small>
        </span>
      </div>
    );
  }

  async function reviewRequest(
    request: EmployeeRequest,
    status: "approved" | "rejected",
    reviewNote = ""
  ) {
    if (!appUser) return;
    setBusyAction(`request-${request.id}`);
    try {
      await pharmacyService.reviewEmployeeRequest(
        request.id,
        status,
        { uid: appUser.uid, name: appUser.name || appUser.email || appUser.uid },
        reviewNote
      );
      await loadEmployeeRequests();
      if (activeTab === "attendance") {
        await loadAttendance();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : isArabic ? "تعذر مراجعة الطلب" : "Review failed");
    } finally {
      setBusyAction("");
    }
  }

  function requestTypeLabel(type: string) {
    if (type === "leave") return isArabic ? "إجازة" : "Leave";
    if (type === "permission") return isArabic ? "إذن انصراف" : "Permission";
    return type;
  }

  function requestStatusLabel(status: string) {
    if (status === "pending") return isArabic ? "قيد المراجعة" : "Pending";
    if (status === "approved") return isArabic ? "موافق" : "Approved";
    if (status === "rejected") return isArabic ? "مرفوض" : "Rejected";
    return status;
  }

  const panelContent = (
    <>
      {error && (
        <p className="errorText" style={{ padding: "0 1rem" }}>
          {isArabic
            ? "تأكد من تنفيذ ملف SQL في Supabase (supabase/attendance-payroll.sql)"
            : "Run supabase/attendance-payroll.sql in Supabase if tables are missing"}
        </p>
      )}

      {activeTab === "attendance" && (
        <div className="settingsTabPanel">
          <div className="hrFilters hrAttendanceFilters">
            <div className="hrFiltersFields">
              <label>
                {isArabic ? "الشهر" : "Month"}
                <input
                  type="month"
                  className="tableInput hrMonthInput"
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(e.target.value)}
                />
              </label>
              <label>
                {isArabic ? "الموظف" : "Employee"}
                <select
                  className="tableInput"
                  value={attendanceEmployeeFilter}
                  onChange={(e) => setAttendanceEmployeeFilter(e.target.value)}
                >
                  <option value="">{isArabic ? "كل الموظفين" : "All employees"}</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.attendanceKey}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="hrAttendanceHoursStats">
              <span className="hrAttendanceHoursStat">
                <strong>{isArabic ? "الساعات الأساسية:" : "Regular hours:"}</strong>{" "}
                {formatTotalWorked(attendanceHoursSummary.regularMinutes, isArabic)}
              </span>
              <span className="hrAttendanceHoursStat hrAttendanceHoursStatOvertime">
                <strong>{isArabic ? "الساعات الإضافية:" : "Overtime hours:"}</strong>{" "}
                {formatTotalWorked(attendanceHoursSummary.overtimeMinutes, isArabic)}
              </span>
              <span className="hrAttendanceHoursStat hrAttendanceHoursStatLate">
                <strong>{isArabic ? "عدد التأخيرات:" : "Late count:"}</strong>{" "}
                {attendanceHoursSummary.lateCount}
              </span>
              <span className="hrAttendanceHoursStat hrAttendanceHoursStatPermission">
                <strong>{isArabic ? "عدد الأذونات:" : "Early leave count:"}</strong>{" "}
                {attendanceHoursSummary.permissionCount}
              </span>
              <span className="hrAttendanceHoursStat hrAttendanceHoursStatDeduction">
                <strong>{isArabic ? "خصم انصراف مبكر:" : "Early leave deductions:"}</strong>{" "}
                {attendanceHoursSummary.earlyLeaveDeductionCount}
              </span>
            </div>
          </div>

          <div className="tableWrap hrAttendanceLogTableWrap">
            <table className="hrAttendanceTable">
              <thead>
                <tr>
                  <th className="col-date">{isArabic ? "التاريخ" : "Date"}</th>
                  {showEmployeeColumn && (
                    <th className="col-name">{isArabic ? "الموظف" : "Employee"}</th>
                  )}
                  <th className="col-shift">{isArabic ? "الشيفت المخطط" : "Planned shift"}</th>
                  <th className="col-shift col-shift-actual">{isArabic ? "الشيفت الفعلي" : "Actual shift"}</th>
                  <th className="col-status">{isArabic ? "الحالة" : "Status"}</th>
                  <th className="col-time">{isArabic ? "حضور" : "Check in"}</th>
                  <th className="col-time">{isArabic ? "انصراف" : "Check out"}</th>
                  <th className="col-hours">{isArabic ? "ساعات فعلية" : "Actual hours"}</th>
                  {showAttendanceActions && (
                    <th className="col-actions">{isArabic ? "إجراءات" : "Actions"}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={attendanceTableColSpan} className="empty">
                      {isArabic ? "جاري التحميل..." : "Loading..."}
                    </td>
                  </tr>
                ) : attendanceTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={attendanceTableColSpan} className="empty">
                      {isArabic ? "لا يوجد سجلات" : "No records"}
                    </td>
                  </tr>
                ) : (
                  attendanceTableRows.map(({ emp, workDate, record }) => {
                    const isEditing =
                      attendanceLogEdit?.userId === emp.attendanceKey &&
                      attendanceLogEdit?.workDate === workDate;
                    const draft = isEditing ? attendanceLogEdit : null;
                    const clearsTimes = draft ? statusClearsTimes(draft.status) : false;
                    const previewCheckIn =
                      draft && !clearsTimes && draft.checkInTime
                        ? pharmacyService.buildAttendanceCheckInIso(workDate, draft.checkInTime)
                        : record?.checkIn;
                    const previewCheckOut =
                      draft && !clearsTimes && draft.checkOutTime
                        ? pharmacyService.buildAttendanceCheckOutIso(
                            workDate,
                            draft.checkInTime,
                            draft.checkOutTime
                          )
                        : record?.checkOut;
                    const overnightPreview =
                      draft &&
                      !clearsTimes &&
                      draft.checkInTime &&
                      draft.checkOutTime &&
                      pharmacyService.isOvernightTimePair(draft.checkInTime, draft.checkOutTime);
                    const isToday = workDate === todayIso;
                    const dateCell = formatAttendanceDateCell(workDate, isArabic);
                    const plannedSchedule = resolveWorkSchedule(
                      emp,
                      payrollConfig.workShifts,
                      payrollConfig.defaultShiftId
                    );
                    const actualShiftId =
                      isEditing && draft
                        ? draft.actualShiftId
                        : record?.shiftId || plannedSchedule.shiftId;
                    const actualSchedule = resolveScheduleForShiftId(
                      actualShiftId,
                      payrollConfig.workShifts,
                      payrollConfig.defaultShiftId
                    );
                    const graceMinutes = resolveAllowedLateMinutes(
                      actualSchedule.shiftId,
                      payrollConfig.workShifts
                    );
                    const hasApprovedPermission = pharmacyService.hasApprovedPermissionForDate(
                      employeeRequests,
                      emp.attendanceKey,
                      emp.employeeId,
                      workDate
                    );
                    const approvedEarlyLeave = isEarlyLeaveApproved(
                      record?.earlyLeaveOutcome,
                      hasApprovedPermission
                    );
                    const rawEarlyLeave = evaluateAttendanceTiming(
                      workDate,
                      previewCheckIn ?? record?.checkIn,
                      previewCheckOut ?? record?.checkOut,
                      actualSchedule,
                      graceMinutes,
                      { approvedEarlyLeave: false }
                    ).isEarlyLeave;
                    const attendanceTiming = evaluateAttendanceTiming(
                      workDate,
                      previewCheckIn ?? record?.checkIn,
                      previewCheckOut ?? record?.checkOut,
                      actualSchedule,
                      graceMinutes,
                      { approvedEarlyLeave }
                    );
                    const earlyLeaveBusyKey = `early-${emp.attendanceKey}-${workDate}`;

                    return (
                      <tr
                        key={`${emp.attendanceKey}-${workDate}`}
                        className={isToday ? "hrAttendanceRowToday" : undefined}
                      >
                        <td className="col-date">
                          <span className="hrAttendanceDayCompact">
                            <strong>{dateCell.day}</strong> {dateCell.weekday}
                          </span>
                        </td>
                        {showEmployeeColumn && <td className="col-name">{emp.name}</td>}
                        <td className="col-shift">
                          <span className="hrShiftBadge hrShiftBadgePlanned">
                            {getShiftDisplayName(
                              plannedSchedule.shiftId,
                              payrollConfig.workShifts,
                              isArabic
                            )}
                          </span>
                          <small className="hrShiftWindow">
                            {plannedSchedule.dayStart}–{plannedSchedule.dayEnd}
                          </small>
                        </td>
                        <td className="col-shift col-shift-actual">
                          {isEditing && draft ? (
                            <select
                              className="tableInput hrAttendanceLogInput hrActualShiftSelect"
                              value={draft.actualShiftId}
                              onChange={(e) =>
                                setAttendanceLogEdit({
                                  ...draft,
                                  actualShiftId: e.target.value as ShiftId,
                                })
                              }
                            >
                              {SHIFT_IDS.map((shiftId) => (
                                <option key={shiftId} value={shiftId}>
                                  {getShiftDisplayName(shiftId, payrollConfig.workShifts, isArabic)}
                                </option>
                              ))}
                            </select>
                          ) : canEditAttendanceLog ? (
                            <select
                              className="tableInput hrActualShiftSelect"
                              value={actualShiftId}
                              disabled={!!busyAction}
                              onChange={(e) =>
                                void updateActualShiftOnly(
                                  emp,
                                  workDate,
                                  record,
                                  e.target.value as ShiftId,
                                  plannedSchedule.shiftId
                                )
                              }
                            >
                              {SHIFT_IDS.map((shiftId) => (
                                <option key={shiftId} value={shiftId}>
                                  {getShiftDisplayName(shiftId, payrollConfig.workShifts, isArabic)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <span className="hrShiftBadge hrShiftBadgeActual">
                                {getShiftDisplayName(
                                  actualSchedule.shiftId,
                                  payrollConfig.workShifts,
                                  isArabic
                                )}
                              </span>
                              <small className="hrShiftWindow">
                                {actualSchedule.dayStart}–{actualSchedule.dayEnd}
                              </small>
                            </>
                          )}
                        </td>
                        <td className="col-status">
                          {isEditing && draft ? (
                            <select
                              className="tableInput hrAttendanceLogInput"
                              value={draft.status}
                              onChange={(e) =>
                                setAttendanceLogEdit({
                                  ...draft,
                                  status: e.target.value as AttendanceStatus | "",
                                  checkInTime: statusClearsTimes(e.target.value as AttendanceStatus | "")
                                    ? ""
                                    : draft.checkInTime,
                                  checkOutTime: statusClearsTimes(e.target.value as AttendanceStatus | "")
                                    ? ""
                                    : draft.checkOutTime,
                                })
                              }
                            >
                              <option value="">{isArabic ? "لم يسجل" : "Not recorded"}</option>
                              <option value="present">{isArabic ? "حاضر" : "Present"}</option>
                              <option value="late">{isArabic ? "حضور (تأخير)" : "Present (late)"}</option>
                              <option value="absent">{isArabic ? "غائب" : "Absent"}</option>
                              <option value="leave">{isArabic ? "إجازة" : "Leave"}</option>
                              <option value="sick">{isArabic ? "مرضي" : "Sick leave"}</option>
                            </select>
                          ) : (
                            attendanceStatusBadge(
                              isShiftOnlyPresetRecord(record) ? undefined : record?.status,
                              isArabic,
                              isAttendanceWorkDay(record)
                                ? attendanceTiming
                                : undefined,
                              isAttendanceWorkDay(record) && rawEarlyLeave
                                ? {
                                    rawEarlyLeave: true,
                                    effectiveOutcome: resolveEarlyLeaveOutcome(
                                      record?.earlyLeaveOutcome
                                    ),
                                    canToggle: canEditAttendanceLog,
                                    resolving: busyAction === earlyLeaveBusyKey,
                                    onToggle: (outcome) => {
                                      if (record) {
                                        void setEarlyLeaveOutcome(emp, workDate, record, outcome);
                                      }
                                    },
                                  }
                                : undefined
                            )
                          )}
                        </td>
                        <td className="col-time">
                          {isEditing && draft ? (
                            <input
                              type="time"
                              className="tableInput hrAttendanceLogInput"
                              value={draft.checkInTime}
                              disabled={clearsTimes}
                              onChange={(e) =>
                                setAttendanceLogEdit({ ...draft, checkInTime: e.target.value })
                              }
                            />
                          ) : (
                            formatTime(record?.checkIn, isArabic)
                          )}
                        </td>
                        <td className="col-time">
                          {isEditing && draft ? (
                            <div className="hrAttendanceLogTimeCell">
                              <input
                                type="time"
                                className="tableInput hrAttendanceLogInput"
                                value={draft.checkOutTime}
                                disabled={clearsTimes}
                                onChange={(e) =>
                                  setAttendanceLogEdit({ ...draft, checkOutTime: e.target.value })
                                }
                              />
                              {overnightPreview && (
                                <small className="hrOvernightHint">
                                  {isArabic ? "اليوم التالي" : "Next day"}
                                </small>
                              )}
                            </div>
                          ) : (
                            formatTimeWithOvernight(
                              record?.checkOut,
                              isArabic,
                              attendanceSpansNextDay(record?.checkIn, record?.checkOut)
                            )
                          )}
                        </td>
                        <td className="col-hours">
                          {isEditing
                            ? formatActualHours(previewCheckIn, previewCheckOut, isArabic)
                            : formatActualHours(record?.checkIn, record?.checkOut, isArabic)}
                        </td>
                        {showAttendanceActions && (
                          <td className="col-actions">
                            <div className="hrAttendanceActions">
                              {isEditing && draft && canEditAttendanceLog ? (
                                <div className="hrAttendanceActionRow">
                                  <button
                                    type="button"
                                    className="completeBtn smallBtn"
                                    disabled={!!busyAction}
                                    onClick={() => void saveAttendanceLogEdit()}
                                  >
                                    {isArabic ? "حفظ" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="editBtn smallBtn"
                                    disabled={!!busyAction}
                                    onClick={() => setAttendanceLogEdit(null)}
                                  >
                                    {isArabic ? "إلغاء" : "Cancel"}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {canManage && isToday && (
                                    <div className="hrAttendanceQuickActions">
                                      <button
                                        type="button"
                                        className="smallBtn"
                                        disabled={!!busyAction || !!attendanceLogEdit}
                                        onClick={() =>
                                          void handleCheckIn(emp.attendanceKey, emp.name, workDate)
                                        }
                                      >
                                        {isArabic ? "حضور" : "In"}
                                      </button>
                                      <button
                                        type="button"
                                        className="smallBtn"
                                        disabled={!!busyAction || !!attendanceLogEdit}
                                        onClick={() =>
                                          void handleCheckOut(emp.attendanceKey, emp.name, workDate)
                                        }
                                      >
                                        {isArabic ? "انصراف" : "Out"}
                                      </button>
                                      <button
                                        type="button"
                                        className="smallBtn dangerBtn"
                                        disabled={!!busyAction || !!attendanceLogEdit}
                                        onClick={() =>
                                          void handleSetStatus(
                                            emp.attendanceKey,
                                            emp.name,
                                            "absent",
                                            workDate
                                          )
                                        }
                                      >
                                        {isArabic ? "غائب" : "Absent"}
                                      </button>
                                      <button
                                        type="button"
                                        className="smallBtn"
                                        disabled={!!busyAction || !!attendanceLogEdit}
                                        onClick={() =>
                                          void handleSetStatus(
                                            emp.attendanceKey,
                                            emp.name,
                                            "leave",
                                            workDate
                                          )
                                        }
                                      >
                                        {isArabic ? "إجازة" : "Leave"}
                                      </button>
                                      <button
                                        type="button"
                                        className="smallBtn"
                                        disabled={!!busyAction || !!attendanceLogEdit}
                                        onClick={() =>
                                          void handleSetStatus(
                                            emp.attendanceKey,
                                            emp.name,
                                            "sick",
                                            workDate
                                          )
                                        }
                                      >
                                        {isArabic ? "مرضي" : "Sick"}
                                      </button>
                                    </div>
                                  )}
                                  {canEditAttendanceLog && (
                                    <button
                                      type="button"
                                      className="smallBtn hrAttendanceEditBtn"
                                      disabled={!!busyAction || !!attendanceLogEdit}
                                      onClick={() => beginAttendanceLogEdit(workDate, emp, record)}
                                    >
                                      {isArabic ? "تعديل" : "Edit"}
                                    </button>
                                  )}
                                  {!isToday && !canEditAttendanceLog && (
                                    <span className="hrAttendanceActionsEmpty">—</span>
                                  )}
                                </>
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
          {canEditAttendanceLog && (
            <p className="returnsSectionHint">
              {isArabic
                ? "يمكن للمدير تعديل أي يوم. إذا كان الانصراف قبل الحضور (مثل 11 م → 7 ص)، يُحسب تلقائياً كوردية ليلية."
                : "Admins can edit any day. If check-out is earlier than check-in (e.g. 11 PM → 7 AM), it is treated as an overnight shift."}
            </p>
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="settingsTabPanel">
          <p className="returnsSectionHint">
            {isArabic
              ? "مراجعة طلبات الإجازة والإذن من الموظفين. الموافقة على الإجازة تُسجّل أيام «إجازة» تلقائياً."
              : "Review employee leave and permission requests. Approving leave marks those days as leave automatically."}
          </p>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>{isArabic ? "الموظف" : "Employee"}</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "التاريخ" : "Date"}</th>
                  <th>{isArabic ? "التفاصيل" : "Details"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  {canManage && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="empty">
                      {isArabic ? "جاري التحميل..." : "Loading..."}
                    </td>
                  </tr>
                ) : employeeRequests.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="empty">
                      {isArabic ? "لا توجد طلبات" : "No requests"}
                    </td>
                  </tr>
                ) : (
                  employeeRequests.map((req) => (
                    <tr key={req.id}>
                      <td>{req.employeeName}</td>
                      <td>{requestTypeLabel(req.requestType)}</td>
                      <td>
                        {req.requestType === "leave" && req.endDate && req.endDate !== req.workDate
                          ? `${req.workDate} → ${req.endDate}`
                          : req.workDate}
                      </td>
                      <td>
                        {req.requestType === "permission" && req.requestedTime
                          ? `${isArabic ? "انصراف" : "Leave at"} ${req.requestedTime}`
                          : req.reason || "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${req.status === "pending" ? "warn" : req.status === "approved" ? "ok" : "danger"}`}
                        >
                          {requestStatusLabel(req.status)}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          {req.status === "pending" ? (
                            <div className="hrRequestActions">
                              <button
                                type="button"
                                className="completeBtn smallBtn"
                                disabled={!!busyAction}
                                onClick={() => void reviewRequest(req, "approved")}
                              >
                                {isArabic ? "موافقة" : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="deleteBtn smallBtn"
                                disabled={!!busyAction}
                                onClick={() => {
                                  const note = window.prompt(
                                    isArabic ? "سبب الرفض (اختياري)" : "Rejection reason (optional)"
                                  );
                                  if (note === null) return;
                                  void reviewRequest(req, "rejected", note);
                                }}
                              >
                                {isArabic ? "رفض" : "Reject"}
                              </button>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="settingsTabPanel hrPayrollPanel">
          <div className="hrPayrollToolbar">
            <div className="hrFilters">
              <label>
                {isArabic ? "من" : "From"}
                <input
                  type="date"
                  className="tableInput"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </label>
              <label>
                {isArabic ? "إلى" : "To"}
                <input
                  type="date"
                  className="tableInput"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </label>
              <button type="button" className="printBtn" onClick={() => void loadPayroll()} disabled={loading}>
                {isArabic ? "تحديث" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="hrPayrollSummary">
            <span>
              {isArabic ? "إجمالي الصافي:" : "Total net:"}{" "}
              <strong>
                {formatMoney(totalNetPay)} {currency}
              </strong>
            </span>
          </div>

          <div className="tableWrap hrPayrollTableWrap">
            <table className="hrPayrollTable">
              <thead>
                <tr>
                  <th className="col-name">{isArabic ? "الموظف" : "Employee"}</th>
                  <th className="col-attendance">{isArabic ? "أيام الفترة" : "Period days"}</th>
                  <th className="col-attendance">{isArabic ? "ساعات العمل" : "Work hours"}</th>
                  <th className="col-attendance">{isArabic ? "حضور" : "Present"}</th>
                  <th className="col-attendance">{isArabic ? "غياب" : "Absent"}</th>
                  <th className="col-attendance">{isArabic ? "مرضي" : "Sick"}</th>
                  <th className="col-attendance">{isArabic ? "إجازات" : "Leave"}</th>
                  <th className="col-money">{isArabic ? "الأساسي" : "Base"}</th>
                  <th className="col-money">{isArabic ? "المستحق" : "Earned"}</th>
                  <th className="col-money">{isArabic ? "زيادات" : "Additions"}</th>
                  <th className="col-money">{isArabic ? "خصومات" : "Deductions"}</th>
                  <th className="col-money">{isArabic ? "الصافي" : "Net"}</th>
                </tr>
              </thead>
              <tbody>
                {payrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty">
                      {isArabic ? "لا يوجد موظفون" : "No employees"}
                    </td>
                  </tr>
                ) : (
                  payrollRows.map((rec) => (
                    <tr key={rec.userId}>
                      <td className="col-name">{rec.userName}</td>
                      <td className="col-attendance">{rec.workingDays}</td>
                      <td className="col-attendance">{formatWorkMinutes(rec.workMinutes ?? 0, isArabic)}</td>
                      <td className="col-attendance">{rec.presentDays}</td>
                      <td className="col-attendance">{rec.absentDays}</td>
                      <td className="col-attendance">{rec.sickDays ?? 0}</td>
                      <td className="col-attendance">{rec.leaveDays ?? 0}</td>
                      <td className="col-money">
                        <button
                          type="button"
                          className="hrBaseSalaryBtn"
                          disabled={!rec.id || !canManage || rec.status !== "draft"}
                          title={
                            rec.id && canManage && rec.status === "draft"
                              ? isArabic
                                ? "تعديل الراتب الأساسي"
                                : "Edit base salary"
                              : undefined
                          }
                          onClick={() => void editBaseSalary(rec)}
                        >
                          {formatMoney(rec.baseSalary)} {currency}
                        </button>
                      </td>
                      <td className="col-money">
                        {formatMoney(rec.calculatedSalary)} {currency}
                      </td>
                      <td className="col-money">
                        <button
                          type="button"
                          className="hrAdditionsBtn"
                          disabled={!rec.id}
                          title={
                            rec.id
                              ? isArabic
                                ? "عرض تفاصيل الزيادات"
                                : "View additions breakdown"
                              : undefined
                          }
                          onClick={() => void openAdditionsModal(rec)}
                        >
                          {formatMoney(pharmacyService.sumPayrollAdditions(rec))} {currency}
                        </button>
                      </td>
                      <td className="col-money">
                        <button
                          type="button"
                          className="hrDeductionsBtn"
                          disabled={!rec.id}
                          title={
                            rec.id
                              ? isArabic
                                ? "عرض تفاصيل الخصومات"
                                : "View deductions breakdown"
                              : undefined
                          }
                          onClick={() => openDeductionsModal(rec)}
                        >
                          {formatMoney(pharmacyService.sumPayrollDeductions(rec))} {currency}
                        </button>
                      </td>
                      <td className="col-money">
                        <strong className="hrPayrollNet">
                          {formatMoney(rec.netPay)} {currency}
                        </strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="returnsSectionHint hrPayrollHint">
            {isArabic
              ? "المستحق = ساعات عادية × مرتب الساعة. الإضافي (فوق ساعات العمل اليومية) يظهر في «حوافز» ضمن الزيادات."
              : "Earned = regular hours × hourly rate. Overtime (above daily work hours) appears in incentives under additions."}
          </p>
        </div>
      )}
    </>
  );


  const additionsModalView = additionsModal && (
    <div className="modalOverlay" onClick={() => setAdditionsModal(null)}>
      <div
        className="invoiceModal userModal hrAdditionsModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h3>
              {isArabic
                ? `زيادات — ${additionsModal.record.userName}`
                : `Additions — ${additionsModal.record.userName}`}
            </h3>
            {additionsModal.commissionRate > 0 && (
              <p className="returnsSectionHint">
                {isArabic ? "نسبة العمولة في ملف الموظف:" : "Employee commission rate:"}{" "}
                {additionsModal.commissionRate}%
              </p>
            )}
          </div>
          <button type="button" className="deleteSmallBtn" onClick={() => setAdditionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="hrAdditionsForm">
          <label>
            {isArabic ? "علاوات خاصة" : "Special allowances"}
            <input
              type="number"
              min={0}
              step="0.01"
              className="searchInput"
              value={additionsModal.draft.specialAllowances}
              disabled={!canManage}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setAdditionsModal({
                  ...additionsModal,
                  draft: {
                    ...additionsModal.draft,
                    specialAllowances: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                  },
                });
              }}
            />
          </label>
          <label>
            {isArabic ? "مكافآت" : "Bonuses"}
            <input
              type="number"
              min={0}
              step="0.01"
              className="searchInput"
              value={additionsModal.draft.bonuses}
              disabled={!canManage}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                setAdditionsModal({
                  ...additionsModal,
                  draft: {
                    ...additionsModal.draft,
                    bonuses: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                  },
                });
              }}
            />
          </label>
          <label>
            {isArabic ? "حوافز (إضافي)" : "Incentives (overtime)"}
            <input
              type="number"
              min={0}
              step="0.01"
              className="searchInput hrAdditionsReadonlyInput"
              value={additionsModal.draft.incentives}
              readOnly
              tabIndex={-1}
            />
            <small className="returnsSectionHint">
              {isArabic
                ? `${formatWorkMinutes(additionsModal.overtimeMinutes, true)} إضافية × ${additionsModal.overtimePercent}% من مرتب الساعة = ${formatMoney(additionsModal.draft.incentives)} ${currency}`
                : `${formatWorkMinutes(additionsModal.overtimeMinutes, false)} overtime × ${additionsModal.overtimePercent}% of hourly rate = ${formatMoney(additionsModal.draft.incentives)} ${currency}`}
            </small>
          </label>
          <label>
            {isArabic ? "عمولة" : "Commission"}
            <input
              type="number"
              min={0}
              className="searchInput"
              value={additionsModal.draft.commission}
              disabled={!canManage || additionsModal.record.status !== "draft"}
              onChange={(e) =>
                setAdditionsModal({
                  ...additionsModal,
                  draft: { ...additionsModal.draft, commission: Number(e.target.value) || 0 },
                })
              }
            />
          </label>
        </div>

        <div className="hrAdditionsTotal cardInner">
          <strong>{isArabic ? "إجمالي الزيادات:" : "Total additions:"}</strong>{" "}
          {formatMoney(
            pharmacyService.sumPayrollAdditions({
              ...additionsModal.record,
              ...additionsModal.draft,
            })
          )}{" "}
          {currency}
        </div>

        <div className="modalActions">
          {canManage && (
            <button
              type="button"
              className="completeBtn"
              disabled={!!busyAction}
              onClick={() => void savePayrollAdditions()}
            >
              {isArabic ? "حفظ" : "Save"}
            </button>
          )}
          <button type="button" className="editBtn" onClick={() => setAdditionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );

  const deductionsModalView = deductionsModal && (
    <div className="modalOverlay" onClick={() => setDeductionsModal(null)}>
      <div
        className="invoiceModal userModal hrDeductionsModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h3>
              {isArabic
                ? `خصومات — ${deductionsModal.record.userName}`
                : `Deductions — ${deductionsModal.record.userName}`}
            </h3>
            <p className="returnsSectionHint">
              {isArabic ? "اليومية = الراتب الأساسي ÷ 30" : "Daily rate = base salary ÷ 30"} (
              {formatMoney(deductionsModal.breakdown.dailyRate)} {currency})
            </p>
          </div>
          <button type="button" className="deleteSmallBtn" onClick={() => setDeductionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="hrDeductionsSection cardInner">
          <h4>{isArabic ? "خصومات الحضور" : "Attendance deductions"}</h4>
          {renderAttendanceDeductionLine(
            "غياب",
            "Absence",
            deductionsModal.breakdown.absentDays,
            deductionsModal.breakdown.absentAmount,
            payrollConfig.absentDeductionPercent
          )}
          <p className="returnsSectionHint">
            {isArabic
              ? "يشمل أي إجازة فوق الحد المسموح — تُحسب كغياب."
              : "Includes leave days above the allowed maximum, counted as absence."}
          </p>
          {renderAttendanceDeductionLine(
            "مرضي",
            "Sick leave",
            deductionsModal.breakdown.sickDays,
            deductionsModal.breakdown.sickAmount,
            payrollConfig.sickDeductionPercent
          )}
          <div className="hrDeductionLine">
            <span>
              {isArabic ? "إجازات (ضمن الحد):" : "Leave (within limit):"}{" "}
              <strong>{deductionsModal.breakdown.leaveDays}</strong>{" "}
              {isArabic
                ? deductionsModal.breakdown.leaveDays === 1
                  ? "يوم"
                  : "أيام"
                : deductionsModal.breakdown.leaveDays === 1
                ? "day"
                : "days"}
            </span>
            <span>
              = {formatMoney(0)} {currency}
              <small> ({isArabic ? "بدون خصم" : "no deduction"})</small>
            </span>
          </div>
          <div className="hrDeductionSubtotal">
            <strong>{isArabic ? "إجمالي خصومات الحضور:" : "Attendance total:"}</strong>{" "}
            {formatMoney(deductionsModal.breakdown.attendanceTotal)} {currency}
          </div>
        </div>

        <div className="hrDeductionsSection cardInner">
          <h4>{isArabic ? "ضرائب وتأمينات" : "Taxes & insurance"}</h4>
          <div className="hrDeductionLine">
            <span>{isArabic ? "ضرائب" : "Taxes"}</span>
            <span>
              {formatMoney(deductionsModal.record.taxes ?? 0)} {currency}
              <small>
                {" "}
                ({payrollConfig.defaultTaxes}% {isArabic ? "من المستحق + الزيادات" : "of earned + additions"})
              </small>
            </span>
          </div>
          <div className="hrDeductionLine">
            <span>{isArabic ? "تأمينات" : "Insurance"}</span>
            <span>
              {formatMoney(deductionsModal.record.insurance ?? 0)} {currency}
              <small>
                {" "}
                ({payrollConfig.defaultInsurance}% {isArabic ? "من المستحق + الزيادات" : "of earned + additions"})
              </small>
            </span>
          </div>
          <p className="returnsSectionHint">
            {isArabic
              ? "تُعدّل النسب من الإعدادات ← إعدادات المرتبات."
              : "Percentages are configured in Settings → Payroll."}
          </p>
        </div>

        <div className="hrDeductionsTotal cardInner">
          <strong>{isArabic ? "إجمالي الخصومات:" : "Total deductions:"}</strong>{" "}
          {formatMoney(pharmacyService.sumPayrollDeductions(deductionsModal.record))}{" "}
          {currency}
        </div>

        <div className="modalActions">
          <button type="button" className="editBtn" onClick={() => setDeductionsModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {panelContent}
        {additionsModalView}
        {deductionsModalView}
      </>
    );
  }

  return (
    <>
    <section className="card settingsPage hrPage">
      <div className="cardHeader">
        <div>
          <h2>{isArabic ? "الموظفين والمرتبات" : "Employees & Payroll"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "تسجيل حضور وانصراف الموظفين وحساب المرتبات الشهرية"
              : "Track attendance and calculate monthly payroll"}
          </p>
        </div>
      </div>

      <nav className="settingsTabsNav" aria-label={isArabic ? "أقسام الموظفين" : "HR sections"}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settingsTabBtn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setInternalTab(tab.id)}
          >
            {isArabic ? tab.ar : tab.en}
          </button>
        ))}
      </nav>

      {panelContent}
    </section>
    {additionsModalView}
    {deductionsModalView}
  </>
  );
}
