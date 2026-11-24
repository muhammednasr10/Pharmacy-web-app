import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import type { ProgramRoleRow } from "./types";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

function RoleRowsTable({
  isArabic,
  rows,
  savingRole,
  deletingRoleId,
  activateCustomRole,
  rejectCustomRole,
  openEditBuiltinRole,
  openEditRoleModal,
  tryDeleteBuiltinRole,
  deleteCustomRole,
  showPharmacy,
}: {
  isArabic: boolean;
  rows: ProgramRoleRow[];
  savingRole: boolean;
  deletingRoleId: string | null;
  activateCustomRole: SuperAdminPageState["activateCustomRole"];
  rejectCustomRole: SuperAdminPageState["rejectCustomRole"];
  openEditBuiltinRole: SuperAdminPageState["openEditBuiltinRole"];
  openEditRoleModal: SuperAdminPageState["openEditRoleModal"];
  tryDeleteBuiltinRole: SuperAdminPageState["tryDeleteBuiltinRole"];
  deleteCustomRole: SuperAdminPageState["deleteCustomRole"];
  showPharmacy?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="saasProgramRolesTable">
      <div className="saasProgramRolesTableHead saasProgramRolesGridRow">
        <span className="saasProgramRolesColId">{isArabic ? "المعرف" : "ID"}</span>
        <span className="saasProgramRolesColName">{isArabic ? "الدور" : "Role"}</span>
        <span className="saasProgramRolesColActions">{isArabic ? "الإجراءات" : "Actions"}</span>
      </div>
      <ul className="saasManageRolesList saasProgramRolesList">
        {rows.map((row) => {
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
                {showPharmacy && row.pharmacyName ? (
                  <span className="saasManageRolePharmacy" title={row.pharmacyId}>
                    {row.pharmacyName}
                  </span>
                ) : null}
                {row.isPending ? (
                  <span className="badge warn">
                    {isArabic ? "اقتراح بانتظار الاعتماد" : "Suggestion pending"}
                  </span>
                ) : null}
              </div>
              <div className="saasManageRoleItemActions saasProgramRolesColActions">
                {row.isPending && row.customRole ? (
                  <>
                    <StaffEmployeeActionButton
                      icon="activate"
                      tone="success"
                      label={isArabic ? "اعتماد" : "Approve"}
                      disabled={rowBusy}
                      loading={savingRole}
                      onClick={() => void activateCustomRole(row.customRole!)}
                    />
                    <StaffEmployeeActionButton
                      icon="delete"
                      tone="delete"
                      label={isArabic ? "رفض" : "Reject"}
                      disabled={rowBusy}
                      loading={deletingRoleId === row.customRole.id}
                      onClick={() => void rejectCustomRole(row.customRole!)}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SuperAdminRolesTab({ state }: Props) {
  const {
    isArabic,
    rolesReferenceLoading,
    rolesReferenceQuery,
    setRolesReferenceQuery,
    filteredDefaultRoleListRows,
    filteredPendingRoleSuggestionRows,
    reloadRolesReference,
    savingRole,
    deletingRoleId,
    activateCustomRole,
    rejectCustomRole,
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
              ? "الأدوار الافتراضية لأي تسجيل جديد. لو عميل طلب دورًا من الإعدادات/الموظفين يظهر هنا كاقتراح للاعتماد."
              : "Default roles for every new registration. Customer role requests from Settings/Employees appear here as suggestions to approve."}
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

      {rolesReferenceLoading ? (
        <p className="empty saasProgramRolesEmpty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : (
        <>
          <section className="saasRolesReferenceBlock saasProgramRolesCard">
            <div className="saasRolesSectionHead">
              <h4>{isArabic ? "اقتراحات أدوار من العملاء" : "Customer role suggestions"}</h4>
              <p className="pageHint">
                {isArabic
                  ? "طلبات أدوار جديدة من تبويب الإعدادات ← الموظفين"
                  : "New role requests from Settings → Employees"}
              </p>
            </div>
            {filteredPendingRoleSuggestionRows.length === 0 ? (
              <p className="empty saasProgramRolesEmpty">
                {isArabic ? "لا توجد اقتراحات أدوار حالياً" : "No role suggestions right now"}
              </p>
            ) : (
              <RoleRowsTable
                isArabic={isArabic}
                rows={filteredPendingRoleSuggestionRows}
                savingRole={savingRole}
                deletingRoleId={deletingRoleId}
                activateCustomRole={activateCustomRole}
                rejectCustomRole={rejectCustomRole}
                openEditBuiltinRole={openEditBuiltinRole}
                openEditRoleModal={openEditRoleModal}
                tryDeleteBuiltinRole={tryDeleteBuiltinRole}
                deleteCustomRole={deleteCustomRole}
                showPharmacy
              />
            )}
          </section>

          <section className="saasRolesReferenceBlock saasProgramRolesCard">
            <div className="saasRolesSectionHead">
              <h4>{isArabic ? "الأدوار الافتراضية" : "Default roles"}</h4>
              <p className="pageHint">
                {isArabic
                  ? "تُستخدم تلقائياً في أي تسجيل صيدلية جديد"
                  : "Applied automatically to every new pharmacy registration"}
              </p>
            </div>
            {filteredDefaultRoleListRows.length === 0 ? (
              <p className="empty saasProgramRolesEmpty">
                {isArabic ? "لا توجد أدوار" : "No roles"}
              </p>
            ) : (
              <RoleRowsTable
                isArabic={isArabic}
                rows={filteredDefaultRoleListRows}
                savingRole={savingRole}
                deletingRoleId={deletingRoleId}
                activateCustomRole={activateCustomRole}
                rejectCustomRole={rejectCustomRole}
                openEditBuiltinRole={openEditBuiltinRole}
                openEditRoleModal={openEditRoleModal}
                tryDeleteBuiltinRole={tryDeleteBuiltinRole}
                deleteCustomRole={deleteCustomRole}
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
