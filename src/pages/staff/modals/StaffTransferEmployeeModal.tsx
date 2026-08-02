import BranchScopeSelect from "../../../components/BranchScopeSelect";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffTransferEmployeeModal({ state }: Props) {
  const {
    isArabic,
    transferEmployee,
    setTransferEmployee,
    transferTargetBranchId,
    setTransferTargetBranchId,
    pharmacies,
    branchLabel,
    catalogByEmployeeId,
    busy,
    confirmTransferEmployee,
  } = state;

  if (!transferEmployee) return null;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal userModal staffTransferModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <h2>{isArabic ? "نقل موظف إلى فرع آخر" : "Transfer employee to another branch"}</h2>
          <button
            type="button"
            className="deleteSmallBtn"
            onClick={() => {
              setTransferEmployee(null);
              setTransferTargetBranchId("");
            }}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <p className="returnsSectionHint">
          {isArabic
            ? `الموظف: ${transferEmployee.name} — الفرع الحالي: ${branchLabel(transferEmployee.pharmacyId)}`
            : `Employee: ${transferEmployee.name} — current branch: ${branchLabel(transferEmployee.pharmacyId)}`}
        </p>
        {catalogByEmployeeId.get(transferEmployee.id) && (
          <p className="catalogLinkToolbarHint" dir="ltr">
            {isArabic ? "حساب الدخول: " : "Login: "}
            {catalogByEmployeeId.get(transferEmployee.id)?.email}
          </p>
        )}
        <div className="settingsField settingsFieldFull">
          <label htmlFor="transfer-target-branch">
            {isArabic ? "الفرع المستهدف" : "Target branch"} *
          </label>
          <BranchScopeSelect
            id="transfer-target-branch"
            pharmacies={pharmacies.filter((branch) => branch.id !== transferEmployee.pharmacyId)}
            value={transferTargetBranchId}
            onChange={setTransferTargetBranchId}
            isArabic={isArabic}
          />
        </div>
        <p className="catalogLinkToolbarHint">
          {isArabic
            ? "سيُحدَّث سجل الموظف وحساب الدخول المربوط (إن وُجد) ويُزامَن مع Supabase Auth."
            : "Updates the employee record and linked login account (if any), then syncs Supabase Auth."}
        </p>
        <div className="modalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={!!busy || !transferTargetBranchId}
            onClick={() => void confirmTransferEmployee()}
          >
            {busy === `transfer-emp-${transferEmployee.id}`
              ? isArabic
                ? "جاري النقل..."
                : "Transferring..."
              : isArabic
                ? "تأكيد النقل"
                : "Confirm transfer"}
          </button>
          <button
            type="button"
            className="editBtn"
            onClick={() => {
              setTransferEmployee(null);
              setTransferTargetBranchId("");
            }}
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
