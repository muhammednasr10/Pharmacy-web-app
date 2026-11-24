import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import PharmacyRolesSettingsPanel from "./PharmacyRolesSettingsPanel";
import PayrollSettingsPanel, {
  type PayrollSettingsPanelHandle,
} from "./PayrollSettingsPanel";
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
  savePharmacySettings: (options?: { silent?: boolean }) => Promise<void>;
};

export default function EmployeeSettingsPanel({
  isArabic,
  pharmacyId,
  appUser,
  canEdit,
  settingsForm,
  setSettingsForm,
  savePharmacySettings,
}: EmployeeSettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const payrollRef = useRef<PayrollSettingsPanelHandle>(null);

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

  async function saveEmployeeSettings() {
    if (!pharmacyId || !canEdit) return;
    setSaving(true);
    try {
      await savePharmacySettings({ silent: true });
      await payrollRef.current?.save();
      alert(isArabic ? "تم حفظ الإعدادات" : "Settings saved");
    } catch {
      alert(isArabic ? "تعذر حفظ الإعدادات" : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settingsForm settingsTabPanel employeeSettingsPanel">
      <div className="settingsSectionTitle">
        <h3>{isArabic ? "إعدادات الموظفين" : "Employee Settings"}</h3>
        <p>
          {isArabic
            ? "موقع الحضور وأدوار الصيدلية وإعدادات المرتبات"
            : "Attendance location, pharmacy roles, and payroll settings"}
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
        <div className="employeeGpsSettingsGrid">
          <label>
            {isArabic ? "خط العرض" : "Latitude"}
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
          </label>
          <label>
            {isArabic ? "خط الطول" : "Longitude"}
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
          </label>
          <label>
            {isArabic ? "نطاق الحضور (متر)" : "Geofence radius (m)"}
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
          </label>
        </div>
      </SettingsCollapsibleSection>

      <PharmacyRolesSettingsPanel isArabic={isArabic} pharmacyId={pharmacyId} appUser={appUser} />

      <PayrollSettingsPanel
        ref={payrollRef}
        isArabic={isArabic}
        pharmacyId={pharmacyId}
        canEdit={canEdit}
      />

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
                ? "حفظ الإعدادات"
                : "Save settings"}
          </button>
        </div>
      )}
    </div>
  );
}
