import StaffEmployeeActionButton from "../../../../components/staff/StaffEmployeeActionButton";
import { getBranchLabel } from "../../../../utils/branchLabel";
import { getRoleLabel } from "../../../../utils/roles";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";
import ManageTenantWorkflowSection from "./ManageTenantWorkflowSection";

type Props = Pick<
  SuperAdminPageState,
  | "isArabic"
  | "operatorUid"
  | "selectedOrgBranches"
  | "manageRolesLoading"
  | "manageOrgSystemUsers"
  | "manageRoleAccountDisplayRows"
  | "manageUnifiedRolesTableColSpan"
  | "manageOrphanSystemUsers"
  | "manageEmployeeById"
  | "savingRole"
  | "savingSystemUser"
  | "deletingRoleId"
  | "systemUserBusyUid"
  | "openAddSystemUserModal"
  | "openEditSystemUserModal"
  | "deleteSystemUserRow"
  | "reloadManageRoles"
  | "onRefreshSystemUsers"
>;

export default function ManageTenantUsersSection({ state }: { state: Props }) {
  const {
    isArabic,
    operatorUid,
    selectedOrgBranches,
    manageRolesLoading,
    manageOrgSystemUsers,
    manageRoleAccountDisplayRows,
    manageUnifiedRolesTableColSpan,
    manageOrphanSystemUsers,
    manageEmployeeById,
    savingRole,
    savingSystemUser,
    deletingRoleId,
    systemUserBusyUid,
    openAddSystemUserModal,
    openEditSystemUserModal,
    deleteSystemUserRow,
    reloadManageRoles,
    onRefreshSystemUsers,
  } = state;

  return (
    <section className="saasManageRolesCard saasManageUnifiedRolesCard">
      <div className="saasManageLimitsHead">
        <div>
          <h3>{isArabic ? "حسابات الدخول" : "Login accounts"}</h3>
          <p className="saasManageLimitsHint">
            {isArabic
              ? "إدارة الإيميلات وكلمات المرور — الأدوار تُعرَّف من تبويب «أدوار» فقط"
              : "Manage emails and passwords — roles are defined in the «Roles» tab only"}
            {" — "}
            {manageOrgSystemUsers.length} {isArabic ? "مستخدم" : "users"}
          </p>
        </div>
        <div className="saasManageRolesToolbar">
          <button
            type="button"
            className="completeBtn"
            disabled={manageRolesLoading || savingSystemUser}
            onClick={() => openAddSystemUserModal()}
          >
            + {isArabic ? "إضافة مستخدم" : "Add user"}
          </button>
          <button
            type="button"
            className="printBtn"
            disabled={manageRolesLoading}
            onClick={() => {
              void reloadManageRoles();
              void onRefreshSystemUsers();
            }}
          >
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      <ManageTenantWorkflowSection isArabic={isArabic} />

      <div className="saasManageBranchesTableWrap">
        <table className="dataTable saasManageBranchesTable saasManageUnifiedRolesTable">
          <thead>
            <tr>
              <th>{isArabic ? "اسم الدور" : "Role"}</th>
              <th>{isArabic ? "الفرع" : "Branch"}</th>
              <th>{isArabic ? "حساب الدخول" : "Login account"}</th>
              <th>{isArabic ? "الموظف المربوط" : "Linked employee"}</th>
              <th className="saasManageBranchesActionsCol">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {manageRolesLoading ? (
              <tr>
                <td colSpan={manageUnifiedRolesTableColSpan} className="saasManageEmptyCell">
                  {isArabic ? "جاري التحميل..." : "Loading..."}
                </td>
              </tr>
            ) : manageRoleAccountDisplayRows.length === 0 ? (
              <tr>
                <td colSpan={manageUnifiedRolesTableColSpan} className="saasManageEmptyCell">
                  {isArabic
                    ? "لا توجد حسابات دخول — اضغط «إضافة مستخدم»"
                    : "No login accounts — click «Add user»"}
                </td>
              </tr>
            ) : (
              manageRoleAccountDisplayRows.map((displayRow) => {
                const row = displayRow.roleRow;
                const user = displayRow.user;
                const assignedEmployee = user?.employeeId
                  ? manageEmployeeById.get(user.employeeId)
                  : undefined;
                const userBusy = user ? systemUserBusyUid === user.uid || savingSystemUser : false;
                return (
                  <tr key={displayRow.id} className={row.isPending ? "saasRoleRowPending" : undefined}>
                    <td>
                      <div className="saasUnifiedRoleNameCell">
                        <strong>{row.label}</strong>
                        {row.isPending ? (
                          <span className="badge warn">
                            {isArabic ? "بانتظار الاعتماد" : "Pending"}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span>{getBranchLabel(row.pharmacyId, selectedOrgBranches, isArabic)}</span>
                    </td>
                    <td dir="ltr" className="saasUnifiedRoleAccountCell">
                      {user ? (
                        <div className="saasUnifiedRoleAccountMeta">
                          <span>{user.email}</span>
                          <span
                            className={`saasBadge ${user.isActive !== false ? "ok" : "danger"}`}
                          >
                            {user.isActive !== false
                              ? isArabic
                                ? "نشط"
                                : "Active"
                              : isArabic
                                ? "موقوف"
                                : "Off"}
                          </span>
                        </div>
                      ) : (
                        <span className="saasSub">—</span>
                      )}
                    </td>
                    <td>
                      {assignedEmployee ? (
                        <strong>{assignedEmployee.name}</strong>
                      ) : (
                        <span className="saasSub">—</span>
                      )}
                    </td>
                    <td>
                      <div className="saasManageRoleItemActions saasManageBranchesActions">
                        <StaffEmployeeActionButton
                          icon="edit"
                          tone="edit"
                          label={isArabic ? "تعديل" : "Edit"}
                          disabled={userBusy}
                          onClick={() => openEditSystemUserModal(user)}
                        />
                        <StaffEmployeeActionButton
                          icon="delete"
                          tone="delete"
                          label={isArabic ? "حذف" : "Delete"}
                          disabled={userBusy || user.uid === operatorUid}
                          loading={systemUserBusyUid === user.uid}
                          onClick={() => void deleteSystemUserRow(user, row)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {manageOrphanSystemUsers.length > 0 && (
          <div className="saasUnifiedOrphanUsers">
            <div className="saasUnifiedOrphanUsersHead">
              <h4>{isArabic ? "مستخدمون بدون دور معرّف" : "Users without a defined role"}</h4>
              <p className="saasUnifiedOrphanUsersHint">
                {isArabic
                  ? "موجودون في جدول users لكن دورهم لا يطابق أي دور متاح — عدّل الحساب واختر دوراً من القائمة"
                  : "In users but their role does not match any available role — edit and pick a valid role"}
              </p>
            </div>
            <table className="dataTable saasManageBranchesTable saasManageUnifiedRolesTable saasUnifiedOrphanTable">
              <tbody>
                {manageOrphanSystemUsers.map((user) => {
                  const assignedEmployee = user.employeeId
                    ? manageEmployeeById.get(user.employeeId)
                    : undefined;
                  const userBusy = systemUserBusyUid === user.uid || savingSystemUser;
                  return (
                    <tr key={user.uid} className="saasOrphanUserRow">
                      <td>
                        <div className="saasUnifiedRoleNameCell">
                          <strong>{getRoleLabel(user.role, isArabic)}</strong>
                          <span className="badge warn">
                            {user.role === "super_admin"
                              ? isArabic
                                ? "دور النظام"
                                : "Platform role"
                              : isArabic
                                ? "غير معرّف"
                                : "Undefined"}
                          </span>
                        </div>
                      </td>
                      <td>{getBranchLabel(user.pharmacyId, selectedOrgBranches, isArabic)}</td>
                      <td dir="ltr" className="saasUnifiedRoleAccountCell">
                        <div className="saasUnifiedRoleAccountMeta">
                          <span>{user.email}</span>
                          <span
                            className={`saasBadge ${user.isActive !== false ? "ok" : "danger"}`}
                          >
                            {user.isActive !== false
                              ? isArabic
                                ? "نشط"
                                : "Active"
                              : isArabic
                                ? "موقوف"
                                : "Off"}
                          </span>
                        </div>
                      </td>
                      <td>
                        {assignedEmployee ? (
                          <strong>{assignedEmployee.name}</strong>
                        ) : (
                          <span className="saasSub">—</span>
                        )}
                      </td>
                      <td>
                        <div className="saasManageRoleItemActions saasManageBranchesActions">
                          <StaffEmployeeActionButton
                            icon="edit"
                            tone="edit"
                            label={isArabic ? "تعديل" : "Edit"}
                            disabled={userBusy}
                            onClick={() => openEditSystemUserModal(user)}
                          />
                          <StaffEmployeeActionButton
                            icon="delete"
                            tone="delete"
                            label={isArabic ? "حذف" : "Delete"}
                            disabled={userBusy || user.uid === operatorUid}
                            loading={systemUserBusyUid === user.uid}
                            onClick={() => void deleteSystemUserRow(user)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
