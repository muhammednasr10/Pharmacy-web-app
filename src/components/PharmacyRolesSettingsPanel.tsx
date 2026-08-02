import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppUser, Page, PharmacyCustomRole, UserRole } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import RolePermissionsEditorModal, {
  buildDefaultRoleAccess,
  normalizeEditorAccess,
  type RolePermissionsEditorTarget,
} from "./staff/RolePermissionsEditorModal";
import {
  CUSTOM_ROLE_PAGE_OPTIONS,
  CUSTOM_ROLE_TEMPLATE_OPTIONS,
  defaultPagesForCustomRoleTemplate,
} from "../utils/customRolePages";
import { getEffectiveRoleAccess } from "../utils/roleAccess";
import {
  EDITABLE_BUILTIN_ROLES,
  roleAccessSummaryTitle,
  summarizeRoleAccess,
  type RolePermissionFlags,
} from "../utils/rolePermissions";
import {
  canEditRolePermissionsForRole,
  canManageStaffRolePermissions,
  getRoleLabel,
  isOrgPharmacyAdmin,
  isSuperAdmin,
} from "../utils/roles";
import SettingsCollapsibleSection from "./SettingsCollapsibleSection";

type PharmacyRolesSettingsPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  appUser: AppUser | null;
};

export default function PharmacyRolesSettingsPanel({
  isArabic,
  pharmacyId,
  appUser,
}: PharmacyRolesSettingsPanelProps) {
  const [customRoles, setCustomRoles] = useState<PharmacyCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [customRoleModal, setCustomRoleModal] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState(() => ({
    nameAr: "",
    nameEn: "",
    baseRole: "cashier" as UserRole,
    allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
  }));
  const [permissionEditorTarget, setPermissionEditorTarget] =
    useState<RolePermissionsEditorTarget | null>(null);
  const [permissionEditorPages, setPermissionEditorPages] = useState<Page[]>([]);
  const [permissionEditorPermissions, setPermissionEditorPermissions] =
    useState<RolePermissionFlags>({});

  const canManageRolePermissions = canManageStaffRolePermissions(appUser);
  const canCreateRoles = canManageRolePermissions && !isSuperAdmin(appUser);

  const customRoleTemplateOptions = useMemo(
    () =>
      isOrgPharmacyAdmin(appUser) || isSuperAdmin(appUser)
        ? CUSTOM_ROLE_TEMPLATE_OPTIONS
        : CUSTOM_ROLE_TEMPLATE_OPTIONS.filter((role) => role !== "pharmacy_admin"),
    [appUser],
  );

  const branchCustomRoles = useMemo(
    () => customRoles.filter((role) => role.pharmacyId === pharmacyId && role.isActive !== false),
    [customRoles, pharmacyId],
  );

  const rolesMeta = useMemo(() => {
    const builtinCount = EDITABLE_BUILTIN_ROLES.filter((roleKey) =>
      isOrgPharmacyAdmin(appUser) && !isSuperAdmin(appUser) ? roleKey !== "pharmacy_admin" : true,
    ).length;
    const total = builtinCount + branchCustomRoles.length;
    if (branchCustomRoles.length === 0) {
      return isArabic ? `${total} أدوار` : `${total} roles`;
    }
    return isArabic
      ? `${total} أدوار · ${branchCustomRoles.length} مخصص`
      : `${total} roles · ${branchCustomRoles.length} custom`;
  }, [appUser, branchCustomRoles.length, isArabic]);

  const loadRoles = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const [roleRows, configRows] = await Promise.all([
        pharmacyService.getPharmacyCustomRoles(pharmacyId),
        pharmacyService.getPharmacyRoleConfigs(pharmacyId),
      ]);
      setCustomRoles(roleRows);
      pharmacyService.setPharmacyCustomRoles(roleRows.filter((role) => role.isActive !== false));
      pharmacyService.setPharmacyRoleConfigs(configRows);
    } catch (error) {
      console.error("Load pharmacy roles:", error);
      setCustomRoles([]);
      pharmacyService.setPharmacyCustomRoles([]);
      pharmacyService.setPharmacyRoleConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  function openCustomRoleModal() {
    setCustomRoleForm({
      nameAr: "",
      nameEn: "",
      baseRole: "cashier",
      allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
    });
    setCustomRoleModal(true);
  }

  function onCustomRoleBaseChange(baseRole: UserRole) {
    setCustomRoleForm((prev) => ({
      ...prev,
      baseRole,
      allowedPages: defaultPagesForCustomRoleTemplate(baseRole),
    }));
  }

  function toggleCustomRolePage(page: Page) {
    setCustomRoleForm((prev) => ({
      ...prev,
      allowedPages: prev.allowedPages.includes(page)
        ? prev.allowedPages.filter((item) => item !== page)
        : [...prev.allowedPages, page],
    }));
  }

  async function saveCustomRole() {
    if (!customRoleForm.nameAr.trim() || !customRoleForm.nameEn.trim()) {
      alert(isArabic ? "أدخل اسم الدور بالعربية والإنجليزية" : "Enter role name in Arabic and English");
      return;
    }
    if (customRoleForm.allowedPages.length === 0) {
      alert(isArabic ? "اختر صفحة واحدة على الأقل" : "Select at least one page");
      return;
    }

    setBusy("save-custom-role");
    try {
      const created = await pharmacyService.createPharmacyCustomRole({
        pharmacyId,
        nameAr: customRoleForm.nameAr,
        nameEn: customRoleForm.nameEn,
        baseRole: customRoleForm.baseRole,
        allowedPages: customRoleForm.allowedPages,
        isActive: true,
      });
      setCustomRoleModal(false);
      await loadRoles();
      alert(
        isArabic
          ? `تم إنشاء دور «${created.nameAr}» — يمكنك نسبته للموظفين من صفحة الموظفين.`
          : `Role «${created.nameEn}» created — assign it to staff from the Employees page.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_name_required"
          ? isArabic
            ? "أدخل اسم الدور"
            : "Enter role name"
          : message || (isArabic ? "تعذر إنشاء الدور" : "Could not create role"),
      );
    } finally {
      setBusy("");
    }
  }

  function openPermissionEditorBuiltin(roleKey: (typeof EDITABLE_BUILTIN_ROLES)[number]) {
    const access = getEffectiveRoleAccess(roleKey, pharmacyId);
    setPermissionEditorTarget({ kind: "builtin", roleKey });
    setPermissionEditorPages([...access.allowedPages]);
    setPermissionEditorPermissions({ ...access.permissions });
  }

  function openPermissionEditorCustom(role: PharmacyCustomRole) {
    const access = getEffectiveRoleAccess(role.roleKey, role.pharmacyId);
    setPermissionEditorTarget({
      kind: "custom",
      roleKey: role.roleKey,
      customRoleId: role.id,
      baseRole: role.baseRole,
    });
    setPermissionEditorPages([...access.allowedPages]);
    setPermissionEditorPermissions({ ...access.permissions });
  }

  async function savePermissionEditor() {
    if (!permissionEditorTarget) return;
    if (permissionEditorPages.length === 0) {
      alert(isArabic ? "اختر صفحة واحدة على الأقل" : "Select at least one page");
      return;
    }

    const normalized = normalizeEditorAccess(
      permissionEditorTarget,
      permissionEditorPages,
      permissionEditorPermissions,
    );

    setBusy("save-role-permissions");
    try {
      if (permissionEditorTarget.kind === "builtin") {
        await pharmacyService.upsertPharmacyRoleConfig({
          pharmacyId,
          roleKey: permissionEditorTarget.roleKey,
          allowedPages: normalized.allowedPages,
          permissions: normalized.permissions,
        });
      } else {
        await pharmacyService.updatePharmacyCustomRoleAccess(permissionEditorTarget.customRoleId, {
          allowedPages: normalized.allowedPages,
          permissions: normalized.permissions,
        });
      }
      setPermissionEditorTarget(null);
      await loadRoles();
      alert(isArabic ? "تم حفظ الصلاحيات" : "Permissions saved");
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الحفظ" : "Save failed");
    } finally {
      setBusy("");
    }
  }

  function resetPermissionEditorDefaults() {
    if (!permissionEditorTarget) return;
    const defaults = buildDefaultRoleAccess(permissionEditorTarget);
    setPermissionEditorPages(defaults.allowedPages);
    setPermissionEditorPermissions(defaults.permissions);
  }

  async function resetRolePermissionsToDefaults(target: RolePermissionsEditorTarget) {
    const label = getRoleLabel(target.kind === "custom" ? target.roleKey : target.roleKey, isArabic);
    if (
      !window.confirm(
        isArabic
          ? `استعادة الإعدادات الافتراضية لدور «${label}»؟`
          : `Reset «${label}» to default permissions?`,
      )
    ) {
      return;
    }

    setBusy("reset-role-permissions");
    try {
      if (target.kind === "builtin") {
        await pharmacyService.deletePharmacyRoleConfig(pharmacyId, target.roleKey);
      } else {
        const defaults = buildDefaultRoleAccess(target);
        await pharmacyService.updatePharmacyCustomRoleAccess(target.customRoleId, {
          allowedPages: defaults.allowedPages,
          permissions: defaults.permissions,
        });
      }
      await loadRoles();
    } catch (error) {
      alert(error instanceof Error ? error.message : isArabic ? "تعذر الاستعادة" : "Reset failed");
    } finally {
      setBusy("");
    }
  }

  async function deleteCustomRoleDefinition(customRoleId: string, roleLabel: string) {
    const confirmed = window.confirm(
      isArabic
        ? `حذف الدور «${roleLabel}»؟\n\nلن يُحذف إذا كان مربوطاً بحساب أو مستخدم.`
        : `Delete role «${roleLabel}»?\n\nCannot delete if linked to an account or user.`,
    );
    if (!confirmed) return;

    setBusy(`del-role-${customRoleId}`);
    try {
      await pharmacyService.deletePharmacyCustomRole(customRoleId);
      await loadRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      alert(
        message === "custom_role_in_use"
          ? isArabic
            ? "لا يمكن حذف الدور — يوجد حساب دخول مرتبط به"
            : "Cannot delete — a login account uses this role"
          : message || (isArabic ? "تعذر حذف الدور" : "Could not delete role"),
      );
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <SettingsCollapsibleSection
        title={isArabic ? "أدوار الصيدلية" : "Pharmacy roles"}
        meta={isArabic ? "..." : "..."}
      >
        <p className="empty">{isArabic ? "جاري تحميل الأدوار..." : "Loading roles..."}</p>
      </SettingsCollapsibleSection>
    );
  }

  return (
    <>
      <SettingsCollapsibleSection
        title={isArabic ? "أدوار الصيدلية" : "Pharmacy roles"}
        meta={rolesMeta}
        className="pharmacyRolesSettingsSection"
      >
        <p className="returnsSectionHint">
          {isArabic
            ? "حدّد الأدوار التي تُنسب للموظفين — يمكنك إضافة أدوار مخصصة وتعديل صلاحيات كل دور."
            : "Define roles assigned to employees — add custom roles and edit each role's permissions."}
        </p>

        {canCreateRoles && (
          <div className="staffAccountsToolbar" style={{ marginBottom: "0.75rem" }}>
            <button
              type="button"
              className="completeBtn catalogAddRoleBtn"
              disabled={Boolean(busy)}
              onClick={openCustomRoleModal}
            >
              {isArabic ? "إضافة دور جديد" : "Add new role"}
            </button>
          </div>
        )}

        {!canManageRolePermissions && (
          <p className="catalogLinkToolbarHint">
            {isArabic
              ? "عرض فقط — تعديل الأدوار متاح للمدير العام."
              : "View only — role editing is available to the General Manager."}
          </p>
        )}

        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>{isArabic ? "الدور" : "Role"}</th>
                <th>{isArabic ? "الملخص" : "Summary"}</th>
                {canManageRolePermissions && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
              </tr>
            </thead>
            <tbody>
              {EDITABLE_BUILTIN_ROLES.filter((roleKey) =>
                isOrgPharmacyAdmin(appUser) && !isSuperAdmin(appUser)
                  ? roleKey !== "pharmacy_admin"
                  : true,
              ).map((roleKey) => {
                const access = getEffectiveRoleAccess(roleKey, pharmacyId);
                const canEditRole = canEditRolePermissionsForRole(appUser, roleKey);
                return (
                  <tr key={roleKey}>
                    <td>{getRoleLabel(roleKey, isArabic)}</td>
                    <td
                      title={roleAccessSummaryTitle(
                        access.allowedPages,
                        access.permissions,
                        isArabic,
                      )}
                    >
                      {summarizeRoleAccess(access.allowedPages, access.permissions, isArabic)}
                      {access.isCustomized && (
                        <span className="badge warn" style={{ marginInlineStart: "0.5rem" }}>
                          {isArabic ? "مخصّص" : "Customized"}
                        </span>
                      )}
                    </td>
                    {canManageRolePermissions && (
                      <td>
                        {canEditRole ? (
                          <div className="catalogAccountActions">
                            <button
                              type="button"
                              className="editBtn smallBtn"
                              disabled={Boolean(busy)}
                              onClick={() => openPermissionEditorBuiltin(roleKey)}
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                            {access.isCustomized && (
                              <button
                                type="button"
                                className="smallBtn"
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  void resetRolePermissionsToDefaults({
                                    kind: "builtin",
                                    roleKey,
                                  })
                                }
                              >
                                {isArabic ? "افتراضي" : "Default"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="catalogEmptyCell hintText">
                            {isArabic ? "للعرض فقط" : "View only"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {branchCustomRoles.map((role) => {
                const access = getEffectiveRoleAccess(role.roleKey, role.pharmacyId);
                return (
                  <tr key={role.id}>
                    <td>
                      {isArabic ? role.nameAr : role.nameEn}{" "}
                      <span className="badge">{isArabic ? "مخصص" : "Custom"}</span>
                    </td>
                    <td
                      title={roleAccessSummaryTitle(
                        access.allowedPages,
                        access.permissions,
                        isArabic,
                      )}
                    >
                      {summarizeRoleAccess(access.allowedPages, access.permissions, isArabic)}
                    </td>
                    {canManageRolePermissions && (
                      <td>
                        <div className="catalogAccountActions">
                          <button
                            type="button"
                            className="editBtn smallBtn"
                            disabled={Boolean(busy)}
                            onClick={() => openPermissionEditorCustom(role)}
                          >
                            {isArabic ? "تعديل" : "Edit"}
                          </button>
                          {canCreateRoles && (
                            <button
                              type="button"
                              className="dangerBtn smallBtn"
                              disabled={busy === `del-role-${role.id}`}
                              onClick={() =>
                                void deleteCustomRoleDefinition(
                                  role.id,
                                  isArabic ? role.nameAr : role.nameEn,
                                )
                              }
                            >
                              {isArabic ? "حذف" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {branchCustomRoles.length === 0 && !canManageRolePermissions ? (
                <tr>
                  <td colSpan={2} className="emptyCell">
                    {isArabic ? "لا توجد أدوار مخصصة" : "No custom roles"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="settingsFieldHint">
          {isArabic
            ? "بعد إنشاء الدور، اذهب إلى «الموظفين» لربط الدور بحساب دخول الموظف."
            : "After creating a role, go to Employees to assign it to a staff login account."}
        </p>
      </SettingsCollapsibleSection>

      {customRoleModal && (
        <div className="modalOverlay">
          <div
            className="invoiceModal userModal loginRequestModal customRoleModal"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader catalogAccountModalHeader">
              <h2>{isArabic ? "إضافة دور جديد" : "Add new role"}</h2>
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setCustomRoleModal(false)}
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
            </div>
            <div className="catalogAccountFormFields">
              <div className="settingsField settingsFieldFull">
                <label htmlFor="settings-custom-role-name-ar">
                  {isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"} *
                </label>
                <input
                  id="settings-custom-role-name-ar"
                  value={customRoleForm.nameAr}
                  onChange={(event) =>
                    setCustomRoleForm({ ...customRoleForm, nameAr: event.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="settingsField settingsFieldFull">
                <label htmlFor="settings-custom-role-name-en">
                  {isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"} *
                </label>
                <input
                  id="settings-custom-role-name-en"
                  dir="ltr"
                  value={customRoleForm.nameEn}
                  onChange={(event) =>
                    setCustomRoleForm({ ...customRoleForm, nameEn: event.target.value })
                  }
                />
              </div>
              <div className="settingsField settingsFieldFull">
                <label htmlFor="settings-custom-role-template">
                  {isArabic ? "قالب الصلاحيات" : "Permission template"}
                </label>
                <select
                  id="settings-custom-role-template"
                  className="tableInput"
                  value={customRoleForm.baseRole}
                  onChange={(event) => onCustomRoleBaseChange(event.target.value as UserRole)}
                >
                  {customRoleTemplateOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role, isArabic)}
                    </option>
                  ))}
                </select>
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
                disabled={Boolean(busy)}
                onClick={() => void saveCustomRole()}
              >
                {busy === "save-custom-role"
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isArabic
                    ? "إنشاء الدور"
                    : "Create role"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RolePermissionsEditorModal
        isArabic={isArabic}
        open={Boolean(permissionEditorTarget)}
        busy={busy === "save-role-permissions"}
        target={permissionEditorTarget}
        allowedPages={permissionEditorPages}
        permissions={permissionEditorPermissions}
        onClose={() => setPermissionEditorTarget(null)}
        onChangePages={setPermissionEditorPages}
        onChangePermissions={setPermissionEditorPermissions}
        onSave={() => void savePermissionEditor()}
        onResetDefaults={resetPermissionEditorDefaults}
      />
    </>
  );
}
