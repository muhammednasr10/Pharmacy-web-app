import { resolveBranchDisplay } from "../../utils/branchLabel";
import type { BranchesPageState } from "./useBranchesPageState";

type Props = { state: BranchesPageState };

export default function BranchesTablePanel({ state }: Props) {
  const {
    isArabic,
    t,
    branches,
    appUser,
    effectiveBranchId,
    onSwitchBranch,
    openEditBranchModal,
    removeBranch,
    subscriptionBlocksWrite = false,
  } = state;

  if (branches.length === 0) {
    return (
      <p className="empty">
        {isArabic ? "لا توجد فروع — اضغط إضافة فرع" : "No branches — click Add Branch"}
      </p>
    );
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>{isArabic ? "الفرع" : "Branch"}</th>
            <th>{isArabic ? "الهاتف" : "Phone"}</th>
            <th>{isArabic ? "العنوان" : "Address"}</th>
            <th>{isArabic ? "الحالة" : "Status"}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => {
            const isCurrent = branch.id === effectiveBranchId;
            const display = resolveBranchDisplay(branch.id, branches, isArabic);
            return (
              <tr key={branch.id} className={isCurrent ? "branchActiveRow" : ""}>
                <td>
                  <strong>{display.branchName}</strong>
                  {isCurrent && (
                    <span className="badge ok branchCurrentTag">
                      {isArabic ? "نشط الآن" : "Active"}
                    </span>
                  )}
                </td>
                <td>{branch.phone || "-"}</td>
                <td>{branch.address || "-"}</td>
                <td>
                  <span className={branch.isActive !== false ? "badge ok" : "badge danger"}>
                    {branch.isActive !== false
                      ? isArabic
                        ? "مفعل"
                        : "Active"
                      : isArabic
                        ? "موقوف"
                        : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="actionButtons">
                    <button
                      type="button"
                      className="smallBtn"
                      disabled={isCurrent}
                      onClick={() => onSwitchBranch(branch.id)}
                    >
                      {isArabic ? "تبديل" : "Switch"}
                    </button>
                    {!subscriptionBlocksWrite ? (
                      <>
                        <button
                          type="button"
                          className="editBtn"
                          onClick={() => openEditBranchModal(branch)}
                        >
                          {isArabic ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={branch.id === "main" || branch.id === appUser?.pharmacyId}
                          onClick={() => void removeBranch(branch.id, display.branchName)}
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      </>
                    ) : null}
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
