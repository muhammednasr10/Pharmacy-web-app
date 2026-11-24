import BranchFormModal from "../../pages/branches/BranchFormModal";
import BranchesTablePanel from "../../pages/branches/BranchesTablePanel";
import type { BranchesPageState } from "../../pages/branches/useBranchesPageState";
import { canManageOrgBranchesWithTier } from "../../utils/subscriptionFeatures";

type InventoryBranchDataModalProps = {
  state: BranchesPageState;
  onClose: () => void;
};

export default function InventoryBranchDataModal({ state, onClose }: InventoryBranchDataModalProps) {
  const {
    isArabic,
    appUser,
    orgSubscriptionTier,
    canAddBranch,
    branchUsage,
    openAddBranchModal,
  } = state;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="invoiceModal inventoryBranchDataModal"
        onClick={(event) => event.stopPropagation()}
      >
        <BranchFormModal state={state} />

        <div className="modalHeader">
          <div>
            <h3>{isArabic ? "بيانات الفروع" : "Branch data"}</h3>
            <p className="mutedText">
              {branchUsage
                ? isArabic
                  ? `الفروع المستخدمة: ${branchUsage.used} من ${branchUsage.max}`
                  : `Branches in use: ${branchUsage.used} of ${branchUsage.max}`
                : isArabic
                  ? "إدارة بيانات الفروع والمخازن"
                  : "Manage branch and warehouse details"}
            </p>
          </div>
          <div className="actionButtons">
            {canManageOrgBranchesWithTier(appUser, orgSubscriptionTier) ? (
              <button
                type="button"
                className="printBtn"
                disabled={!canAddBranch}
                onClick={openAddBranchModal}
              >
                {isArabic ? "+ إضافة فرع" : "+ Add branch"}
              </button>
            ) : null}
            <button type="button" className="editBtn" onClick={onClose}>
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>

        <p className="hintText">
          {isArabic
            ? "تبديل الفرع النشط من الشريط العلوي. نقل المخزون من تبويب المخزن."
            : "Switch the active branch from the top bar. Transfer stock from the inventory tab."}
        </p>

        <BranchesTablePanel state={state} />
      </div>
    </div>
  );
}
