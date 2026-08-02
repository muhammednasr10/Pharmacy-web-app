import { canManageOrgBranchesWithTier } from "../utils/subscriptionFeatures";
import BranchFormModal from "./branches/BranchFormModal";
import BranchesTablePanel from "./branches/BranchesTablePanel";
import BranchTransfersPanel from "./branches/BranchTransfersPanel";
import { useBranchesPageState } from "./branches/useBranchesPageState";
import type { BranchesPageProps } from "./branches/types";

export type { BranchesPageProps } from "./branches/types";

export default function BranchesPage(props: BranchesPageProps) {
  const state = useBranchesPageState(props);
  const {
    isArabic,
    appUser,
    orgSubscriptionTier,
    canTransfer,
    canAddBranch,
    branchUsage,
    openAddBranchModal,
    setShowBranchTransferModal,
  } = state;

  return (
    <section className="card branchesPage">
      <BranchFormModal state={state} />

      <div className="cardHeader">
        <h2>{isArabic ? "الفروع" : "Branches"}</h2>
        <div className="actionButtons">
          {canTransfer && (
            <button
              type="button"
              className="editBtn"
              onClick={() => setShowBranchTransferModal(true)}
            >
              {isArabic ? "⇄ نقل مخزون" : "⇄ Transfer stock"}
            </button>
          )}
          {canManageOrgBranchesWithTier(appUser, orgSubscriptionTier) && (
            <button
              type="button"
              className="printBtn"
              disabled={!canAddBranch}
              onClick={openAddBranchModal}
            >
              {isArabic ? "+ إضافة فرع" : "+ Add Branch"}
            </button>
          )}
        </div>
      </div>

      <p className="hintText">
        {branchUsage
          ? isArabic
            ? `الفروع المستخدمة: ${branchUsage.used} من ${branchUsage.max}. كل فرع له مخزونه وفواتيره وبياناته المنفصلة.`
            : `Branches in use: ${branchUsage.used} of ${branchUsage.max}. Each branch has its own inventory, invoices, and data.`
          : isArabic
            ? "كل فرع له مخزونه وفواتيره وبياناته المنفصلة. اختر الفرع النشط لعرض وإدارة بياناته."
            : "Each branch has its own separate inventory, invoices, and data. Pick the active branch to view and manage its data."}
      </p>

      <BranchesTablePanel state={state} />
      <BranchTransfersPanel state={state} />
    </section>
  );
}
