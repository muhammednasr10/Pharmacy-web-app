import InvestmentWalletsTable from "./wallets/InvestmentWalletsTable";
import WalletFormModal from "./wallets/WalletFormModal";
import WalletTransferModal from "./wallets/WalletTransferModal";
import { useInvestmentWalletsState } from "./wallets/useInvestmentWalletsState";

type InvestmentPortfoliosTabProps = {
  isArabic: boolean;
  currency: string;
  pharmacyId: string;
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
};

export default function InvestmentPortfoliosTab({
  isArabic,
  currency,
  pharmacyId,
  canManageCosts,
  isSubscriptionExpired,
}: InvestmentPortfoliosTabProps) {
  const state = useInvestmentWalletsState({
    isArabic,
    pharmacyId,
    canManageCosts,
    isSubscriptionExpired,
  });

  return (
    <div className="investmentPortfoliosTab">
      <div className="cardHeader purchasesHistoryHeader">
        <div>
          <h2>{isArabic ? "المحافظ المالية" : "Financial wallets"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "صناديق نقدية وحسابات بنكية ومحافظ إلكترونية مع الرصيد الحالي"
              : "Cash drawers, bank accounts, and e-wallets with current balances"}
          </p>
        </div>
        {canManageCosts && (
          <div className="investmentWalletHeaderActions">
            <button
              type="button"
              className="smallBtn"
              disabled={!state.canTransfer}
              onClick={state.openTransferModal}
              title={
                state.wallets.length < 2
                  ? isArabic
                    ? "أضف محفظتين على الأقل للتحويل"
                    : "Add at least two wallets to transfer"
                  : undefined
              }
            >
              {isArabic ? "تحويل بين المحافظ" : "Transfer between wallets"}
            </button>
            <button
              type="button"
              className="smallBtn investmentPlanActionBtn"
              disabled={isSubscriptionExpired}
              onClick={state.openAddModal}
            >
              {isArabic ? "+ محفظة" : "+ Wallet"}
            </button>
          </div>
        )}
      </div>

      {!state.loading && state.wallets.length > 0 && (
        <p className="investmentMonthLabel">
          {isArabic
            ? `إجمالي الأرصدة: ${state.totalBalance.toFixed(2)} ${currency}`
            : `Total balances: ${state.totalBalance.toFixed(2)} ${currency}`}
        </p>
      )}

      {state.loading ? (
        <p className="empty">{isArabic ? "جاري تحميل المحافظ..." : "Loading wallets..."}</p>
      ) : state.wallets.length === 0 ? (
        <p className="empty">
          {isArabic
            ? "لا توجد محافظ بعد — أضف مثلاً «صندوق الكاشير» (كاش) أو «بنك CIB» (بنكية)"
            : "No wallets yet — add e.g. «Cashier drawer» (cash) or «CIB Bank» (bank)"}
        </p>
      ) : (
        <InvestmentWalletsTable
          isArabic={isArabic}
          currency={currency}
          wallets={state.wallets}
          canManageCosts={canManageCosts}
          isSubscriptionExpired={isSubscriptionExpired}
          deletingId={state.deletingId}
          defaultPosSavingId={state.defaultPosSavingId}
          onEdit={state.openEditModal}
          onDelete={(wallet) => void state.handleDelete(wallet)}
          onSetDefaultPos={(wallet) => void state.handleSetDefaultPos(wallet)}
        />
      )}

      {state.showModal ? (
        <WalletFormModal
          isArabic={isArabic}
          editing={Boolean(state.editing)}
          form={state.form}
          saving={state.saving}
          isSubscriptionExpired={isSubscriptionExpired}
          onChange={state.setForm}
          onSave={() => void state.handleSave()}
          onClose={state.closeModal}
        />
      ) : null}

      {state.showTransferModal ? (
        <WalletTransferModal
          isArabic={isArabic}
          currency={currency}
          wallets={state.wallets}
          form={state.transferForm}
          transferring={state.transferring}
          isSubscriptionExpired={isSubscriptionExpired}
          onChange={state.setTransferForm}
          onTransfer={() => void state.handleTransfer()}
          onClose={state.closeTransferModal}
        />
      ) : null}
    </div>
  );
}
