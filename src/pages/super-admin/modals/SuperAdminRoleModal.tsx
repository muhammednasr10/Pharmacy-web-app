import { CUSTOM_ROLE_TEMPLATE_OPTIONS } from "../../../utils/customRolePages";
import {
  ROLE_PAGE_OPTIONS,
  ROLE_PERMISSION_OPTIONS,
} from "../../../utils/rolePermissions";
import { getRoleLabel } from "../../../utils/roles";
import type { Page } from "../../../types";
import type { RolePermissionFlags } from "../../../utils/rolePermissions";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminRoleModal({ state }: Props) {
  const {
    roleModalOpen,
    isArabic,
    roleForm,
    setRoleForm,
    savingRole,
    closeRoleModal,
    saveRoleForm,
    toggleRoleFormPage,
    toggleRoleFormPermission,
    onRoleFormBaseChange,
    customRoleTemplateOptions = CUSTOM_ROLE_TEMPLATE_OPTIONS,
  } = state;

  if (!roleModalOpen) return null;

  const isNewCustom = roleForm.kind === "custom" && !roleForm.id;
  const pageOptions = ROLE_PAGE_OPTIONS.filter((item) => item.page !== "sqlMigrations");

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal saasModal rolePermissionsModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h2>
              {roleForm.id || roleForm.kind === "builtin"
                ? isArabic
                  ? "تعديل الدور والصلاحيات"
                  : "Edit role & permissions"
                : isArabic
                  ? "إضافة دور جديد"
                  : "Add new role"}
            </h2>
            <p>
              {roleForm.asPlatformDefault
                ? isArabic
                  ? "دور افتراضي — يُنسخ تلقائياً لأي صيدلية جديدة"
                  : "Default role — copied automatically to every new pharmacy"
                : roleForm.roleKey || "—"}
            </p>
          </div>
          <button
            type="button"
            className="closeBtn"
            disabled={savingRole}
            onClick={closeRoleModal}
          >
            ×
          </button>
        </div>

        <div className="formGrid saasFormGrid catalogAccountFormFields">
          <label className="saasField">
            <span>{isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"}</span>
            <input
              value={roleForm.nameAr}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, nameAr: e.target.value }))}
              placeholder={isArabic ? "مندوب مبيعات" : "Sales rep"}
            />
          </label>
          <label className="saasField">
            <span>{isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"}</span>
            <input
              value={roleForm.nameEn}
              onChange={(e) => setRoleForm((prev) => ({ ...prev, nameEn: e.target.value }))}
              placeholder="Sales rep"
              dir="ltr"
            />
          </label>
          {isNewCustom ? (
            <label className="saasField saasFieldFull">
              <span>{isArabic ? "قالب البداية" : "Starting template"}</span>
              <select
                value={roleForm.baseRole}
                onChange={(e) => onRoleFormBaseChange(e.target.value as typeof roleForm.baseRole)}
              >
                {customRoleTemplateOptions.map((roleKey) => (
                  <option key={roleKey} value={roleKey}>
                    {getRoleLabel(roleKey, isArabic)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <fieldset className="customRolePagesFieldset settingsFieldFull saasFieldFull">
            <legend>{isArabic ? "الصفحات المرئية" : "Visible pages"}</legend>
            <div className="customRolePagesGrid">
              {pageOptions.map((option) => (
                <label key={option.page} className="customRolePageCheck">
                  <input
                    type="checkbox"
                    checked={roleForm.allowedPages.includes(option.page)}
                    onChange={() => toggleRoleFormPage(option.page as Page)}
                  />
                  <span>{isArabic ? option.labelAr : option.labelEn}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="customRolePagesFieldset settingsFieldFull saasFieldFull">
            <legend>{isArabic ? "صلاحيات إضافية" : "Extra permissions"}</legend>
            <div className="customRolePagesGrid">
              {ROLE_PERMISSION_OPTIONS.map((option) => (
                <label key={option.key} className="customRolePageCheck">
                  <input
                    type="checkbox"
                    checked={Boolean(roleForm.permissions[option.key as keyof RolePermissionFlags])}
                    onChange={() =>
                      toggleRoleFormPermission(option.key as keyof RolePermissionFlags)
                    }
                  />
                  <span>{isArabic ? option.labelAr : option.labelEn}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="modalActions saasModalActions">
          <button
            type="button"
            className="deleteSmallBtn"
            disabled={savingRole}
            onClick={closeRoleModal}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="completeBtn"
            disabled={savingRole}
            onClick={() => void saveRoleForm()}
          >
            {savingRole
              ? isArabic
                ? "جاري الحفظ..."
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
