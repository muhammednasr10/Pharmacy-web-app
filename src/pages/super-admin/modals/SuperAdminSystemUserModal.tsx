import BranchScopeSelect from "../../../components/BranchScopeSelect";
import { normalizeRole } from "../../../utils/roles";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminSystemUserModal({ state }: Props) {
  const {
    systemUserModalOpen,
    isArabic,
    selected,
    selectedOrgBranches,
    systemUserModalMode,
    systemUserForm,
    setSystemUserForm,
    showSystemUserPassword,
    setShowSystemUserPassword,
    canPickSystemUserBranch,
    manageRoleSelectEntries,
    savingSystemUser,
    closeSystemUserModal,
    saveSystemUserForm,
  } = state;

  if (!systemUserModalOpen || !selected) return null;

  return (
            <div className="modalOverlay">
              <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                  <div>
                    <h2>
                      {systemUserModalMode === "edit"
                        ? isArabic
                          ? "تعديل مستخدم"
                          : "Edit user"
                        : isArabic
                          ? "إضافة مستخدم"
                          : "Add user"}
                    </h2>
                    <p>{selected.name}</p>
                  </div>
                  <button
                    type="button"
                    className="closeBtn"
                    disabled={savingSystemUser}
                    onClick={closeSystemUserModal}
                  >
                    ×
                  </button>
                </div>

                <div className="formGrid saasFormGrid">
                  {canPickSystemUserBranch && (
                    <label className="saasField saasFieldFull">
                      <span>{isArabic ? "الفرع" : "Branch"}</span>
                      <BranchScopeSelect
                        pharmacies={selectedOrgBranches}
                        value={systemUserForm.pharmacyId || selected.id}
                        onChange={(pharmacyId) =>
                          setSystemUserForm((prev) => ({ ...prev, pharmacyId }))
                        }
                        isArabic={isArabic}
                      />
                    </label>
                  )}
                  <label className="saasField saasFieldFull">
                    <span>{isArabic ? "الدور" : "Role"}</span>
                    <select
                      value={systemUserForm.role}
                      onChange={(e) =>
                        setSystemUserForm((prev) => ({
                          ...prev,
                          role: normalizeRole(e.target.value),
                        }))
                      }
                    >
                      {manageRoleSelectEntries.length === 0 ? (
                        <option value="">
                          {isArabic ? "لا توجد أدوار — أضفها من تبويب الأدوار" : "No roles — add them in the Roles tab"}
                        </option>
                      ) : (
                        manageRoleSelectEntries.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>{isArabic ? "الإيميل" : "Email"}</span>
                    <input
                      type="email"
                      value={systemUserForm.email}
                      onChange={(e) =>
                        setSystemUserForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      dir="ltr"
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>
                      {systemUserModalMode === "edit"
                        ? isArabic
                          ? "كلمة المرور (للمشاركة مع العميل)"
                          : "Password (share with customer)"
                        : isArabic
                          ? "كلمة المرور"
                          : "Password"}
                    </span>
                    <div className="loginPasswordField">
                      <input
                        type={showSystemUserPassword ? "text" : "password"}
                        value={systemUserForm.password}
                        onChange={(e) =>
                          setSystemUserForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                        dir="ltr"
                        autoComplete={systemUserModalMode === "add" ? "new-password" : "off"}
                      />
                      <button
                        type="button"
                        className="loginPasswordToggle"
                        onClick={() => setShowSystemUserPassword((visible) => !visible)}
                        aria-label={
                          showSystemUserPassword
                            ? isArabic
                              ? "إخفاء كلمة المرور"
                              : "Hide password"
                            : isArabic
                              ? "إظهار كلمة المرور"
                              : "Show password"
                        }
                      >
                        {showSystemUserPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M3 3l18 18M10.58 10.58A2 2 0 0012 15a2 2 0 001.42-.58M9.88 5.09A10.94 10.94 0 0112 5c5.52 0 10 4.48 10 7a11.2 11.2 0 01-2.09 2.91M6.1 6.1A11.17 11.17 0 002 12c0 2.52 4.48 7 10 7 1.74 0 3.37-.45 4.8-1.24"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M2 12s4.48-7 10-7 10 7 10 7-4.48 7-10 7-10-7-10-7z"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {systemUserModalMode === "edit" && !systemUserForm.password && (
                      <p className="loginHint" style={{ marginTop: "0.35rem" }}>
                        {isArabic
                          ? "كلمة المرور غير مخزّنة هنا — عيّن واحدة جديدة واحفظ لتظهر في المرات القادمة."
                          : "Password not stored here — set a new one and save to keep it for next time."}
                      </p>
                    )}
                  </label>
                  {systemUserModalMode === "edit" && (
                    <label className="saasField saasFieldFull saasCheckboxField">
                      <input
                        type="checkbox"
                        checked={systemUserForm.isActive}
                        onChange={(e) =>
                          setSystemUserForm((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                      />
                      <span>{isArabic ? "الحساب نشط" : "Account active"}</span>
                    </label>
                  )}
                </div>

                <p className="loginHint">
                  {isArabic
                    ? "يمكنك تعديل الفرع والدور والإيميل وكلمة المرور. ربط الحساب بالموظف يتم من صفحة الموظفين."
                    : "You can edit branch, role, email, and password. Link the account to an employee from the Staff page."}
                </p>

                <div className="modalActions saasModalActions">
                  <button
                    type="button"
                    className="deleteSmallBtn"
                    disabled={savingSystemUser}
                    onClick={closeSystemUserModal}
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={savingSystemUser}
                    onClick={() => void saveSystemUserForm()}
                  >
                    {savingSystemUser
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
