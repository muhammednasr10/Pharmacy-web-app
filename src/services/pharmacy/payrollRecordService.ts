import { supabase } from "../supabaseClient";
import type { AppUser, Employee, PayrollRecord, PharmacyShift, ShiftId } from "../../types";
import {
  computeWorkHoursFromSchedule,
  resolveWorkSchedule,
} from "../../utils/workSchedule";
import {
  computeCashierCommissionFromInvoices,
  currentMonthPeriodBounds,
} from "../../utils/cashierCommission";
import { toCamelCase, toSnakeCase } from "./mappers";
import { applyPharmacyScopeFilter, resolveStampPharmacyId, stampPharmacy } from "./scope";
import { getInvoicesForPeriod } from "./salesService";
import {
  applyMaxLeavePolicy,
  computeAttendanceDeductionBreakdown,
  computePayrollEarnedFromAttendance,
  computePayrollNet,
  computeTaxInsuranceFromPercent,
  filterAttendanceForEmployee,
} from "./payrollCompute";
import { loadPayrollSettings, PAYROLL_DEFAULTS } from "./payrollSettingsService";
import { getAttendanceRecords } from "./attendanceService";
import { getEmployeeProfiles, getEmployees } from "./employeeService";
import { resolveLinkedEmployeeForAppUser } from "./employeeLinkService";

function countDaysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

export async function getPayrollRecords(
  periodStart: string,
  periodEnd: string,
  pharmacyIds?: string[],
): Promise<PayrollRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("payroll_records").select("*"), pharmacyIds)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .order("user_name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("getPayrollRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PayrollRecord>(row));
}

export async function upsertPayrollRecord(
  record: Partial<PayrollRecord> & { userId: string; periodStart: string; periodEnd: string },
) {
  const calculatedSalary = Number(record.calculatedSalary ?? 0);
  const bonuses = Number(record.bonuses ?? 0);
  const deductions = Number(record.deductions ?? 0);
  const netPay = Number(record.netPay ?? computePayrollNet(record));
  const id = record.id ?? Date.now();

  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      calculatedSalary,
      bonuses,
      deductions,
      netPay,
      updatedAt: new Date().toISOString(),
    }),
  );

  const { error } = await supabase.from("payroll_records").upsert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePayrollRecord(id: number, updates: Partial<PayrollRecord>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  if (updates.netPay === undefined) {
    const financialKeys: (keyof PayrollRecord)[] = [
      "calculatedSalary",
      "specialAllowances",
      "bonuses",
      "incentives",
      "commission",
      "deductions",
      "taxes",
      "insurance",
    ];
    if (financialKeys.some((key) => updates[key] !== undefined)) {
      payload.net_pay = computePayrollNet(updates as Partial<PayrollRecord>);
    }
  }
  const { error } = await supabase.from("payroll_records").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function generatePayroll(
  periodStart: string,
  periodEnd: string,
  employees: Array<{ uid: string; name: string; isActive?: boolean; salary?: number }>,
  options: {
    sickDeductionPercent?: number;
    absentDeductionPercent?: number;
    maxLeaveDays?: number;
    standardWorkHours?: number;
    overtimePercent?: number;
    defaultTaxes?: number;
    defaultInsurance?: number;
    workShifts?: PharmacyShift[];
    defaultShiftId?: ShiftId;
  } = {},
): Promise<PayrollRecord[]> {
  const dbEmployees = await getEmployees();
  const profiles = await getEmployeeProfiles();
  const attendance = await getAttendanceRecords(periodStart, periodEnd);
  const existingPayroll = await getPayrollRecords(periodStart, periodEnd);
  const periodInvoices = await getInvoicesForPeriod(periodStart, periodEnd);
  const workingDays = countDaysInclusive(periodStart, periodEnd);
  const sickPct = Number(options.sickDeductionPercent ?? 25);
  const absentPct = Number(options.absentDeductionPercent ?? 100);
  const maxLeaveDays = Math.max(
    0,
    Math.floor(Number(options.maxLeaveDays ?? PAYROLL_DEFAULTS.maxLeaveDays)),
  );
  const standardWorkHours = Math.max(
    0,
    Number(options.standardWorkHours ?? PAYROLL_DEFAULTS.standardWorkHours),
  );
  const overtimePercent = Math.max(
    0,
    Number(options.overtimePercent ?? PAYROLL_DEFAULTS.overtimePercent),
  );
  const defaultTaxesPercent = Math.min(
    100,
    Math.max(0, Number(options.defaultTaxes ?? PAYROLL_DEFAULTS.defaultTaxes)),
  );
  const defaultInsurancePercent = Math.min(
    100,
    Math.max(0, Number(options.defaultInsurance ?? PAYROLL_DEFAULTS.defaultInsurance)),
  );
  const results: PayrollRecord[] = [];

  for (const emp of employees.filter((e) => e.isActive !== false)) {
    const dbEmployee =
      dbEmployees.find((e) => e.id === emp.uid) || dbEmployees.find((e) => e.name === emp.name);
    const existing = existingPayroll.find(
      (p) => p.userId === emp.uid || (dbEmployee ? p.userId === dbEmployee.id : false),
    );
    if (existing && existing.status === "paid") {
      results.push(existing);
      continue;
    }

    const profile = profiles.find((p) => p.userId === emp.uid);
    const baseSalary = Number(emp.salary ?? dbEmployee?.salary ?? profile?.baseSalary ?? 0);
    const empAttendance = filterAttendanceForEmployee(attendance, emp.uid, dbEmployee?.id);
    const presentDays = empAttendance.filter(
      (a) =>
        a.status === "present" ||
        a.status === "late" ||
        (a.checkIn && a.status !== "absent" && a.status !== "leave" && a.status !== "sick"),
    ).length;
    const sickDays = empAttendance.filter((a) => a.status === "sick").length;
    const rawAbsentDays = empAttendance.filter((a) => a.status === "absent").length;
    const rawLeaveDays = empAttendance.filter((a) => a.status === "leave").length;
    const leavePolicy = applyMaxLeavePolicy(rawLeaveDays, rawAbsentDays, maxLeaveDays);
    const absentDays = leavePolicy.absentDays;
    const leaveDays = leavePolicy.leaveDays;
    const requiredWorkHours = dbEmployee
      ? Math.max(
          1,
          computeWorkHoursFromSchedule(
            resolveWorkSchedule(
              dbEmployee,
              options.workShifts || PAYROLL_DEFAULTS.workShifts,
              options.defaultShiftId || "A",
            ),
          ) || Number(dbEmployee.requiredWorkHours ?? 8),
        )
      : 8;
    const earned = computePayrollEarnedFromAttendance(
      baseSalary,
      empAttendance,
      requiredWorkHours,
      requiredWorkHours,
      overtimePercent,
    );
    const calculatedSalary = earned.calculatedSalary;
    const workMinutesFinal = earned.workMinutes;
    const attendanceBreakdown = computeAttendanceDeductionBreakdown(
      { baseSalary, absentDays, sickDays, leaveDays },
      { absentPct, sickPct },
    );
    const autoDeductions = attendanceBreakdown.attendanceTotal;
    const specialAllowances = existing?.specialAllowances ?? 0;
    const bonuses = existing?.bonuses ?? 0;
    const incentives = earned.overtimePay;
    const commissionRate = Number(dbEmployee?.commissionRate ?? 0);
    const commission =
      commissionRate > 0
        ? computeCashierCommissionFromInvoices(
            periodInvoices,
            {
              userId: emp.uid,
              employeeId: dbEmployee?.id,
              userName: emp.name,
            },
            commissionRate,
            { periodStart, periodEnd },
          ).commission
        : (existing?.commission ?? 0);
    const draftForTax: Partial<PayrollRecord> = {
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
    };
    const { taxes, insurance } = computeTaxInsuranceFromPercent(
      draftForTax,
      defaultTaxesPercent,
      defaultInsurancePercent,
    );
    const deductions = autoDeductions;
    const draftRecord: PayrollRecord = {
      id: existing?.id ?? Date.now() + results.length,
      userId: emp.uid,
      userName: emp.name,
      periodStart,
      periodEnd,
      workingDays,
      presentDays,
      absentDays,
      sickDays,
      leaveDays,
      workMinutes: workMinutesFinal,
      baseSalary,
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
      deductions,
      taxes,
      insurance,
      netPay: 0,
      status: existing?.status === "paid" ? "paid" : "draft",
      notes: existing?.notes,
    };
    draftRecord.netPay = computePayrollNet(draftRecord);

    const record = draftRecord;

    await upsertPayrollRecord(record);
    results.push(record);
  }

  return results;
}

export async function resolvePayrollSalesCommission(
  record: Partial<PayrollRecord> & { userId: string; userName?: string },
  employee: Pick<Employee, "id" | "commissionRate"> | null | undefined,
  periodStart: string,
  periodEnd: string,
  pharmacyId?: string,
) {
  const rate = Number(employee?.commissionRate ?? 0);
  if (!(rate > 0)) {
    return {
      commission: Number(record.commission ?? 0),
      salesTotal: 0,
      profitTotal: 0,
      invoiceCount: 0,
      commissionRate: 0,
    };
  }

  const invoices = await getInvoicesForPeriod(
    periodStart,
    periodEnd,
    pharmacyId ? [pharmacyId] : undefined,
  );

  return computeCashierCommissionFromInvoices(
    invoices,
    {
      userId: record.userId,
      employeeId: employee?.id,
      userName: record.userName,
    },
    rate,
    { periodStart, periodEnd },
  );
}

export async function syncCashierPayrollCommissionAfterSale(params: {
  cashierUserId: string;
  cashierName?: string;
  pharmacyId?: string;
}) {
  if (!params.cashierUserId) return;

  const appUser = {
    uid: params.cashierUserId,
    name: params.cashierName || "",
    pharmacyId: params.pharmacyId || resolveStampPharmacyId(),
  } as AppUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee || !(Number(employee.commissionRate) > 0)) return;

  const { periodStart, periodEnd } = currentMonthPeriodBounds();
  const sales = await resolvePayrollSalesCommission(
    { userId: params.cashierUserId, userName: params.cashierName, commission: 0 },
    employee,
    periodStart,
    periodEnd,
    employee.pharmacyId,
  );

  const payrollRows = await getPayrollRecords(periodStart, periodEnd);
  const existing = payrollRows.find(
    (row) =>
      row.userId === params.cashierUserId ||
      row.userId === employee.id ||
      row.userName === employee.name,
  );

  if (!existing?.id || existing.status === "paid") return;

  const payrollSettings = await loadPayrollSettings(employee.pharmacyId);
  const merged = { ...existing, commission: sales.commission };
  const { taxes, insurance } = computeTaxInsuranceFromPercent(
    merged,
    payrollSettings.defaultTaxes,
    payrollSettings.defaultInsurance,
  );
  const netPay = computePayrollNet({ ...merged, taxes, insurance });

  await updatePayrollRecord(existing.id, {
    commission: sales.commission,
    taxes,
    insurance,
    netPay,
  });
}
