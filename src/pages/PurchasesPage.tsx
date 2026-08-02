import ReorderSuggestionsModal from "../components/ReorderSuggestionsModal";
import PurchaseBatchModal from "./purchases/PurchaseBatchModal";
import PurchasesListPanel from "./purchases/PurchasesListPanel";
import { usePurchasesPageState } from "./purchases/usePurchasesPageState";
import type { PurchasesPageProps } from "./purchases/types";

export type { PurchasesPageProps } from "./purchases/types";

export default function PurchasesPage(props: PurchasesPageProps) {
  const state = usePurchasesPageState(props);
  const {
    isArabic,
    canUsePurchases,
    isSubscriptionExpired,
    branchOptions,
    showBranchColumn,
    medicines,
    fallbackSettings,
    defaultBranchId,
    showReorderModal,
    setShowReorderModal,
    openPurchaseModal,
    handleReorderDraft,
  } = state;

  return (
    <section className="card purchasesPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "المشتريات / توريد المخزون" : "Purchases / Stock Supply"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "سجل التوريدات حسب الفرع ورقم التوريد"
              : "Purchase history by branch and purchase number"}
          </p>
        </div>
        {canUsePurchases && (
          <div className="returnsHeaderBtns">
            <button
              type="button"
              className="editBtn"
              onClick={() => setShowReorderModal(true)}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "اقتراح من النواقص" : "Reorder suggestions"}
            </button>
            <button
              type="button"
              className="printFullBtn"
              onClick={openPurchaseModal}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل توريد جديد" : "New Purchase"}
            </button>
          </div>
        )}
      </div>

      <PurchasesListPanel state={state} />
      <PurchaseBatchModal state={state} />

      <ReorderSuggestionsModal
        isArabic={isArabic}
        open={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        medicines={medicines}
        branches={branchOptions}
        defaultBranchId={defaultBranchId}
        allowBranchPicker={showBranchColumn && branchOptions.length > 1}
        fallbackSettings={fallbackSettings}
        onApplyDraft={handleReorderDraft}
      />
    </section>
  );
}
