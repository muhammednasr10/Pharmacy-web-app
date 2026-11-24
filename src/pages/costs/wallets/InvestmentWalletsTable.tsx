import type { PharmacyWallet } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";

type Props = {
  isArabic: boolean;
  currency: string;
  wallets: PharmacyWallet[];
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
  deletingId: number | null;
  defaultPosSavingId: number | null;
  onEdit: (wallet: PharmacyWallet) => void;
  onDelete: (wallet: PharmacyWallet) => void;
  onSetDefaultPos: (wallet: PharmacyWallet) => void;
};

export default function InvestmentWalletsTable({
  isArabic,
  currency,
  wallets,
  canManageCosts,
  isSubscriptionExpired,
  deletingId,
  defaultPosSavingId,
  onEdit,
  onDelete,
  onSetDefaultPos,
}: Props) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>{isArabic ? "اسم المحفظة" : "Wallet name"}</th>
            <th>{isArabic ? "نوع المحفظة" : "Wallet type"}</th>
            <th>{isArabic ? "المبلغ الحالي" : "Current amount"}</th>
            <th>{isArabic ? "افتراضي نقطة البيع" : "POS default"}</th>
            {canManageCosts && <th>{isArabic ? "إجراءات" : "Actions"}</th>}
          </tr>
        </thead>
        <tbody>
          {wallets.map((wallet) => (
            <tr key={wallet.id}>
              <td>
                <strong>{wallet.name}</strong>
                {wallet.notes ? <div className="returnsSectionHint">{wallet.notes}</div> : null}
              </td>
              <td>{pharmacyService.getWalletTypeLabel(wallet.walletType, isArabic)}</td>
              <td>
                {Number(wallet.balance).toFixed(2)} {currency}
              </td>
              <td>
                {wallet.isDefaultPos ? (
                  <span className="badge ok">
                    {isArabic ? "افتراضي" : "Default"}
                  </span>
                ) : canManageCosts ? (
                  <button
                    type="button"
                    className="smallBtn"
                    disabled={isSubscriptionExpired || defaultPosSavingId === wallet.id}
                    onClick={() => onSetDefaultPos(wallet)}
                  >
                    {defaultPosSavingId === wallet.id
                      ? "..."
                      : isArabic
                        ? "تعيين افتراضي"
                        : "Set default"}
                  </button>
                ) : (
                  "—"
                )}
              </td>
              {canManageCosts && (
                <td>
                  <div className="actionButtons purchaseRowActions">
                    <button
                      type="button"
                      className="editBtn"
                      disabled={isSubscriptionExpired}
                      onClick={() => onEdit(wallet)}
                    >
                      {isArabic ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="deleteSmallBtn"
                      disabled={isSubscriptionExpired || deletingId === wallet.id}
                      onClick={() => onDelete(wallet)}
                    >
                      {deletingId === wallet.id ? "..." : isArabic ? "حذف" : "Delete"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
