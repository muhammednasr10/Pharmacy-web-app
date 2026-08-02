import StaffEmployeeActionButton from "../../../components/staff/StaffEmployeeActionButton";
import BranchScopeSelect from "../../../components/BranchScopeSelect";
import { getSupabaseUserWorkflowSummary } from "../../../utils/supabaseUserWorkflow";
import { getRoleLabel } from "../../../utils/roles";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffLoginAccountsPanelModal({ state }: Props) {
  const {
    isArabic,
    canShowEmployeesAccessPanels,
    loading,
    employeesAccessPanel,
    setEmployeesAccessPanel,
    showOrgHr,
    isTenantScopedView,
    branchDirectory,
    loginAccountsPanelBranchFilter,
    setLoginAccountsPanelBranchFilter,
    canRequestLoginAccounts,
    canManageLoginAccountsCatalog,
    busy,
    openLoginAccountRequestFromEmployeesPanel,
    employeesPanelAccessUsers,
    employeeById,
    loginCatalogByEmail,
    branchLabel,
    renderSystemUserStatus,
    setCatalogBranchFilter,
    openCatalogAccountEdit,
    openPasswordChangeRequest,
    deleteCatalogAccount,
  } = state;

  if (!canShowEmployeesAccessPanels || loading || employeesAccessPanel !== "login") return null;

  return (
    <div className="modalOverlay staffLoginModalOverlay">
      <div
        className="staffLoginModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <header className="staffLoginModalHead">
          <div className="staffLoginModalTitle">
            <h2>{isArabic ? "مستخدمي الدخول" : "Access users"}</h2>
            <p>{getSupabaseUserWorkflowSummary(isArabic)}</p>
          </div>
          <button
            type="button"
            className="deleteSmallBtn"
            onClick={() => setEmployeesAccessPanel(null)}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </header>

        <div className="staffLoginModalBody">
          {(((showOrgHr || isTenantScopedView) && branchDirectory.length > 1) ||
            canRequestLoginAccounts ||
            canManageLoginAccountsCatalog) && (
            <div className="staffLoginToolbar">
              {(showOrgHr || isTenantScopedView) && branchDirectory.length > 1 && (
                <label className="staffAccessModalBranchField staffAccessModalBranchField--inline">
                  {isArabic ? "فرع العرض" : "Branch filter"}
                  <BranchScopeSelect
                    pharmacies={branchDirectory}
                    value={loginAccountsPanelBranchFilter}
                    onChange={setLoginAccountsPanelBranchFilter}
                    isArabic={isArabic}
                    includeAllOption={{
                      value: "all",
                      label: isArabic ? "كل الفروع" : "All branches",
                    }}
                  />
                </label>
              )}
              {(canRequestLoginAccounts || canManageLoginAccountsCatalog) && (
                <button
                  type="button"
                  className="completeBtn staffLoginToolbarBtn staffAccessModalAddBtn"
                  disabled={!!busy}
                  onClick={openLoginAccountRequestFromEmployeesPanel}
                >
                  {isArabic
                    ? canRequestLoginAccounts
                      ? "طلب إضافة مستخدم دخول جديد"
                      : "إضافة مستخدم دخول جديد"
                    : canRequestLoginAccounts
                      ? "Request new login user"
                      : "Add login user"}
                </button>
              )}
            </div>
          )}

          <div className="staffLoginTableWrap">
            <table className="catalogAccountsTable staffAccessUsersTable">
              <thead>
                <tr>
                  {showOrgHr && loginAccountsPanelBranchFilter === "all" && (
                    <th>{isArabic ? "الفرع" : "Branch"}</th>
                  )}
                  <th>{isArabic ? "الدور" : "Role"}</th>
                  <th>{isArabic ? "الإيميل" : "Email"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{isArabic ? "الموظف" : "Employee"}</th>
                  <th>{isArabic ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {employeesPanelAccessUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showOrgHr && loginAccountsPanelBranchFilter === "all" ? 6 : 5}
                      className="catalogEmptyCell saasManageEmptyCell"
                    >
                      {isArabic
                        ? "لا يوجد مستخدمون في جدول users لهذا الفرع — أضفهم من Supabase كما في الخطوات أعلاه"
                        : "No rows in users for this branch — add them in Supabase as described above"}
                    </td>
                  </tr>
                ) : (
                  employeesPanelAccessUsers.map((user) => {
                    const assignedEmployee = user.employeeId
                      ? employeeById.get(user.employeeId)
                      : undefined;
                    const catalogAccount = loginCatalogByEmail.get(user.email.trim().toLowerCase());
                    return (
                      <tr key={user.uid}>
                        {showOrgHr && loginAccountsPanelBranchFilter === "all" && (
                          <td>{branchLabel(user.pharmacyId)}</td>
                        )}
                        <td>{getRoleLabel(user.role, isArabic)}</td>
                        <td dir="ltr">{user.email}</td>
                        <td>{renderSystemUserStatus(user)}</td>
                        <td>{assignedEmployee?.name || user.name || "—"}</td>
                        <td>
                          <div className="catalogAccountActions staffLoginActions">
                            <StaffEmployeeActionButton
                              icon="edit"
                              tone="edit"
                              label={
                                canManageLoginAccountsCatalog
                                  ? isArabic
                                    ? "تعديل"
                                    : "Edit"
                                  : isArabic
                                    ? "طلب تعديل"
                                    : "Edit request"
                              }
                              disabled={
                                !!busy ||
                                !catalogAccount ||
                                catalogAccount.editPending ||
                                (!canManageLoginAccountsCatalog &&
                                  (!canRequestLoginAccounts ||
                                    catalogAccount.status !== "approved"))
                              }
                              onClick={() => {
                                if (!catalogAccount) return;
                                setCatalogBranchFilter(catalogAccount.pharmacyId);
                                if (canManageLoginAccountsCatalog) {
                                  openCatalogAccountEdit(catalogAccount);
                                } else {
                                  openPasswordChangeRequest(catalogAccount);
                                }
                              }}
                            />
                            <StaffEmployeeActionButton
                              icon="delete"
                              tone="delete"
                              label={isArabic ? "حذف" : "Delete"}
                              disabled={
                                !!busy || !catalogAccount || !canManageLoginAccountsCatalog
                              }
                              loading={catalogAccount ? busy === `del-${catalogAccount.id}` : false}
                              onClick={() => {
                                if (!catalogAccount) return;
                                setCatalogBranchFilter(catalogAccount.pharmacyId);
                                void deleteCatalogAccount(catalogAccount);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
