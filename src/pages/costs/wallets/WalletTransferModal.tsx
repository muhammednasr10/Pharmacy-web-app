import type { PharmacyWallet } from "../../../types";
import type { TransferFormState } from "./walletTypes";

type Props = {
  isArabic: boolean;
  currency: string;
  wallets: PharmacyWallet[];
  form: TransferFormState;
  transferring: boolean;
  isSubscriptionExpired: boolean;
  onChange: (form: TransferFormState) => void;
  onTransfer: () => void;
  onClose: () => void;
};

export default function WalletTransferModal({
  isArabic,
  currency,
  wallets,
  form,
  transferring,
  isSubscriptionExpired,
  onChange,
  onTransfer,
  onClose,
}: Props) {
  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal costModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <h2>{isArabic ? "تحويل بين المحافظ" : "Transfer between wallets"}</h2>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="catalogAccountFormFields">
          <div className="settingsField settingsField--md">
            <label>{isArabic ? "من محفظة" : "From wallet"}</label>
            <select
              value={form.fromWalletId}
              onChange={(e) => onChange({ ...form, fromWalletId: e.target.value })}
            >
              <option value="">{isArabic ? "اختر…" : "Select…"}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({Number(wallet.balance).toFixed(2)} {currency})
                </option>
              ))}
            </select>
          </div>
          <div className="settingsField settingsField--md">
            <label>{isArabic ? "إلى محفظة" : "To wallet"}</label>
            <select
              value={form.toWalletId}
              onChange={(e) => onChange({ ...form, toWalletId: e.target.value })}
            >
              <option value="">{isArabic ? "اختر…" : "Select…"}</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({Number(wallet.balance).toFixed(2)} {currency})
                </option>
              ))}
            </select>
          </div>
          <div className="settingsField settingsField--sm">
            <label>{isArabic ? "المبلغ" : "Amount"}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => onChange({ ...form, amount: e.target.value })}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={transferring || isSubscriptionExpired}
            onClick={onTransfer}
          >
            {transferring
              ? isArabic
                ? "جاري التحويل..."
                : "Transferring..."
              : isArabic
                ? "تحويل"
                : "Transfer"}
          </button>
          <button type="button" className="editBtn" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
