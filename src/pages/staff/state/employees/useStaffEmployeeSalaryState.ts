import { useRef, useState } from "react";
import type { AppUser, Employee, PayrollRecord, SystemUser } from "../../../../types";
import * as pharmacyService from "../../../../services/pharmacyService";
import { formatMoney } from "../../../../utils/formatMoney";
import { monthBounds } from "../../../../utils/hrFormatters";
import {
  computeWorkHoursFromSchedule,
  resolveWorkSchedule,
} from "../../../../utils/workSchedule";
import type { PayrollAdditionsDraft } from "../../../hr/types";

type Params = {
  isArabic: boolean;
  appUser: AppUser | null;
  pharmacyId: string;
  currency: string;
  canManage: boolean;
  systemUsers: SystemUser[];
};

type SalaryPayrollConfig = Awaited<ReturnType<typeof pharmacyService.loadPayrollSettings>>;

type AdditionsModalState = {
  record: PayrollRecord;
  draft: PayrollAdditionsDraft;
  commissionRate: number;
  salesTotal: number;
  salesInvoiceCount: number;
  overtimeMinutes: number;
  overtimePercent: number;
};

type DeductionsModalState = {
  record: PayrollRecord;
  breakdown: pharmacyService.AttendanceDeductionBreakdown;
};

export function useStaffEmployeeSalaryState({
  isArabic,
  appUser,
  pharmacyId,
  currency,
  canManage,
  systemUsers,
}: Params) {
  const monthDefault = monthBounds();
  const payrollConfigRef = useRef<SalaryPayrollConfig | null>(null);
  const payrollConfigPharmacyIdRef = useRef<string>("");
  const [payrollConfig, setPayrollConfig] = useState<SalaryPayrollConfig | null>(null);
  const [salaryModalEmployee, setSalaryModalEmployee] = useState<Employee | null>(null);
  const [salaryModalRecord, setSalaryModalRecord] = useState<PayrollRecord | null>(null);
  const [salaryModalLoading, setSalaryModalLoading] = useState(false);
  const [salaryModalError, setSalaryModalError] = useState("");
  const [salaryPeriodStart, setSalaryPeriodStart] = useState(monthDefault.start);
  const [salaryPeriodEnd, setSalaryPeriodEnd] = useState(monthDefault.end);
  const [salaryBusyAction, setSalaryBusyAction] = useState("");
  const [salaryAdditionsModal, setSalaryAdditionsModal] = useState<AdditionsModalState | null>(
    null,
  );
  const [salaryDeductionsModal, setSalaryDeductionsModal] = useState<DeductionsModalState | null>(
    null,
  );

  const canEditSalaryRecord = (record: PayrollRecord | null | undefined) =>
    Boolean(canManage && record?.id && record.status === "draft");

  async function resolveSalaryConfig(targetPharmacyId: string) {
    if (payrollConfigRef.current && payrollConfigPharmacyIdRef.current === targetPharmacyId) {
      return payrollConfigRef.current;
    }
    const config = await pharmacyService.loadPayrollSettings(targetPharmacyId);
    payrollConfigRef.current = config;
    payrollConfigPharmacyIdRef.current = targetPharmacyId;
    setPayrollConfig(config);
    return config;
  }

  async function loadEmployeeSalaryCard(
    employee: Employee,
    periodStart = salaryPeriodStart,
    periodEnd = salaryPeriodEnd,
  ) {
    setSalaryModalLoading(true);
    setSalaryModalError("");
    try {
      const linked = systemUsers.find((user) => user.employeeId === employee.id);
      const targetPharmacyId =
        employee.pharmacyId || pharmacyId || appUser?.pharmacyId || "main";
      const config = await resolveSalaryConfig(targetPharmacyId);
      const record = await pharmacyService.generateSingleEmployeePayroll(
        periodStart,
        periodEnd,
        employee,
        linked?.uid || employee.id,
        {
          sickDeductionPercent: config.sickDeductionPercent,
          absentDeductionPercent: config.absentDeductionPercent,
          maxLeaveDays: config.maxLeaveDays,
          standardWorkHours: config.standardWorkHours,
          overtimePercent: config.overtimePercent,
          defaultTaxes: config.defaultTaxes,
          defaultInsurance: config.defaultInsurance,
          workShifts: config.workShifts,
          defaultShiftId: config.defaultShiftId,
        },
      );
      setSalaryModalRecord(record);
    } catch (err) {
      setSalaryModalRecord(null);
      setSalaryModalError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "تعذر تحميل بيانات المرتب"
            : "Failed to load salary data",
      );
    } finally {
      setSalaryModalLoading(false);
    }
  }

  function openEmployeeSalaryModal(employee: Employee) {
    const bounds = monthBounds();
    setSalaryPeriodStart(bounds.start);
    setSalaryPeriodEnd(bounds.end);
    setSalaryModalEmployee(employee);
    setSalaryModalRecord(null);
    setSalaryModalError("");
    setSalaryAdditionsModal(null);
    setSalaryDeductionsModal(null);
    void loadEmployeeSalaryCard(employee, bounds.start, bounds.end);
  }

  function closeEmployeeSalaryModal() {
    setSalaryModalEmployee(null);
    setSalaryModalRecord(null);
    setSalaryModalError("");
    setSalaryModalLoading(false);
    setSalaryAdditionsModal(null);
    setSalaryDeductionsModal(null);
    setSalaryBusyAction("");
  }

  function refreshEmployeeSalaryModal() {
    if (!salaryModalEmployee) return;
    void loadEmployeeSalaryCard(salaryModalEmployee, salaryPeriodStart, salaryPeriodEnd);
  }

  async function resolveSalaryOvertimeIncentives(record: PayrollRecord, employee: Employee) {
    const config = payrollConfigRef.current;
    if (!config || !record.periodStart || !record.periodEnd) {
      return {
        incentives: record.incentives ?? 0,
        overtimeMinutes: 0,
        overtimePercent: config?.overtimePercent ?? 0,
      };
    }

    const linked = systemUsers.find((user) => user.employeeId === employee.id);
    const attendance = await pharmacyService.getAttendanceRecords(
      record.periodStart,
      record.periodEnd,
    );
    const empAttendance = pharmacyService.filterAttendanceForEmployee(
      attendance,
      record.userId,
      employee.id,
    );
    const schedule = resolveWorkSchedule(employee, config.workShifts, config.defaultShiftId);
    const requiredWorkHours =
      computeWorkHoursFromSchedule(schedule) ||
      employee.requiredWorkHours ||
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
      linkedUid: linked?.uid,
    };
  }

  async function editSalaryBaseSalary(record: PayrollRecord) {
    if (!salaryModalEmployee || !canEditSalaryRecord(record)) return;
    const config = payrollConfigRef.current;
    if (!config) return;

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

    setSalaryBusyAction(`base-salary-${record.id}`);
    try {
      await pharmacyService.updateEmployee(salaryModalEmployee.id, { salary: newSalary });
      const breakdown = pharmacyService.computeAttendanceDeductionBreakdown(
        {
          baseSalary: newSalary,
          absentDays: record.absentDays,
          sickDays: record.sickDays,
          leaveDays: record.leaveDays,
        },
        {
          absentPct: config.absentDeductionPercent,
          sickPct: config.sickDeductionPercent,
        },
      );
      const schedule = resolveWorkSchedule(
        salaryModalEmployee,
        config.workShifts,
        config.defaultShiftId,
      );
      const requiredWorkHours =
        computeWorkHoursFromSchedule(schedule) ||
        salaryModalEmployee.requiredWorkHours ||
        config.standardWorkHours ||
        8;
      const calculatedSalary = pharmacyService.computeEarnedSalary(
        newSalary,
        record.workMinutes ?? 0,
        requiredWorkHours,
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
      setSalaryModalEmployee({ ...salaryModalEmployee, salary: newSalary });
      setSalaryModalRecord({ ...merged, netPay });
    } catch {
      alert(isArabic ? "تعذر تحديث الراتب الأساسي" : "Could not update base salary");
    } finally {
      setSalaryBusyAction("");
    }
  }

  async function openSalaryAdditionsModal(record: PayrollRecord) {
    if (!salaryModalEmployee || !record.id) return;
    const config = payrollConfigRef.current;
    if (!config) return;

    setSalaryBusyAction(`additions-open-${record.userId}`);
    try {
      const [overtime, sales] = await Promise.all([
        resolveSalaryOvertimeIncentives(record, salaryModalEmployee),
        pharmacyService.resolvePayrollSalesCommission(
          record,
          {
            id: salaryModalEmployee.id,
            commissionRate: salaryModalEmployee.commissionRate,
          },
          salaryPeriodStart,
          salaryPeriodEnd,
          salaryModalEmployee.pharmacyId || pharmacyId,
        ),
      ]);

      const shouldSyncPayroll =
        overtime.incentives !== (record.incentives ?? 0) ||
        sales.commission !== (record.commission ?? 0);

      let nextRecord = record;
      if (shouldSyncPayroll) {
        const merged = {
          ...record,
          incentives: overtime.incentives,
          commission: sales.commission,
        };
        const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
          merged,
          config.defaultTaxes,
          config.defaultInsurance,
        );
        const netPay = pharmacyService.computePayrollNet({ ...merged, taxes, insurance });
        await pharmacyService.updatePayrollRecord(record.id, {
          incentives: overtime.incentives,
          commission: sales.commission,
          taxes,
          insurance,
          netPay,
        });
        nextRecord = { ...merged, taxes, insurance, netPay };
        setSalaryModalRecord(nextRecord);
      }

      setSalaryAdditionsModal({
        record: nextRecord,
        draft: {
          specialAllowances: nextRecord.specialAllowances ?? 0,
          bonuses: nextRecord.bonuses ?? 0,
          incentives: overtime.incentives,
          commission: sales.commission,
        },
        commissionRate: salaryModalEmployee.commissionRate ?? sales.commissionRate,
        salesTotal: sales.salesTotal,
        salesInvoiceCount: sales.invoiceCount,
        overtimeMinutes: overtime.overtimeMinutes,
        overtimePercent: overtime.overtimePercent,
      });
    } finally {
      setSalaryBusyAction("");
    }
  }

  async function saveSalaryAdditions() {
    if (!salaryAdditionsModal?.record.id || !salaryModalEmployee) return;
    const config = payrollConfigRef.current;
    if (!config) return;

    setSalaryBusyAction("additions");
    try {
      const { record, draft } = salaryAdditionsModal;
      const overtime = await resolveSalaryOvertimeIncentives(record, salaryModalEmployee);
      const payload = { ...draft, incentives: overtime.incentives };
      const merged = { ...record, ...payload };
      const { taxes, insurance } = pharmacyService.computeTaxInsuranceFromPercent(
        merged,
        config.defaultTaxes,
        config.defaultInsurance,
      );
      const mergedWithTax = { ...merged, taxes, insurance };
      const netPay = pharmacyService.computePayrollNet(mergedWithTax);
      await pharmacyService.updatePayrollRecord(record.id, {
        ...payload,
        taxes,
        insurance,
        netPay,
      });
      setSalaryModalRecord({ ...mergedWithTax, netPay });
      setSalaryAdditionsModal(null);
    } finally {
      setSalaryBusyAction("");
    }
  }

  function openSalaryDeductionsModal(record: PayrollRecord) {
    const config = payrollConfigRef.current;
    if (!config) return;
    const breakdown = pharmacyService.computeAttendanceDeductionBreakdown(record, {
      absentPct: config.absentDeductionPercent,
      sickPct: config.sickDeductionPercent,
    });
    setSalaryDeductionsModal({ record, breakdown });
  }

  return {
    currency,
    canManage,
    payrollConfig,
    salaryModalEmployee,
    salaryModalRecord,
    salaryModalLoading,
    salaryModalError,
    salaryPeriodStart,
    setSalaryPeriodStart,
    salaryPeriodEnd,
    setSalaryPeriodEnd,
    salaryBusyAction,
    salaryAdditionsModal,
    setSalaryAdditionsModal,
    salaryDeductionsModal,
    setSalaryDeductionsModal,
    canEditSalaryRecord,
    openEmployeeSalaryModal,
    closeEmployeeSalaryModal,
    refreshEmployeeSalaryModal,
    editSalaryBaseSalary,
    openSalaryAdditionsModal,
    saveSalaryAdditions,
    openSalaryDeductionsModal,
  };
}
