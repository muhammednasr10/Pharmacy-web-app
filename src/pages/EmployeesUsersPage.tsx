import { Suspense } from "react";
import { resolveBranchDisplay } from "../utils/branchDisplay";
import RolePermissionsEditorModal from "../components/staff/RolePermissionsEditorModal";
import { LazyEmployeeAttendanceBadgeModal } from "./staff/lazyStaffModules";
import StaffEmployeesTab from "./staff/StaffEmployeesTab";
import StaffPermissionsTab from "./staff/StaffPermissionsTab";
import StaffActivityTab from "./staff/StaffActivityTab";
import StaffHrSection from "./staff/StaffHrSection";
import StaffBranchHrSummaryCard from "./staff/StaffBranchHrSummaryCard";
import StaffEmployeeFormModal from "./staff/modals/StaffEmployeeFormModal";
import StaffCustomRoleModal from "./staff/modals/StaffCustomRoleModal";
import StaffTransferEmployeeModal from "./staff/modals/StaffTransferEmployeeModal";
import StaffLoginAccountsPanelModal from "./staff/modals/StaffLoginAccountsPanelModal";
import StaffLoginAccountFormModal from "./staff/modals/StaffLoginAccountFormModal";
import { useEmployeesUsersPageState } from "./staff/useEmployeesUsersPageState";
import type { ActivityInput, EmployeesUsersPageProps } from "./staff/types";

export type { ActivityInput, EmployeesUsersPageProps };

export default function EmployeesUsersPage(props: EmployeesUsersPageProps) {
  const state = useEmployeesUsersPageState(props);
  const {
    isArabic,
    loadError,
    isTenantScopedView,
    tenantScopePharmacyId,
    branchDirectory,
    tabs,
    activeTab,
    setActiveTab,
    canManage,
    canShowEmployeesAccessPanels,
    employeesAccessPanel,
    openAddEmployee,
    openLoginAccountsPanel,
    loading,
    isHrTab,
    attendanceBadgeEmployee,
    setAttendanceBadgeEmployee,
    branchLabel,
    permissionEditorTarget,
    setPermissionEditorTarget,
    permissionEditorPages,
    setPermissionEditorPages,
    permissionEditorPermissions,
    setPermissionEditorPermissions,
    busy,
    savePermissionEditor,
    resetPermissionEditorDefaults,
  } = state;

  return (
    <section className="card settingsPage staffPage">
      {loadError && (
        <p className="errorText" style={{ padding: "0 1rem" }}>
          {isArabic
            ? "تأكد من تنفيذ supabase/employees-users-migration.sql في Supabase"
            : "Run supabase/employees-users-migration.sql in Supabase"}
        </p>
      )}

      {isTenantScopedView && tenantScopePharmacyId && (
        <div className="staffTenantScopeBanner">
          {(() => {
            const scope = resolveBranchDisplay(tenantScopePharmacyId, branchDirectory, isArabic);
            return isArabic
              ? `عرض موظفي: ${scope.organizationName} — ${scope.branchSiteName}`
              : `Showing staff for: ${scope.organizationName} — ${scope.branchSiteName}`;
          })()}
        </div>
      )}

      <div className="staffPageTabsBar">
        <nav
          className="settingsTabsNav"
          aria-label={isArabic ? "أقسام الموظفين" : "Staff sections"}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settingsTabBtn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isArabic ? tab.ar : tab.en}
            </button>
          ))}
        </nav>
        {canManage && activeTab === "employees" && (
          <button type="button" className="printBtn staffAddEmployeeBtn" onClick={openAddEmployee}>
            {isArabic ? "+ إضافة موظف" : "+ Add Employee"}
          </button>
        )}
        {canShowEmployeesAccessPanels && activeTab === "employees" && (
          <div className="staffGmQuickAccess">
            <button
              type="button"
              className={`staffGmQuickAccessBtn${employeesAccessPanel === "login" ? " active" : ""}`}
              onClick={openLoginAccountsPanel}
            >
              {isArabic ? "مستخدمي الدخول" : "Access users"}
            </button>
          </div>
        )}
      </div>

      {loading && !isHrTab && (
        <p className="hintText" style={{ padding: "0 1rem" }}>
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </p>
      )}

      <StaffHrSection state={state} />
      <StaffBranchHrSummaryCard state={state} />
      <StaffEmployeesTab state={state} />
      <StaffPermissionsTab state={state} />

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

      <StaffActivityTab state={state} />

      {attendanceBadgeEmployee && (
        <Suspense fallback={null}>
          <LazyEmployeeAttendanceBadgeModal
            isArabic={isArabic}
            employee={attendanceBadgeEmployee}
            branchLabel={branchLabel(attendanceBadgeEmployee.pharmacyId)}
            onClose={() => setAttendanceBadgeEmployee(null)}
          />
        </Suspense>
      )}

      <StaffLoginAccountsPanelModal state={state} />
      <StaffEmployeeFormModal state={state} />
      <StaffCustomRoleModal state={state} />
      <StaffTransferEmployeeModal state={state} />
      <StaffLoginAccountFormModal state={state} />
    </section>
  );
}
