import { useCallback, useMemo, useState } from "react";
import type { Employee, PayrollRecord, SystemUser } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import { formatMoney } from "../../../utils/formatMoney";
import { countPeriodDays, monthBounds } from "../../../utils/hrFormatters";
import { computeWorkHoursFromSchedule, resolveWorkSchedule } from "../../../utils/workSchedule";
import { payrollBranchId as resolvePayrollBranchId } from "../helpers";
import type { HrStaffRow, PayrollAdditionsDraft } from "../types";
import type { HrSharedContext } from "./shared";

type PayrollParams = Pick<
  HrSharedContext,
  | "isArabic"
  | "pharmacyId"
  | "pharmacyName"
  | "currency"
  | "showOrgHr"
  | "orgBranchIds"
  | "resolveBranchLabel"
  | "canManageHrFor"
  | "payrollConfig"
  | "payrollConfigRef"
  | "setLoading"
  | "setError"
  | "setBusyAction"
> & {
  staffRows: HrStaffRow[];
  loadStaff: () => Promise<void>;
  activeEmployees: HrStaffRow[];
  staffByAttendanceKey: Map<string, HrStaffRow>;
  staffBranchByKey: Map<string, string>;
};

export function useHrPayrollState(params: PayrollParams) {
  const {
    isArabic,
    pharmacyId,
    pharmacyName,
    currency,
    showOrgHr,
    orgBranchIds,
    resolveBranchLabel,
    canManageHrFor,
    payrollConfig,
    payrollConfigRef,
    setLoading,
    setError,
    setBusyAction,
    staffRows,
    loadStaff,
    activeEmployees,
    staffByAttendanceKey,
    staffBranchByKey,
  } = params;

  const monthDefault = useMemo(() => monthBounds(), []);
  const [periodStart, setPeriodStart] = useState(monthDefault.start);
  const [periodEnd, setPeriodEnd] = useState(monthDefault.end);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [additionsModal, setAdditionsModal] = useState<{
    record: PayrollRecord;
    draft: PayrollAdditionsDraft;
    commissionRate: number;
    salesTotal: number;
    salesInvoiceCount: number;
    overtimeMinutes: number;
    overtimePercent: number;
  } | null>(null);
  const [deductionsModal, setDeductionsModal] = useState<{
    record: PayrollRecord;
    breakdown: pharmacyService.AttendanceDeductionBreakdown;
  } | null>(null);

  function payrollBranchId(rec: PayrollRecord) {
    return resolvePayrollBranchId(rec, staffBranchByKey);
  }

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadStaff();
      const scopeIds =
        showOrgHr && orgBranchIds.length > 0 ? orgBranchIds : [pharmacyId].filter(Boolean);
      const [employees, accounts] = await Promise.all([
        scopeIds.length > 1
          ? pharmacyService.getEmployeesForPharmacies(scopeIds)
          : pharmacyService.getEmployees(),
        scopeIds.length > 1
          ? pharmacyService.getSystemUsersForPharmacies(scopeIds)
          : pharmacyId
            ? pharmacyService.getSystemUsers(pharmacyId)
            : Promise.resolve([] as SystemUser[]),
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

      const config = payrollConfigRef.current!;
      const payrollScopeIds = scopeIds.length > 1 ? scopeIds : undefined;
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
          : await pharmacyService.getPayrollRecords(periodStart, periodEnd, payrollScopeIds);
      setPayrollRecords(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd, loadStaff, pharmacyId, showOrgHr, orgBranchIds, payrollConfigRef, setLoading, setError]);

  function findStaffForPayrollRecord(record: PayrollRecord) {
    return (
      staffByAttendanceKey.get(record.userId) ||
      staffRows.find((row) => row.employeeId === record.userId)
    );
  }

  async function resolvePayrollOvertimeIncentives(record: PayrollRecord) {
    const staff = findStaffForPayrollRecord(record);
    const config = payrollConfigRef.current!;
    if (!staff || !record.periodStart || !record.periodEnd) {
      return {
        incentives: record.incentives ?? 0,
        overtimeMinutes: 0,
        overtimePercent: config.overtimePercent,
      };
    }

    const attendance = await pharmacyService.getAttendanceRecords(
      record.periodStart,
      record.periodEnd,
    );
    const empAttendance = pharmacyService.filterAttendanceForEmployee(
      attendance,
      record.userId,
      staff.employeeId,
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
      config.overtimePercent,
    );

    return {
      incentives: overtime.overtimePay,
      overtimeMinutes: overtime.overtimeMinutes,
      overtimePercent: config.overtimePercent,
    };
  }

  async function editBaseSalary(record: PayrollRecord) {
    if (!canManageHrFor(payrollBranchId(record)) || !record.id || record.status !== "draft") return;

    const input = window.prompt(
      isArabic
        ? `الراتب الأساسي لـ ${record.userName} (${currency}):`
        : `Base salary for ${record.userName} (${currency}):`,
      String(record.baseSalary),
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
        : `Change base salary from ${formatMoney(record.baseSalary)} to ${formatMoney(newSalary)} ${currency}?`,
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
        },
      );
      const calculatedSalary = pharmacyService.computeEarnedSalary(
        newSalary,
        record.workMinutes ?? 0,
        staff?.requiredWorkHours ?? 8,
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

  async function openAdditionsModal(record: PayrollRecord) {
    const staff = findStaffForPayrollRecord(record);
    setBusyAction(`additions-open-${record.userId}`);
    try {
      const [overtime, sales] = await Promise.all([
        resolvePayrollOvertimeIncentives(record),
        pharmacyService.resolvePayrollSalesCommission(
          record,
          staff
            ? {
                id: staff.employeeId,
                commissionRate: staff.commissionRate,
              }
            : null,
          periodStart,
          periodEnd,
          staff?.pharmacyId || pharmacyId,
        ),
      ]);

      const shouldSyncPayroll =
        record.id &&
        (overtime.incentives !== (record.incentives ?? 0) ||
          sales.commission !== (record.commission ?? 0));

      if (shouldSyncPayroll) {
        const merged = {
          ...record,
          incentives: overtime.incentives,
          commission: sales.commission,
        };
        const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
          merged,
          payrollConfigRef.current!.defaultTaxes,
          payrollConfigRef.current!.defaultInsurance,
        );
        const netPay = pharmacyService.computePayrollNet({ ...merged, taxes, insurance });
        await pharmacyService.updatePayrollRecord(record.id, {
          incentives: overtime.incentives,
          commission: sales.commission,
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
          const next = {
            ...row,
            incentives: overtime.incentives,
            commission: sales.commission,
          };
          const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
            next,
            payrollConfigRef.current!.defaultTaxes,
            payrollConfigRef.current!.defaultInsurance,
          );
          return {
            ...next,
            taxes,
            insurance,
            netPay: pharmacyService.computePayrollNet({ ...next, taxes, insurance }),
          };
        }),
      );
      setAdditionsModal({
        record,
        draft: {
          specialAllowances: record.specialAllowances ?? 0,
          bonuses: record.bonuses ?? 0,
          incentives: overtime.incentives,
          commission: sales.commission,
        },
        commissionRate: staff?.commissionRate ?? sales.commissionRate,
        salesTotal: sales.salesTotal,
        salesInvoiceCount: sales.invoiceCount,
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
        payrollConfigRef.current!.defaultTaxes,
        payrollConfigRef.current!.defaultInsurance,
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

  const payrollRows = useMemo(() => {
    const recordByUser = new Map<string, PayrollRecord>();
    for (const record of payrollRecords) {
      recordByUser.set(record.userId, record);
    }
    const workingDays = countPeriodDays(periodStart, periodEnd);
    return activeEmployees.map((emp) => {
      const existing = recordByUser.get(emp.attendanceKey) || recordByUser.get(emp.employeeId);
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

  function handleExportPayrollPdf() {
    if (payrollRows.length === 0) return;
    void import("../../../utils/payrollExport").then((m) =>
      m.downloadPayrollPdf({
      isArabic,
      currency,
      pharmacyName: pharmacyName || pharmacyId,
      periodStart,
      periodEnd,
      records: payrollRows,
      totalNetPay,
      showBranchColumn: showOrgHr && !!resolveBranchLabel,
      getBranchLabel: resolveBranchLabel,
      }),
    );
  }

  return {
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    payrollRecords,
    setPayrollRecords,
    additionsModal,
    setAdditionsModal,
    deductionsModal,
    setDeductionsModal,
    loadPayroll,
    payrollRows,
    totalNetPay,
    editBaseSalary,
    openAdditionsModal,
    savePayrollAdditions,
    openDeductionsModal,
    handleExportPayrollPdf,
    payrollBranchId,
  };
}
