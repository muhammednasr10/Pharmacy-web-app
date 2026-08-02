import BranchScopeSelect from "../../../components/BranchScopeSelect";
import { CUSTOM_ROLE_TEMPLATE_OPTIONS } from "../../../utils/customRolePages";
import { getRoleLabel } from "../../../utils/roles";
import type { UserRole } from "../../../types";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminRoleModal({ state }: Props) {
  const {
    roleModalOpen,
    isArabic,
    pharmacies,
    pharmacyNameById,
    roleForm,
    setRoleForm,
    savingRole,
    closeRoleModal,
    saveRoleForm,
  } = state;

  if (!roleModalOpen) return null;

  return (
            <div className="modalOverlay">
              <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                  <div>
                    <h2>
                      {roleForm.id || roleForm.kind === "builtin"
                        ? isArabic
                          ? "تعديل الدور"
                          : "Edit role"
                        : isArabic
                          ? "إضافة دور"
                          : "Add role"}
                    </h2>
                    <p>
                      {pharmacyNameById.get(roleForm.pharmacyId) || roleForm.pharmacyId || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="closeBtn"
                    disabled={savingRole}
                    onClick={closeRoleModal}
                  >
                    ×
                  </button>
                </div>

                <div className="formGrid saasFormGrid">
                  {roleForm.kind === "custom" && !roleForm.id && (
                    <label className="saasField saasFieldFull">
                      <span>{isArabic ? "الفرع" : "Branch"}</span>
                      <BranchScopeSelect
                        pharmacies={pharmacies}
                        value={roleForm.pharmacyId}
                        onChange={(pharmacyId) =>
                          setRoleForm((prev) => ({ ...prev, pharmacyId }))
                        }
                        isArabic={isArabic}
                      />
                    </label>
                  )}
                  <label className="saasField">
                    <span>{isArabic ? "اسم الدور (عربي)" : "Role name (Arabic)"}</span>
                    <input
                      value={roleForm.nameAr}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                      placeholder={isArabic ? "مندوب مبيعات" : "Sales rep"}
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "اسم الدور (إنجليزي)" : "Role name (English)"}</span>
                    <input
                      value={roleForm.nameEn}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                      placeholder="Sales rep"
                      dir="ltr"
                    />
                  </label>
                  {!roleForm.id && roleForm.kind === "custom" && (
                    <label className="saasField saasFieldFull">
                      <span>{isArabic ? "قالب الصلاحيات" : "Permission template"}</span>
                      <select
                        value={roleForm.baseRole}
                        onChange={(e) =>
                          setRoleForm((prev) => ({
                            ...prev,
                            baseRole: e.target.value as UserRole,
                          }))
                        }
                      >
                        {CUSTOM_ROLE_TEMPLATE_OPTIONS.map((roleKey) => (
                          <option key={roleKey} value={roleKey}>
                            {getRoleLabel(roleKey, isArabic)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="modalActions saasModalActions">
                  <button
                    type="button"
                    className="deleteSmallBtn"
                    disabled={savingRole}
                    onClick={closeRoleModal}
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={savingRole}
                    onClick={() => void saveRoleForm()}
                  >
                    {savingRole
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
