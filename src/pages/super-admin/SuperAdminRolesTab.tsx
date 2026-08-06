import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminRolesTab({ state }: Props) {
  const {
    isArabic,
    rolesReferenceLoading,
    rolesReferenceQuery,
    setRolesReferenceQuery,
    filteredProgramRoleListRows,
    reloadRolesReference,
    savingRole,
    deletingRoleId,
    activateCustomRole,
    openEditBuiltinRole,
    openEditRoleModal,
    tryDeleteBuiltinRole,
    deleteCustomRole,
  } = state;

  return (
            <section className="settingsTabPanel saasRolesReferencePanel">
              <div className="saasPageHeader">
                <div>
                  <h3>{isArabic ? "مرجع الأدوار" : "Roles catalog"}</h3>
                  <p className="pageHint">
                    {isArabic
                      ? "كل الأدوار المتاحة في البرنامج — أضف دوراً جديداً أو عدّل أو احذف من القائمة"
                      : "All roles available in the app — add, edit, or delete from this list"}
                  </p>
                </div>
                <button
                  type="button"
                  className="printBtn"
                  disabled={rolesReferenceLoading}
                  onClick={() => void reloadRolesReference()}
                >
                  {isArabic ? "تحديث" : "Refresh"}
                </button>
              </div>

              <div className="saasRolesReferenceToolbar">
                <label className="saasRolesReferenceSearch">
                  <span className="saasRolesReferenceSearchLabel">{isArabic ? "بحث" : "Search"}</span>
                  <input
                    type="search"
                    className="searchInput saasRolesReferenceSearchInput"
                    value={rolesReferenceQuery}
                    onChange={(e) => setRolesReferenceQuery(e.target.value)}
                    placeholder={isArabic ? "ابحث بالمعرف أو اسم الدور..." : "Search by ID or role name..."}
                  />
                </label>
              </div>

              <section className="saasRolesReferenceBlock saasProgramRolesCard">
                {rolesReferenceLoading ? (
                  <p className="empty saasProgramRolesEmpty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
                ) : filteredProgramRoleListRows.length === 0 ? (
                  <p className="empty saasProgramRolesEmpty">
                    {isArabic ? "لا توجد أدوار — اضغط «إضافة دور»" : "No roles — click «Add role»"}
                  </p>
                ) : (
                  <div className="saasProgramRolesTable">
                    <div className="saasProgramRolesTableHead saasProgramRolesGridRow">
                      <span className="saasProgramRolesColId">{isArabic ? "المعرف" : "ID"}</span>
                      <span className="saasProgramRolesColName">{isArabic ? "الدور" : "Role"}</span>
                      <span className="saasProgramRolesColActions">{isArabic ? "الإجراءات" : "Actions"}</span>
                    </div>
                    <ul className="saasManageRolesList saasProgramRolesList">
                    {filteredProgramRoleListRows.map((row) => {
                      const rowBusy = savingRole || deletingRoleId === row.customRole?.id;
                      return (
                        <li
                          key={row.id}
                          className={`saasManageRoleItem saasProgramRolesGridRow${row.isPending ? " pending" : ""}`}
                        >
                          <code className="saasProgramRolesRoleKey saasProgramRolesColId" dir="ltr">
                            {row.roleKey}
                          </code>
                          <div className="saasManageRoleNameWrap saasProgramRolesColName">
                            <span className="saasManageRoleName">{row.label}</span>
                            {row.isPending ? (
                              <span className="badge warn">
                                {isArabic ? "بانتظار الاعتماد" : "Pending"}
                              </span>
                            ) : null}
                          </div>
                          <div className="saasManageRoleItemActions saasProgramRolesColActions">
                            {row.isPending && row.customRole ? (
                              <StaffEmployeeActionButton
                                icon="activate"
                                tone="success"
                                label={isArabic ? "اعتماد" : "Approve"}
                                disabled={rowBusy}
                                loading={savingRole}
                                onClick={() => void activateCustomRole(row.customRole!)}
                              />
                            ) : null}
                            <StaffEmployeeActionButton
                              icon="edit"
                              tone="edit"
                              label={isArabic ? "تعديل" : "Edit"}
                              disabled={rowBusy}
                              onClick={() =>
                                row.kind === "builtin"
                                  ? openEditBuiltinRole(row.roleKey)
                                  : row.customRole && openEditRoleModal(row.customRole)
                              }
                            />
                            <StaffEmployeeActionButton
                              icon="delete"
                              tone="delete"
                              label={isArabic ? "حذف" : "Delete"}
                              disabled={rowBusy}
                              loading={deletingRoleId === row.customRole?.id}
                              onClick={() =>
                                row.kind === "builtin"
                                  ? tryDeleteBuiltinRole(row.roleKey)
                                  : row.customRole && void deleteCustomRole(row.customRole)
                              }
                            />
                          </div>
                        </li>
                      );
                    })}
                    </ul>
                  </div>
                )}
              </section>
            </section>
  );
}
