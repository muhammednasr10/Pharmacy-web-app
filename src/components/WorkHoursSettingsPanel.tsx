import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import {
  WEEKDAY_ORDER_SAT_FIRST,
  formatRestWeekdaysMeta,
  getWeekdayLabel,
  normalizeRestWeekdays,
} from "../utils/workSchedule";
import SettingsCollapsibleSection from "./SettingsCollapsibleSection";
import WorkShiftsEditor from "./WorkShiftsEditor";

type WorkHoursSettingsPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  canEdit: boolean;
};

function createDefaultConfig(): pharmacyService.PayrollSettingsValues {
  return {
    ...pharmacyService.PAYROLL_DEFAULTS,
    workShifts: pharmacyService.PAYROLL_DEFAULTS.workShifts.map((item) => ({
      ...item,
      breaks: item.breaks.map((br) => ({ ...br })),
    })),
    workBreaks: [],
    restWeekdays: [...pharmacyService.PAYROLL_DEFAULTS.restWeekdays],
  };
}

export default function WorkHoursSettingsPanel({
  isArabic,
  pharmacyId,
  canEdit,
}: WorkHoursSettingsPanelProps) {
  const [config, setConfig] = useState(createDefaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setConfig(saved);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const workDaysMeta = useMemo(
    () => formatRestWeekdaysMeta(config.restWeekdays, isArabic),
    [config.restWeekdays, isArabic],
  );

  const shiftsMeta = useMemo(() => {
    const defaultShift =
      config.workShifts.find((item) => item.id === config.defaultShiftId) || config.workShifts[0];
    if (!defaultShift) {
      return isArabic ? "3 شيفتات" : "3 shifts";
    }
    const shiftLabel =
      defaultShift.id === "A"
        ? isArabic
          ? "شيفت أ"
          : "Shift A"
        : defaultShift.id === "B"
          ? isArabic
            ? "شيفت ب"
            : "Shift B"
          : isArabic
            ? "شيفت ج"
            : "Shift C";
    return `${shiftLabel} · ${defaultShift.dayStart}–${defaultShift.dayEnd}`;
  }, [config.defaultShiftId, config.workShifts, isArabic]);

  function toggleWorkDay(day: number, isWorkDay: boolean) {
    setConfig((current) => {
      const rest = new Set(normalizeRestWeekdays(current.restWeekdays));
      if (isWorkDay) {
        rest.delete(day);
      } else {
        rest.add(day);
      }
      return { ...current, restWeekdays: normalizeRestWeekdays(Array.from(rest)) };
    });
  }

  async function saveWorkHours() {
    if (!pharmacyId || !canEdit) return;
    setSaving(true);
    try {
      const shiftA = config.workShifts.find((item) => item.id === "A") || config.workShifts[0];
      await pharmacyService.updatePharmacySettings(pharmacyId, {
        payrollWorkDayStart: shiftA?.dayStart || config.workDayStart,
        payrollWorkDayEnd: shiftA?.dayEnd || config.workDayEnd,
        payrollWorkBreaks: shiftA?.breaks || config.workBreaks,
        workShifts: config.workShifts,
        defaultShiftId: config.defaultShiftId,
        restWeekdays: normalizeRestWeekdays(config.restWeekdays),
      });
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setConfig(saved);
      alert(isArabic ? "تم حفظ مواعيد العمل" : "Work hours saved");
    } catch {
      alert(isArabic ? "تعذر حفظ مواعيد العمل" : "Could not save work hours");
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
    <div className="settingsForm settingsTabPanel workHoursSettingsPanel">
      <div className="settingsSectionTitle">
        <h3>{isArabic ? "مواعيد العمل" : "Work Hours"}</h3>
        <p>
          {isArabic
            ? "خطة أيام العمل الأسبوعية وتقسيم الشيفتات أ / ب / ج"
            : "Weekly work-day plan and A / B / C shift schedules"}
        </p>
      </div>

      {!canEdit && (
        <p className="empty">
          {isArabic ? "تعديل مواعيد العمل متاح للأدمن فقط" : "Only admin can edit work hours"}
        </p>
      )}

      <SettingsCollapsibleSection
        title={isArabic ? "خطة أيام العمل" : "Work days plan"}
        meta={workDaysMeta}
        defaultOpen
      >
        <p className="returnsSectionHint">
          {isArabic
            ? "فعّل أيام العمل وأوقف أيام الإجازة الأسبوعية. تُستخدم في خطة حضور الموظف."
            : "Enable work days and disable weekly rest days. Used in the employee attendance plan."}
        </p>
        <div className="workDaysPlanGrid" role="group" aria-label={isArabic ? "أيام الأسبوع" : "Week days"}>
          {WEEKDAY_ORDER_SAT_FIRST.map((day) => {
            const isWorkDay = !config.restWeekdays.includes(day);
            return (
              <label key={day} className={`workDaysPlanChip${isWorkDay ? " active" : ""}`}>
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={isWorkDay}
                  onChange={(event) => toggleWorkDay(day, event.target.checked)}
                />
                <span>{getWeekdayLabel(day, isArabic)}</span>
              </label>
            );
          })}
        </div>
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection
        title={isArabic ? "تقسيم الشيفتات" : "Shift division"}
        meta={shiftsMeta}
        defaultOpen
      >
        <p className="returnsSectionHint">
          {isArabic
            ? "حدّد مواعيد كل شيفت (أ / ب / ج). يُربط الموظف بشيفت ويُستخدم في الحضور والمبيعات."
            : "Configure each shift (A / B / C). Employees are assigned a shift for attendance and sales."}
        </p>
        <WorkShiftsEditor
          isArabic={isArabic}
          disabled={!canEdit}
          shifts={config.workShifts}
          defaultShiftId={config.defaultShiftId}
          onShiftsChange={(workShifts) => {
            const shiftA = workShifts.find((item) => item.id === "A") || workShifts[0];
            setConfig({
              ...config,
              workShifts,
              workDayStart: shiftA.dayStart,
              workDayEnd: shiftA.dayEnd,
              workBreaks: shiftA.breaks,
            });
          }}
          onDefaultShiftChange={(defaultShiftId) => setConfig({ ...config, defaultShiftId })}
        />
      </SettingsCollapsibleSection>

      {canEdit && (
        <div className="settingsActions">
          <button
            type="button"
            className="completeBtn"
            disabled={saving}
            onClick={() => void saveWorkHours()}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ مواعيد العمل"
                : "Save work hours"}
          </button>
        </div>
      )}
    </div>
  );
}
