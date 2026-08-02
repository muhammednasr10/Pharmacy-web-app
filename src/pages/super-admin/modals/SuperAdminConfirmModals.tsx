import type { SuperAdminPageState } from "../useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminConfirmModals({ state }: Props) {
  const {
    isArabic,
    deleteTarget,
    setDeleteTarget,
    deleteUpdating,
    confirmDelete,
    statusTarget,
    setStatusTarget,
    statusUpdating,
    confirmStatusChange,
  } = state;

  return (
    <>
            {deleteTarget && (
              <div className="modalOverlay">
                <div
                  className="invoiceModal saasModal saasConfirmModal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modalHeader">
                    <div>
                      <h2>
                        {deleteTarget.kind === "organization"
                          ? isArabic
                            ? "حذف الصيدلية؟"
                            : "Delete pharmacy?"
                          : isArabic
                            ? "حذف الفرع؟"
                            : "Delete branch?"}
                      </h2>
                      <p>
                        {deleteTarget.kind === "organization" ? (
                          <>
                            {deleteTarget.pharmacy.name} (<code dir="ltr">{deleteTarget.pharmacy.id}</code>
                            )
                          </>
                        ) : (
                          <>
                            {(isArabic ? deleteTarget.branch.name : deleteTarget.branch.name_en) ||
                              deleteTarget.branch.name}{" "}
                            (<code dir="ltr">{deleteTarget.branch.id}</code>)
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="closeBtn"
                      disabled={deleteUpdating}
                      onClick={() => setDeleteTarget(null)}
                    >
                      ×
                    </button>
                  </div>

                  <p className="loginHint">
                    {deleteTarget.kind === "organization"
                      ? isArabic
                        ? deleteTarget.branchCount > 1
                          ? `سيتم حذف الصيدلية وجميع فروعها (${deleteTarget.branchCount}). تأكد أنها لا تحتوي بيانات مهمة (مستخدمين/أدوية/فواتير).`
                          : "سيتم حذف الصيدلية نهائياً. تأكد أنها لا تحتوي بيانات مهمة (مستخدمين/أدوية/فواتير)."
                        : deleteTarget.branchCount > 1
                          ? `This will permanently delete the pharmacy and all ${deleteTarget.branchCount} branches. Make sure there is no important data (users/medicines/invoices).`
                          : "This will permanently delete the pharmacy. Make sure there is no important data (users/medicines/invoices)."
                      : isArabic
                        ? "سيتم حذف الفرع نهائياً. تأكد أنه لا يحتوي بيانات (أدوية/فواتير/مستخدمين)."
                        : "This will permanently delete the branch. Make sure it has no medicines, invoices, or users."}
                  </p>

                  <div className="modalActions saasModalActions">
                    <button
                      type="button"
                      className="deleteSmallBtn"
                      disabled={deleteUpdating}
                      onClick={() => setDeleteTarget(null)}
                    >
                      {isArabic ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      className="dangerBtn"
                      disabled={deleteUpdating}
                      onClick={() => void confirmDelete()}
                    >
                      {deleteUpdating
                        ? isArabic
                          ? "جاري الحذف..."
                          : "Deleting..."
                        : isArabic
                          ? "حذف"
                          : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {statusTarget && (
              <div className="modalOverlay">
                <div
                  className="invoiceModal saasModal saasConfirmModal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modalHeader">
                    <div>
                      <h2>
                        {statusTarget.nextStatus === "suspended"
                          ? isArabic
                            ? "إيقاف الصيدلية؟"
                            : "Suspend pharmacy?"
                          : isArabic
                            ? "تفعيل الصيدلية؟"
                            : "Activate pharmacy?"}
                      </h2>
                      <p>
                        {statusTarget.pharmacy.name} (<code dir="ltr">{statusTarget.pharmacy.id}</code>)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="closeBtn"
                      disabled={statusUpdating}
                      onClick={() => setStatusTarget(null)}
                    >
                      ×
                    </button>
                  </div>

                  <p className="loginHint">
                    {statusTarget.nextStatus === "suspended"
                      ? isArabic
                        ? "المستخدمون لن يتمكنوا من الدخول حتى تعيد التفعيل."
                        : "Users will not be able to sign in until you reactivate."
                      : isArabic
                        ? "سيتمكن مستخدمو الصيدلية من الدخول مرة أخرى."
                        : "Pharmacy users will be able to sign in again."}
                  </p>

                  <div className="modalActions saasModalActions">
                    <button
                      type="button"
                      className="deleteSmallBtn"
                      disabled={statusUpdating}
                      onClick={() => setStatusTarget(null)}
                    >
                      {isArabic ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      className={statusTarget.nextStatus === "suspended" ? "dangerBtn" : "completeBtn"}
                      disabled={statusUpdating}
                      onClick={() => void confirmStatusChange()}
                    >
                      {statusUpdating
                        ? isArabic
                          ? "جاري التحديث..."
                          : "Updating..."
                        : statusTarget.nextStatus === "suspended"
                          ? isArabic
                            ? "إيقاف"
                            : "Suspend"
                          : isArabic
                            ? "تفعيل"
                            : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            )}
    </>
  );
}
