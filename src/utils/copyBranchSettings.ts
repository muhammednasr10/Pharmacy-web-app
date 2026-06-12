import type { PharmacySettings } from "../types";
import { clonePharmacyShifts, parseWorkBreaks } from "./workSchedule";

/** Operational settings copied to a new branch (not identity or subscription). */
export function extractCopyableBranchSettings(source: PharmacySettings): Partial<PharmacySettings> {
  const workShifts =
    Array.isArray(source.workShifts) && source.workShifts.length > 0
      ? clonePharmacyShifts(source.workShifts)
      : undefined;
  const payrollWorkBreaks = source.payrollWorkBreaks
    ? parseWorkBreaks(source.payrollWorkBreaks).map((item) => ({ ...item }))
    : undefined;

  return {
    currency: source.currency,
    invoiceFooter: source.invoiceFooter,
    logoBase64: source.logoBase64,
    lowStockThreshold: source.lowStockThreshold,
    expiringSoonDays: source.expiringSoonDays,
    expiryNotifyEnabled: source.expiryNotifyEnabled,
    expiryNotifyPhone: source.expiryNotifyPhone,
    expiryNotifyEmail: source.expiryNotifyEmail,
    payrollPayDay: source.payrollPayDay,
    payrollSickDeductionPercent: source.payrollSickDeductionPercent,
    payrollAbsentDeductionPercent: source.payrollAbsentDeductionPercent,
    payrollMaxLeaveDays: source.payrollMaxLeaveDays,
    payrollStandardWorkHours: source.payrollStandardWorkHours,
    payrollOvertimePercent: source.payrollOvertimePercent,
    payrollDefaultTaxes: source.payrollDefaultTaxes,
    payrollDefaultInsurance: source.payrollDefaultInsurance,
    payrollWorkDayStart: source.payrollWorkDayStart,
    payrollWorkDayEnd: source.payrollWorkDayEnd,
    payrollWorkBreaks,
    workShifts,
    defaultShiftId: source.defaultShiftId,
  };
}

export function describeCopyableBranchSettings(isArabic: boolean) {
  return isArabic
    ? "العملة، تذييل الفاتورة، الشعار، تنبيهات المخزون والصلاحية، إعدادات الرواتب والورديات"
    : "Currency, invoice footer, logo, stock/expiry alerts, payroll and shift settings";
}
