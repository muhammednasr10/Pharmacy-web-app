import BranchScopeSelect from "../../components/BranchScopeSelect";
import { describeCopyableBranchSettings } from "../../utils/copyBranchSettings";
import type { BranchesPageState } from "./useBranchesPageState";

type Props = { state: BranchesPageState };

export default function BranchFormModal({ state }: Props) {
  const {
    isArabic,
    branches,
    branchModal,
    setBranchModal,
    branchForm,
    setBranchForm,
    savingBranch,
    saveBranch,
    copyBranchSettingsEnabled,
    setCopyBranchSettingsEnabled,
    copySettingsFromBranchId,
    setCopySettingsFromBranchId,
  } = state;

  if (!branchModal) return null;

  return (
    <div className="modalOverlay">
      <div className="userFormPanel" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <h2>
            {branchModal === "add"
              ? isArabic
                ? "إضافة فرع"
                : "Add Branch"
              : isArabic
                ? "تعديل فرع"
                : "Edit Branch"}
          </h2>
          <button type="button" className="closeBtn" onClick={() => setBranchModal(null)}>
            ×
          </button>
        </div>
        <div className="userFormGrid">
          <label>
            <span>{isArabic ? "اسم الفرع" : "Branch name"}</span>
            <input
              value={branchForm.name}
              onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })}
            />
          </label>
          <label>
            <span>{isArabic ? "الاسم بالإنجليزية" : "Name (English)"}</span>
            <input
              value={branchForm.name_en}
              onChange={(event) =>
                setBranchForm({ ...branchForm, name_en: event.target.value })
              }
            />
          </label>
          <label>
            <span>{isArabic ? "الهاتف" : "Phone"}</span>
            <input
              value={branchForm.phone}
              onChange={(event) => setBranchForm({ ...branchForm, phone: event.target.value })}
            />
          </label>
          <label>
            <span>{isArabic ? "العملة" : "Currency"}</span>
            <input
              value={branchForm.currency}
              onChange={(event) =>
                setBranchForm({ ...branchForm, currency: event.target.value })
              }
            />
          </label>
          <label className="userFormFullWidth">
            <span>{isArabic ? "العنوان" : "Address"}</span>
            <input
              value={branchForm.address}
              onChange={(event) =>
                setBranchForm({ ...branchForm, address: event.target.value })
              }
            />
          </label>
          <label>
            <span>{isArabic ? "خط العرض (GPS)" : "Latitude (GPS)"}</span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="30.0444"
              value={branchForm.latitude}
              onChange={(event) =>
                setBranchForm({ ...branchForm, latitude: event.target.value })
              }
            />
          </label>
          <label>
            <span>{isArabic ? "خط الطول (GPS)" : "Longitude (GPS)"}</span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="31.2357"
              value={branchForm.longitude}
              onChange={(event) =>
                setBranchForm({ ...branchForm, longitude: event.target.value })
              }
            />
          </label>
          <label>
            <span>{isArabic ? "نطاق الحضور (متر)" : "Geofence radius (m)"}</span>
            <input
              type="number"
              min={10}
              max={500}
              value={branchForm.geofenceRadiusM}
              onChange={(event) =>
                setBranchForm({ ...branchForm, geofenceRadiusM: event.target.value })
              }
            />
          </label>
          <p className="branchGeoHint userFormFullWidth">
            {isArabic
              ? "مطلوب لنظام الحضور الآمن (QR + GPS) — يمكنك نسخ الإحداثيات من خرائط Google."
              : "Required for secure attendance (QR + GPS) — copy coordinates from Google Maps."}
          </p>
          <label className="userFormFullWidth branchActiveToggle">
            <input
              type="checkbox"
              checked={branchForm.isActive}
              onChange={(event) =>
                setBranchForm({ ...branchForm, isActive: event.target.checked })
              }
            />
            <span>{isArabic ? "فرع مفعّل" : "Active branch"}</span>
          </label>
          {branchModal === "add" && branches.length > 0 && (
            <>
              <label className="userFormFullWidth branchActiveToggle">
                <input
                  type="checkbox"
                  checked={copyBranchSettingsEnabled}
                  onChange={(event) => setCopyBranchSettingsEnabled(event.target.checked)}
                />
                <span>
                  {isArabic
                    ? "نسخ إعدادات من فرع موجود"
                    : "Copy settings from an existing branch"}
                </span>
              </label>
              {copyBranchSettingsEnabled && (
                <label className="userFormFullWidth">
                  <span>{isArabic ? "نسخ الإعدادات من" : "Copy settings from"}</span>
                  <BranchScopeSelect
                    pharmacies={branches}
                    value={copySettingsFromBranchId}
                    onChange={setCopySettingsFromBranchId}
                    isArabic={isArabic}
                  />
                  <p className="mutedText branchCopyHint">
                    {describeCopyableBranchSettings(isArabic)}
                  </p>
                </label>
              )}
            </>
          )}
        </div>
        <div className="modalActions">
          <button type="button" className="ghostBtn" onClick={() => setBranchModal(null)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="printBtn"
            disabled={savingBranch}
            onClick={() => void saveBranch()}
          >
            {savingBranch
              ? isArabic
                ? "جارٍ الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ"
                : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
