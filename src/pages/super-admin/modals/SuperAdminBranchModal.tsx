import { formatUsageLabel } from "../helpers";
import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminBranchModal({ state }: Props) {
  const {
    isArabic,
    selected,
    selectedBranchUsage,
    branchModalMode,
    branchForm,
    setBranchForm,
    creatingBranch,
    closeBranchModal,
    submitBranchForm,
  } = state;

  if (!branchModalMode || !selected) return null;

  return (
            <div className="modalOverlay">
              <div className="invoiceModal saasModal" onClick={(e) => e.stopPropagation()}>
                <div className="modalHeader">
                  <div>
                    <h2>
                      {branchModalMode === "edit"
                        ? isArabic
                          ? "تعديل الفرع"
                          : "Edit Branch"
                        : isArabic
                          ? "إضافة فرع"
                          : "Add Branch"}
                    </h2>
                    <p>
                      {selected.name} —{" "}
                      {selectedBranchUsage
                        ? formatUsageLabel(
                            selectedBranchUsage.used,
                            selectedBranchUsage.max,
                            "فرع",
                            "branches",
                            isArabic,
                          )
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="closeBtn"
                    disabled={creatingBranch}
                    onClick={closeBranchModal}
                  >
                    ×
                  </button>
                </div>

                <p className="loginHint">
                  {branchModalMode === "edit"
                    ? isArabic
                      ? "عدّل بيانات الفرع ثم احفظ."
                      : "Update branch details and save."
                    : isArabic
                      ? "سيُنشأ فرع جديد ضمن نفس مجموعة الصيدلية ويظهر في قائمة الفروع فوراً."
                      : "A new branch will be created under the same organization and appear in the branch list immediately."}
                </p>

                <div className="formGrid saasFormGrid">
                  <label className="saasField">
                    <span>{isArabic ? "اسم الفرع" : "Branch name"}</span>
                    <input
                      value={branchForm.name}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={isArabic ? "فرع المعادي" : "Maadi Branch"}
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "الاسم بالإنجليزي" : "English name"}</span>
                    <input
                      value={branchForm.name_en}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, name_en: e.target.value }))}
                      placeholder="Maadi Branch"
                      dir="ltr"
                    />
                  </label>
                  <label className="saasField">
                    <span>{isArabic ? "الهاتف" : "Phone"}</span>
                    <input
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="01020304050"
                      dir="ltr"
                    />
                  </label>
                  <label className="saasField saasFieldFull">
                    <span>{isArabic ? "العنوان" : "Address"}</span>
                    <input
                      value={branchForm.address}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder={isArabic ? "القاهرة" : "Cairo"}
                    />
                  </label>
                </div>

                <div className="modalActions saasModalActions">
                  <button
                    type="button"
                    className="deleteSmallBtn"
                    disabled={creatingBranch}
                    onClick={closeBranchModal}
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={creatingBranch}
                    onClick={() => void submitBranchForm()}
                  >
                    {creatingBranch
                      ? isArabic
                        ? "جاري الحفظ..."
                        : "Saving..."
                      : branchModalMode === "edit"
                        ? isArabic
                          ? "حفظ التعديلات"
                          : "Save changes"
                        : isArabic
                          ? "إضافة الفرع"
                          : "Add Branch"}
                  </button>
                </div>
              </div>
            </div>
  );
}
