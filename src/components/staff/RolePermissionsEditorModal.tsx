import type { BuiltinUserRole, Page } from "../../types";
import {
  defaultPagesForBuiltinRole,
  defaultPermissionsByRole,
  normalizeRolePermissionFlags,
  ROLE_PAGE_OPTIONS,
  ROLE_PERMISSION_OPTIONS,
  type RolePermissionFlags,
} from "../../utils/rolePermissions";
import { getRoleLabel, isCustomRole } from "../../utils/roles";

export type RolePermissionsEditorTarget =
  | { kind: "builtin"; roleKey: BuiltinUserRole }
  | { kind: "custom"; roleKey: string; customRoleId: string; baseRole: BuiltinUserRole };

export type RolePermissionsEditorModalProps = {
  isArabic: boolean;
  open: boolean;
  busy: boolean;
  target: RolePermissionsEditorTarget | null;
  allowedPages: Page[];
  permissions: RolePermissionFlags;
  onClose: () => void;
  onChangePages: (pages: Page[]) => void;
  onChangePermissions: (permissions: RolePermissionFlags) => void;
  onSave: () => void;
  onResetDefaults: () => void;
};

export default function RolePermissionsEditorModal({
  isArabic,
  open,
  busy,
  target,
  allowedPages,
  permissions,
  onClose,
  onChangePages,
  onChangePermissions,
  onSave,
  onResetDefaults,
}: RolePermissionsEditorModalProps) {
  if (!open || !target) return null;

  const roleLabel = getRoleLabel(target.roleKey, isArabic);
  const pageOptions = ROLE_PAGE_OPTIONS.filter((item) => item.page !== "sqlMigrations");

  function togglePage(page: Page) {
    onChangePages(
      allowedPages.includes(page)
        ? allowedPages.filter((item) => item !== page)
        : [...allowedPages, page],
    );
  }

  function togglePermission(key: keyof RolePermissionFlags) {
    onChangePermissions({
      ...permissions,
      [key]: !permissions[key],
    });
  }

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal userModal loginRequestModal rolePermissionsModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader catalogAccountModalHeader">
          <div className="catalogAccountModalTitle">
            <h2>{isArabic ? "تعديل صلاحيات الدور" : "Edit role access"}</h2>
            <span className="catalogRoleBadge">{roleLabel}</span>
            {isCustomRole(target.roleKey) && (
              <span className="badge">{isArabic ? "مخصص" : "Custom"}</span>
            )}
          </div>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="catalogAccountFormFields">
          <fieldset className="customRolePagesFieldset settingsFieldFull">
            <legend>{isArabic ? "الصفحات المرئية" : "Visible pages"}</legend>
            <div className="customRolePagesGrid">
              {pageOptions.map((option) => (
                <label key={option.page} className="customRolePageCheck">
                  <input
                    type="checkbox"
                    checked={allowedPages.includes(option.page)}
                    onChange={() => togglePage(option.page)}
                  />
                  <span>{isArabic ? option.labelAr : option.labelEn}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="customRolePagesFieldset settingsFieldFull">
            <legend>{isArabic ? "صلاحيات إضافية" : "Extra permissions"}</legend>
            <div className="customRolePagesGrid">
              {ROLE_PERMISSION_OPTIONS.map((option) => (
                <label key={option.key} className="customRolePageCheck">
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[option.key])}
                    onChange={() => togglePermission(option.key)}
                  />
                  <span>{isArabic ? option.labelAr : option.labelEn}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="modalActions catalogAccountModalActions">
          <button type="button" className="completeBtn" disabled={busy} onClick={onSave}>
            {busy ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "حفظ" : "Save"}
          </button>
          <button type="button" className="editBtn" disabled={busy} onClick={onResetDefaults}>
            {isArabic ? "استعادة الافتراضي" : "Reset defaults"}
          </button>
          <button type="button" className="editBtn" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function buildDefaultRoleAccess(target: RolePermissionsEditorTarget) {
  const baseRole = target.kind === "custom" ? target.baseRole : target.roleKey;
  return {
    allowedPages:
      target.kind === "builtin"
        ? defaultPagesForBuiltinRole(target.roleKey)
        : defaultPagesForBuiltinRole(baseRole).filter((page) =>
            ROLE_PAGE_OPTIONS.some(
              (option) =>
                option.page === page &&
                page !== "branches" &&
                page !== "sqlMigrations",
            ),
          ),
    permissions: { ...defaultPermissionsByRole[baseRole] },
  };
}

export function normalizeEditorAccess(
  target: RolePermissionsEditorTarget,
  allowedPages: Page[],
  permissions: RolePermissionFlags,
) {
  const baseRole = target.kind === "custom" ? target.baseRole : target.roleKey;
  const pages = allowedPages.filter((page) => page !== "sqlMigrations");
  return {
    allowedPages: pages,
    permissions: normalizeRolePermissionFlags(baseRole, permissions),
  };
}
