import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import WorkShiftsEditor from "./WorkShiftsEditor";
import PharmacyRolesSettingsPanel from "./PharmacyRolesSettingsPanel";
import SettingsCollapsibleSection from "./SettingsCollapsibleSection";
import type { AppUser } from "../types";
import type { SettingsForm } from "../pages/SettingsPage";

type EmployeeSettingsPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  appUser: AppUser | null;
  canEdit: boolean;
  settingsForm: SettingsForm;
  setSettingsForm: Dispatch<SetStateAction<SettingsForm>>;
  savePharmacySettings: () => Promise<void>;
};

function createDefaultShiftConfig(): pharmacyService.PayrollSettingsValues {
  return {
    ...pharmacyService.PAYROLL_DEFAULTS,
    workShifts: pharmacyService.PAYROLL_DEFAULTS.workShifts.map((item) => ({
      ...item,
      breaks: item.breaks.map((br) => ({ ...br })),
    })),
    workBreaks: [],
  };
}

export default function EmployeeSettingsPanel({
  isArabic,
  pharmacyId,
  appUser,
  canEdit,
  settingsForm,
  setSettingsForm,
  savePharmacySettings,
}: EmployeeSettingsPanelProps) {
  const [shiftConfig, setShiftConfig] = useState(createDefaultShiftConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadShiftConfig = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setShiftConfig(saved);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    void loadShiftConfig();
  }, [loadShiftConfig]);

  const gpsMeta = useMemo(() => {
    const lat = settingsForm.latitude.trim();
    const lng = settingsForm.longitude.trim();
    const radius = settingsForm.geofenceRadiusM.trim();
    if (!lat && !lng) {
      return isArabic ? "غير مُعدّ" : "Not set";
    }
    const coords = lat && lng ? `${lat}, ${lng}` : isArabic ? "إحداثيات جزئية" : "Partial coords";
    return radius ? `${coords} · ${radius}m` : coords;
  }, [isArabic, settingsForm.geofenceRadiusM, settingsForm.latitude, settingsForm.longitude]);

  const shiftsMeta = useMemo(() => {
    const defaultShift =
      shiftConfig.workShifts.find((item) => item.id === shiftConfig.defaultShiftId) ||
      shiftConfig.workShifts[0];
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
  }, [isArabic, shiftConfig.defaultShiftId, shiftConfig.workShifts]);

  async function saveEmployeeSettings() {
    if (!pharmacyId || !canEdit) return;
    setSaving(true);
    try {
      await savePharmacySettings();
      await pharmacyService.updatePharmacySettings(pharmacyId, {
        payrollWorkDayStart:
          shiftConfig.workShifts.find((item) => item.id === "A")?.dayStart ||
          shiftConfig.workDayStart,
        payrollWorkDayEnd:
          shiftConfig.workShifts.find((item) => item.id === "A")?.dayEnd || shiftConfig.workDayEnd,
        payrollWorkBreaks:
          shiftConfig.workShifts.find((item) => item.id === "A")?.breaks || shiftConfig.workBreaks,
        workShifts: shiftConfig.workShifts,
        defaultShiftId: shiftConfig.defaultShiftId,
      });
      const saved = await pharmacyService.loadPayrollSettings(pharmacyId);
      setShiftConfig(saved);
      alert(isArabic ? "تم حفظ إعدادات الموظفين" : "Employee settings saved");
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
    <div className="settingsForm settingsTabPanel employeeSettingsPanel">
      <div className="settingsSectionTitle">
        <h3>{isArabic ? "إعدادات الموظفين" : "Employee Settings"}</h3>
        <p>
          {isArabic
            ? "موقع الحضور، الشيفتات، وأدوار الصيدلية للموظفين"
            : "Attendance location, shifts, and pharmacy roles for employees"}
        </p>
      </div>

      {!canEdit && (
        <p className="empty">
          {isArabic ? "تعديل إعدادات الموظفين متاح للأدمن فقط" : "Only admin can edit employee settings"}
        </p>
      )}

      <SettingsCollapsibleSection
        title={isArabic ? "موقع الحضور (GPS)" : "Attendance location (GPS)"}
        meta={gpsMeta}
      >
        <p className="returnsSectionHint">
          {isArabic
            ? "يُستخدم في «حضور بصمة» و QR — انسخ الإحداثيات من خرائط Google"
            : "Used for secure attendance and QR check-in — copy coordinates from Google Maps"}
        </p>
        <div className="settingsFieldsGrid">
          <div className="settingsField">
            <label>{isArabic ? "خط العرض" : "Latitude"}</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              disabled={!canEdit}
              value={settingsForm.latitude}
              onChange={(event) =>
                setSettingsForm((current) => ({ ...current, latitude: event.target.value }))
              }
              placeholder="30.044420"
            />
          </div>
          <div className="settingsField">
            <label>{isArabic ? "خط الطول" : "Longitude"}</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              disabled={!canEdit}
              value={settingsForm.longitude}
              onChange={(event) =>
                setSettingsForm((current) => ({ ...current, longitude: event.target.value }))
              }
              placeholder="31.235712"
            />
          </div>
          <div className="settingsField">
            <label>{isArabic ? "نطاق الحضور (متر)" : "Geofence radius (m)"}</label>
            <input
              type="number"
              min={10}
              max={500}
              disabled={!canEdit}
              value={settingsForm.geofenceRadiusM}
              onChange={(event) =>
                setSettingsForm((current) => ({ ...current, geofenceRadiusM: event.target.value }))
              }
            />
          </div>
        </div>
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection
        title={isArabic ? "مواعيد الشيفتات (أ / ب / ج)" : "Shift schedules (A / B / C)"}
        meta={shiftsMeta}
      >
        <p className="returnsSectionHint">
          {isArabic
            ? "حدّد مواعيد كل شيفت. يُربط الموظف بشيفت ويُستخدم في الحضور والمبيعات."
            : "Configure each shift. Employees are assigned to a shift for attendance and sales."}
        </p>
        <WorkShiftsEditor
          isArabic={isArabic}
          disabled={!canEdit}
          shifts={shiftConfig.workShifts}
          defaultShiftId={shiftConfig.defaultShiftId}
          onShiftsChange={(workShifts) => {
            const shiftA = workShifts.find((item) => item.id === "A") || workShifts[0];
            setShiftConfig({
              ...shiftConfig,
              workShifts,
              workDayStart: shiftA.dayStart,
              workDayEnd: shiftA.dayEnd,
              workBreaks: shiftA.breaks,
            });
          }}
          onDefaultShiftChange={(defaultShiftId) =>
            setShiftConfig({ ...shiftConfig, defaultShiftId })
          }
        />
      </SettingsCollapsibleSection>

      <PharmacyRolesSettingsPanel isArabic={isArabic} pharmacyId={pharmacyId} appUser={appUser} />

      {canEdit && (
        <div className="settingsActions">
          <button
            type="button"
            className="completeBtn"
            disabled={saving}
            onClick={() => void saveEmployeeSettings()}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ إعدادات الموظفين"
                : "Save employee settings"}
          </button>
        </div>
      )}
    </div>
  );
}
