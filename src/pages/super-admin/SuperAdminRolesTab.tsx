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
  openEditPlatformRole,
  openEditRoleModal,
  tryDeleteBuiltinRole,
  deleteCustomRole,
  deletePlatformCustomRole,
  showPharmacy,
}: {
  isArabic: boolean;
  rows: ProgramRoleRow[];
  savingRole: boolean;
  deletingRoleId: string | null;
  activateCustomRole: SuperAdminPageState["activateCustomRole"];
  rejectCustomRole: SuperAdminPageState["rejectCustomRole"];
  openEditPlatformRole: SuperAdminPageState["openEditPlatformRole"];
  openEditRoleModal: SuperAdminPageState["openEditRoleModal"];
  tryDeleteBuiltinRole: SuperAdminPageState["tryDeleteBuiltinRole"];
  deleteCustomRole: SuperAdminPageState["deleteCustomRole"];
  deletePlatformCustomRole: SuperAdminPageState["deletePlatformCustomRole"];
  showPharmacy?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="tableWrap saasProgramRolesTable">
      <table>
        <thead>
          <tr>
            <th>{isArabic ? "الدور" : "Role"}</th>
            <th>{isArabic ? "صلاحيات الدور" : "Role permissions"}</th>
            <th>{isArabic ? "الإجراءات" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowBusy = savingRole || deletingRoleId === row.id || deletingRoleId === row.customRole?.id;
            return (
              <tr key={row.id} className={row.isPending ? "pending" : undefined}>
                <td>
                  <div className="saasManageRoleNameWrap">
                    <strong className="saasManageRoleName">{row.label}</strong>
                    {showPharmacy && row.pharmacyName ? (
                      <span className="saasManageRolePharmacy" title={row.pharmacyId}>
                        {row.pharmacyName}
                      </span>
                    ) : null}
                    {row.isPending ? (
                      <span className="badge warn">
                        {isArabic ? "بانتظار الاعتماد" : "Pending approval"}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td title={row.summaryTitle}>
                  {row.summary || (isArabic ? "—" : "—")}
                </td>
                <td>
                  <div className="saasManageRoleItemActions catalogAccountActions">
                    {row.isPending && row.customRole ? (
                      <>
                        <StaffEmployeeActionButton
                          icon="activate"
                          tone="success"
                          label={isArabic ? "اعتماد كافتراضي" : "Approve as default"}
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
                          label={isArabic ? "تعديل الصلاحيات" : "Edit permissions"}
                          disabled={rowBusy}
                          onClick={() =>
                            row.isPending && row.customRole
                              ? openEditRoleModal(row.customRole)
                              : openEditPlatformRole(row)
                          }
                        />
                        <StaffEmployeeActionButton
                          icon="delete"
                          tone="delete"
                          label={isArabic ? "حذف" : "Delete"}
                          disabled={rowBusy}
                          loading={deletingRoleId === row.id || deletingRoleId === row.customRole?.id}
                          onClick={() =>
                            row.kind === "builtin"
                              ? tryDeleteBuiltinRole(row.roleKey)
                              : row.isPending && row.customRole
                                ? void deleteCustomRole(row.customRole)
                                : void deletePlatformCustomRole(row)
                          }
                        />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    openAddRoleModal,
    savingRole,
    deletingRoleId,
    activateCustomRole,
    rejectCustomRole,
    openEditPlatformRole,
    openEditRoleModal,
    tryDeleteBuiltinRole,
    deleteCustomRole,
    deletePlatformCustomRole,
  } = state;

  const hasPending = filteredPendingRoleSuggestionRows.length > 0;

  return (
    <section className="settingsTabPanel saasRolesReferencePanel">
      <div className="saasPageHeader">
        <div>
          <h3>{isArabic ? "الأدوار الافتراضية" : "Default roles"}</h3>
          <p className="pageHint">
            {isArabic
              ? "كل الأدوار في هذه الصفحة افتراضية لأي صيدلية جديدة. عدّل صلاحيات أي دور أو أضف دوراً جديداً وسيُنسخ تلقائياً عند التسجيل."
              : "Every role on this page is a default for new pharmacies. Edit any role’s permissions or add a new role — it is copied automatically on registration."}
          </p>
        </div>
        <div className="saasPageHeaderActions">
          <button
            type="button"
            className="completeBtn"
            disabled={rolesReferenceLoading || savingRole}
            onClick={() => openAddRoleModal()}
          >
            {isArabic ? "إضافة دور افتراضي" : "Add default role"}
          </button>
          <button
            type="button"
            className="printBtn"
            disabled={rolesReferenceLoading}
            onClick={() => void reloadRolesReference()}
          >
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="saasRolesReferenceToolbar">
        <label className="saasRolesReferenceSearch">
          <span className="saasRolesReferenceSearchLabel">{isArabic ? "بحث" : "Search"}</span>
          <input
            type="search"
            className="searchInput saasRolesReferenceSearchInput"
            value={rolesReferenceQuery}
            onChange={(e) => setRolesReferenceQuery(e.target.value)}
            placeholder={isArabic ? "ابحث بالدور أو الصلاحيات..." : "Search role or permissions..."}
          />
        </label>
      </div>

      {rolesReferenceLoading ? (
        <p className="empty saasProgramRolesEmpty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : (
        <>
          {hasPending ? (
            <section className="saasRolesReferenceBlock saasProgramRolesCard">
              <div className="saasRolesSectionHead">
                <h4>{isArabic ? "بانتظار الاعتماد كافتراضي" : "Pending default approval"}</h4>
                <p className="pageHint">
                  {isArabic
                    ? "طلبات من العملاء — الاعتماد يضيف الدور لقائمة الأدوار الافتراضية"
                    : "Customer requests — approving adds the role to the default roles list"}
                </p>
              </div>
              <RoleRowsTable
                isArabic={isArabic}
                rows={filteredPendingRoleSuggestionRows}
                savingRole={savingRole}
                deletingRoleId={deletingRoleId}
                activateCustomRole={activateCustomRole}
                rejectCustomRole={rejectCustomRole}
                openEditPlatformRole={openEditPlatformRole}
                openEditRoleModal={openEditRoleModal}
                tryDeleteBuiltinRole={tryDeleteBuiltinRole}
                deleteCustomRole={deleteCustomRole}
                deletePlatformCustomRole={deletePlatformCustomRole}
                showPharmacy
              />
            </section>
          ) : null}

          <section className="saasRolesReferenceBlock saasProgramRolesCard">
            <div className="saasRolesSectionHead">
              <h4>{isArabic ? "الأدوار والصلاحيات الافتراضية" : "Default roles & permissions"}</h4>
              <p className="pageHint">
                {isArabic
                  ? "تُنسخ تلقائياً عند تسجيل أي صيدلية جديدة — بما فيها الأدوار المضافة منك"
                  : "Copied automatically for every new pharmacy — including roles you add here"}
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
                openEditPlatformRole={openEditPlatformRole}
                openEditRoleModal={openEditRoleModal}
                tryDeleteBuiltinRole={tryDeleteBuiltinRole}
                deleteCustomRole={deleteCustomRole}
                deletePlatformCustomRole={deletePlatformCustomRole}
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
