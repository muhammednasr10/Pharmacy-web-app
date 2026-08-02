import type { UserRole } from "../../../types";
import { CUSTOM_ROLE_PAGE_OPTIONS } from "../../../utils/customRolePages";
import { getRoleLabel } from "../../../utils/roles";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffCustomRoleModal({ state }: Props) {
  const {
    isArabic,
    customRoleModal,
    setCustomRoleModal,
    customRoleRequestMode,
    setCustomRoleRequestMode,
    customRoleForm,
    setCustomRoleForm,
    customRoleTemplateOptions,
    onCustomRoleBaseChange,
    toggleCustomRolePage,
    busy,
    saveCustomRole,
  } = state;

  if (!customRoleModal) return null;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal userModal loginRequestModal customRoleModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader catalogAccountModalHeader">
          <h2>
            {customRoleRequestMode
              ? isArabic
                ? "طلب دور جديد"
                : "Request new role"
              : isArabic
                ? "إضافة دور جديد"
                : "Add new role"}
          </h2>
          <button
            type="button"
            className="deleteSmallBtn"
            onClick={() => {
              setCustomRoleModal(false);
              setCustomRoleRequestMode(false);
            }}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <div className="catalogAccountFormFields">
          <div className="settingsField settingsFieldFull">
            <label htmlFor="custom-role-name-ar">
              {isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"} *
            </label>
            <input
              id="custom-role-name-ar"
              value={customRoleForm.nameAr}
              onChange={(e) => setCustomRoleForm({ ...customRoleForm, nameAr: e.target.value })}
              autoFocus
            />
          </div>
          <div className="settingsField settingsFieldFull">
            <label htmlFor="custom-role-name-en">
              {isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"} *
            </label>
            <input
              id="custom-role-name-en"
              dir="ltr"
              value={customRoleForm.nameEn}
              onChange={(e) => setCustomRoleForm({ ...customRoleForm, nameEn: e.target.value })}
            />
          </div>
          <div className="settingsField settingsFieldFull">
            <label htmlFor="custom-role-template">
              {isArabic ? "قالب الصلاحيات" : "Permission template"}
            </label>
            <select
              id="custom-role-template"
              className="tableSelect"
              value={customRoleForm.baseRole}
              onChange={(e) => onCustomRoleBaseChange(e.target.value as UserRole)}
            >
              {customRoleTemplateOptions.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role, isArabic)}
                </option>
              ))}
            </select>
            <p className="catalogLinkToolbarHint">
              {isArabic
                ? "يُنسخ من الدور المختار ويمكنك تعديل الصفحات أدناه."
                : "Pages are copied from the template; adjust the checklist below."}
            </p>
          </div>
          <fieldset className="customRolePagesFieldset settingsFieldFull">
            <legend>{isArabic ? "الصفحات المسموحة" : "Allowed pages"}</legend>
            <div className="customRolePagesGrid">
              {CUSTOM_ROLE_PAGE_OPTIONS.map((option) => (
                <label key={option.page} className="customRolePageCheck">
                  <input
                    type="checkbox"
                    checked={customRoleForm.allowedPages.includes(option.page)}
                    onChange={() => toggleCustomRolePage(option.page)}
                  />
                  <span>{isArabic ? option.labelAr : option.labelEn}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="modalActions catalogAccountModalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={!!busy}
            onClick={() => void saveCustomRole()}
          >
            {busy === "save-custom-role"
              ? isArabic
                ? customRoleRequestMode
                  ? "جاري الإرسال..."
                  : "جاري الحفظ..."
                : customRoleRequestMode
                  ? "Sending..."
                  : "Saving..."
              : customRoleRequestMode
                ? isArabic
                  ? "إرسال الطلب"
                  : "Send request"
                : isArabic
                  ? "إنشاء الدور"
                  : "Create role"}
          </button>
          <button
            type="button"
            className="editBtn"
            onClick={() => {
              setCustomRoleModal(false);
              setCustomRoleRequestMode(false);
            }}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
