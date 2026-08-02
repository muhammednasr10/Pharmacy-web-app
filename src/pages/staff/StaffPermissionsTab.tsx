import BranchScopeSelect from "../../components/BranchScopeSelect";
import { getEffectiveRoleAccess } from "../../utils/roleAccess";
import {
  EDITABLE_BUILTIN_ROLES,
  roleAccessSummaryTitle,
  summarizeRoleAccess,
} from "../../utils/rolePermissions";
import {
  canEditRolePermissionsForRole,
  getRoleLabel,
  isOrgPharmacyAdmin,
  isSuperAdmin,
  parseLoginAccountRole,
} from "../../utils/roles";
import type { EmployeesUsersPageState } from "./useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffPermissionsTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    showOrgHr,
    isTenantScopedView,
    branchDirectory,
    employeeBranchFilter,
    setEmployeeBranchFilter,
    canManageRolePermissions,
    filteredEmployees,
    catalogByEmployeeId,
    branchLabel,
    appUser,
    isCurrentAppEmployee,
    openPermissionEditorForEmployee,
    catalogTargetPharmacyId,
    setCatalogBranchFilter,
    canManageRolesOnEmployeesPage,
    openCustomRoleModal,
    busy,
    permissionsBranchCustomRoles,
    openPermissionEditorBuiltin,
    resetRolePermissionsToDefaults,
    openPermissionEditorCustom,
    isCatalogOwner,
    deleteCustomRoleDefinition,
    canViewLoginAccountsTab,
  } = state;

  if (activeTab !== "permissions") return null;

  return (
    <div className="settingsTabPanel">
      {(showOrgHr || isTenantScopedView) && branchDirectory.length > 1 && (
        <div className="filtersBar staffBranchFilterBar">
          <BranchScopeSelect
            pharmacies={branchDirectory}
            value={employeeBranchFilter}
            onChange={setEmployeeBranchFilter}
            isArabic={isArabic}
            includeAllOption={{
              value: "all",
              label: isArabic ? "كل الفروع" : "All branches",
            }}
          />
        </div>
      )}
      {canManageRolePermissions && (
        <p className="catalogLinkToolbarHint">
          {isArabic
            ? "عدّل صلاحيات كل موظف (حسب دوره) — لا يمكنك تعديل صلاحيات حسابك. التعديل على الدور يطبَّق على كل من يحمل نفس الدور."
            : "Edit each employee's permissions (by role) — you cannot edit your own. Role changes apply to everyone with that role."}
        </p>
      )}
      <section className="branchReportBreakdown" style={{ marginBottom: "1.25rem" }}>
        <h3>{isArabic ? "صلاحيات الموظفين" : "Employee permissions"}</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {showOrgHr && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "الموظف" : "Employee"}</th>
                <th>{isArabic ? "الدور" : "Role"}</th>
                <th>{isArabic ? "الملخص" : "Summary"}</th>
                {canManageRolePermissions && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      showOrgHr
                        ? canManageRolePermissions
                          ? 5
                          : 4
                        : canManageRolePermissions
                          ? 4
                          : 3
                    }
                    className="catalogEmptyCell"
                  >
                    {isArabic ? "لا يوجد موظفون" : "No employees"}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const linked = catalogByEmployeeId.get(emp.id);
                  const roleKey = linked ? parseLoginAccountRole(linked.role) : null;
                  const access = roleKey
                    ? getEffectiveRoleAccess(roleKey, emp.pharmacyId)
                    : null;
                  const isSelf = isCurrentAppEmployee(emp);
                  const canEdit =
                    canManageRolePermissions &&
                    !isSelf &&
                    roleKey &&
                    canEditRolePermissionsForRole(appUser, roleKey);

                  return (
                    <tr key={emp.id}>
                      {showOrgHr && <td>{branchLabel(emp.pharmacyId)}</td>}
                      <td>
                        {emp.name}
                        {isSelf && (
                          <span className="badge" style={{ marginInlineStart: "0.35rem" }}>
                            {isArabic ? "أنت" : "You"}
                          </span>
                        )}
                      </td>
                      <td>{linked ? getRoleLabel(linked.role, isArabic) : "—"}</td>
                      <td
                        title={
                          access
                            ? roleAccessSummaryTitle(
                                access.allowedPages,
                                access.permissions,
                                isArabic,
                              )
                            : undefined
                        }
                      >
                        {access
                          ? summarizeRoleAccess(access.allowedPages, access.permissions, isArabic)
                          : isArabic
                            ? "بدون حساب دخول"
                            : "No login account"}
                      </td>
                      {canManageRolePermissions && (
                        <td>
                          {isSelf ? (
                            <span
                              className="hintText"
                              style={{ margin: 0, padding: "0.35rem 0.5rem" }}
                            >
                              {isArabic ? "حسابك" : "Your account"}
                            </span>
                          ) : canEdit ? (
                            <button
                              type="button"
                              className="editBtn smallBtn"
                              disabled={!!busy}
                              onClick={() => openPermissionEditorForEmployee(emp)}
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                          ) : (
                            <span className="catalogEmptyCell hintText">
                              {!linked
                                ? isArabic
                                  ? "عيّن حساباً"
                                  : "Assign account"
                                : isArabic
                                  ? "—"
                                  : "—"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canViewLoginAccountsTab && branchDirectory.length > 1 && (
        <div className="filtersBar staffBranchFilterBar">
          <label>
            {isArabic ? "فرع قوالب الأدوار" : "Role templates branch"}
            <BranchScopeSelect
              pharmacies={branchDirectory}
              value={catalogTargetPharmacyId}
              onChange={setCatalogBranchFilter}
              isArabic={isArabic}
            />
          </label>
        </div>
      )}
      <div className="staffAccountsToolbar" style={{ marginBottom: "0.75rem" }}>
        {canManageRolesOnEmployeesPage && (
          <button
            type="button"
            className="completeBtn catalogAddRoleBtn"
            disabled={!!busy}
            onClick={() => openCustomRoleModal()}
          >
            {isArabic ? "إضافة دور جديد" : "Add new role"}
          </button>
        )}
        {isSuperAdmin(appUser) && (
          <p className="catalogLinkToolbarHint">
            {isArabic
              ? "إضافة وتعديل الأدوار من: تبويب «أدوار» في إدارة الصيدليات"
              : "Add and edit roles from: the «Roles» tab in Pharmacy Tenants"}
          </p>
        )}
      </div>
      <h3>{isArabic ? "قوالب الأدوار" : "Role templates"}</h3>
      <p className="catalogLinkToolbarHint">
        {isArabic
          ? "مدير عام فقط دور ثابت — باقي الأدوار تُضاف كأدوار مخصصة وتُحذف وتُعدّل بحرية."
          : "General Manager is the only fixed role — add other roles as custom roles and edit or delete them freely."}
      </p>
      {!canManageRolePermissions && (
        <p className="catalogLinkToolbarHint">
          {isArabic
            ? "عرض فقط — تعديل الصلاحيات متاح للمدير العام."
            : "View only — permission editing is available to the General Manager."}
        </p>
      )}
      <div className="tableWrap">
        <table>
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
              const access = getEffectiveRoleAccess(roleKey, catalogTargetPharmacyId);
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
                            disabled={!!busy}
                            onClick={() => openPermissionEditorBuiltin(roleKey)}
                          >
                            {isArabic ? "تعديل" : "Edit"}
                          </button>
                          {access.isCustomized && (
                            <button
                              type="button"
                              className="smallBtn"
                              disabled={!!busy}
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
            {permissionsBranchCustomRoles.map((role) => {
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
                          disabled={!!busy}
                          onClick={() => openPermissionEditorCustom(role)}
                        >
                          {isArabic ? "تعديل" : "Edit"}
                        </button>
                        {isCatalogOwner && (
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
