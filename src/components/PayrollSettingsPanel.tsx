import { useCallback, useEffect, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import WorkShiftsEditor from "./WorkShiftsEditor";

type PayrollSettingsPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  canEdit: boolean;
};

function createDefaultPayrollConfig(): pharmacyService.PayrollSettingsValues {
  return {
    ...pharmacyService.PAYROLL_DEFAULTS,
    workShifts: pharmacyService.PAYROLL_DEFAULTS.workShifts.map((item) => ({
      ...item,
      breaks: item.breaks.map((br) => ({ ...br })),
    })),
    workBreaks: [],
  };
}

export default function PayrollSettingsPanel({
  isArabic,
  pharmacyId,
  canEdit,
}: PayrollSettingsPanelProps) {
  const [payrollConfig, setPayrollConfig] = useState(createDefaultPayrollConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setPayrollConfig(saved);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  async function savePayrollConfig() {
    if (!pharmacyId || !canEdit) return;
    setSaving(true);
    try {
      await pharmacyService.updatePharmacySettings(pharmacyId, {
        payrollPayDay: Math.min(
          31,
          Math.max(1, Number(payrollConfig.payDay) || pharmacyService.PAYROLL_DEFAULTS.payDay),
        ),
        payrollSickDeductionPercent: Math.min(
          100,
          Math.max(
            0,
            Number(payrollConfig.sickDeductionPercent) ||
              pharmacyService.PAYROLL_DEFAULTS.sickDeductionPercent,
          ),
        ),
        payrollAbsentDeductionPercent: Math.min(
          100,
          Math.max(
            0,
            Number(payrollConfig.absentDeductionPercent) ||
              pharmacyService.PAYROLL_DEFAULTS.absentDeductionPercent,
          ),
        ),
        payrollMaxLeaveDays: Math.max(
          0,
          Math.floor(
            Number(payrollConfig.maxLeaveDays) || pharmacyService.PAYROLL_DEFAULTS.maxLeaveDays,
          ),
        ),
        payrollStandardWorkHours: Math.max(
          0,
          Number(payrollConfig.standardWorkHours) ||
            pharmacyService.PAYROLL_DEFAULTS.standardWorkHours,
        ),
        payrollOvertimePercent: Math.max(
          0,
          Number(payrollConfig.overtimePercent) || pharmacyService.PAYROLL_DEFAULTS.overtimePercent,
        ),
        payrollDefaultTaxes: Math.min(
          100,
          Math.max(
            0,
            Number(payrollConfig.defaultTaxes) || pharmacyService.PAYROLL_DEFAULTS.defaultTaxes,
          ),
        ),
        payrollDefaultInsurance: Math.min(
          100,
          Math.max(
            0,
            Number(payrollConfig.defaultInsurance) ||
              pharmacyService.PAYROLL_DEFAULTS.defaultInsurance,
          ),
        ),
        payrollWorkDayStart:
          payrollConfig.workShifts.find((item) => item.id === "A")?.dayStart ||
          payrollConfig.workDayStart,
        payrollWorkDayEnd:
          payrollConfig.workShifts.find((item) => item.id === "A")?.dayEnd ||
          payrollConfig.workDayEnd,
        payrollWorkBreaks:
          payrollConfig.workShifts.find((item) => item.id === "A")?.breaks ||
          payrollConfig.workBreaks,
        workShifts: payrollConfig.workShifts,
        defaultShiftId: payrollConfig.defaultShiftId,
      });
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setPayrollConfig(saved);
      alert(isArabic ? "تم حفظ إعدادات المرتبات" : "Payroll settings saved");
    } catch {
      alert(isArabic ? "تعذر حفظ الإعدادات" : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settingsTabPanel">
        <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="settingsForm settingsTabPanel payrollSettingsPanel">
      <div className="settingsSectionTitle">
        <h3>{isArabic ? "إعدادات المرتبات" : "Payroll Settings"}</h3>
        <p>
          {isArabic
            ? "يُطبَّق على حساب المرتبات والحضور لجميع الموظفين"
            : "Applied to payroll and attendance for all employees"}
        </p>
      </div>

      {!canEdit && (
        <p className="empty">
          {isArabic
            ? "تعديل إعدادات المرتبات متاح للأدمن فقط"
            : "Only admin can edit payroll settings"}
        </p>
      )}

      <div className="hrPayrollSettingsGrid">
        <label>
          {isArabic ? "يوم القبض (من كل شهر)" : "Pay day (of month)"}
          <select
            className="tableInput"
            value={payrollConfig.payDay}
            disabled={!canEdit}
            onChange={(e) => setPayrollConfig({ ...payrollConfig, payDay: Number(e.target.value) })}
          >
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          {isArabic ? "خصم المرضى %" : "Sick leave deduction %"}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="tableInput"
            value={payrollConfig.sickDeductionPercent}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                sickDeductionPercent: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          {isArabic ? "خصم الغياب %" : "Absence deduction %"}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="tableInput"
            value={payrollConfig.absentDeductionPercent}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                absentDeductionPercent: Number(e.target.value) || 0,
              })
            }
          />
        </label>
        <label>
          {isArabic ? "الحد الأقصى للإجازات (أيام)" : "Max leave days"}
          <input
            type="number"
            min={0}
            step={1}
            className="tableInput"
            value={payrollConfig.maxLeaveDays}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                maxLeaveDays: Math.max(0, Math.floor(Number(e.target.value) || 0)),
              })
            }
          />
        </label>
        <label>
          {isArabic ? "ساعات العمل (يومياً)" : "Work hours (per day)"}
          <input
            type="number"
            min={0}
            step={0.5}
            className="tableInput"
            value={payrollConfig.standardWorkHours}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                standardWorkHours: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </label>
        <label>
          {isArabic ? "نسبة الإضافي %" : "Overtime rate %"}
          <input
            type="number"
            min={0}
            step={1}
            className="tableInput"
            value={payrollConfig.overtimePercent}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                overtimePercent: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </label>
        <label>
          {isArabic ? "ضرائب %" : "Taxes %"}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="tableInput"
            value={payrollConfig.defaultTaxes}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                defaultTaxes: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
        <label>
          {isArabic ? "تأمينات %" : "Insurance %"}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className="tableInput"
            value={payrollConfig.defaultInsurance}
            disabled={!canEdit}
            onChange={(e) =>
              setPayrollConfig({
                ...payrollConfig,
                defaultInsurance: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
              })
            }
          />
        </label>
      </div>

      <div className="hrPayrollSettingsSection">
        <h4>{isArabic ? "مواعيد الشيفتات (أ / ب / ج)" : "Shift schedules (A / B / C)"}</h4>
        <p className="returnsSectionHint">
          {isArabic
            ? "حدّد مواعيد كل شيفت. يُربط الموظف بشيفت ويُستخدم في الحضور والمبيعات."
            : "Configure each shift. Employees are assigned to a shift for attendance and sales."}
        </p>
        <WorkShiftsEditor
          isArabic={isArabic}
          disabled={!canEdit}
          shifts={payrollConfig.workShifts}
          defaultShiftId={payrollConfig.defaultShiftId}
          onShiftsChange={(workShifts) => {
            const shiftA = workShifts.find((item) => item.id === "A") || workShifts[0];
            setPayrollConfig({
              ...payrollConfig,
              workShifts,
              workDayStart: shiftA.dayStart,
              workDayEnd: shiftA.dayEnd,
              workBreaks: shiftA.breaks,
            });
          }}
          onDefaultShiftChange={(defaultShiftId) =>
            setPayrollConfig({ ...payrollConfig, defaultShiftId })
          }
        />
      </div>

      <p className="settingsFieldHint">
        {isArabic
          ? `يُصرف الراتب في اليوم ${payrollConfig.payDay}. الإجازات حتى ${payrollConfig.maxLeaveDays} يوم/فترة. الساعات حتى ${payrollConfig.standardWorkHours} س/يوم = مستحق؛ الزيادة تُحسب إضافي بنسبة ${payrollConfig.overtimePercent}%.`
          : `Pay day ${payrollConfig.payDay}. Up to ${payrollConfig.maxLeaveDays} leave day(s)/period. Hours up to ${payrollConfig.standardWorkHours}h/day = earned; extra hours paid at ${payrollConfig.overtimePercent}% of hourly rate in additions.`}
      </p>

      {canEdit && (
        <div className="settingsActions">
          <button
            type="button"
            className="completeBtn"
            disabled={saving}
            onClick={() => void savePayrollConfig()}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ إعدادات المرتبات"
                : "Save payroll settings"}
          </button>
        </div>
      )}
    </div>
  );
}
