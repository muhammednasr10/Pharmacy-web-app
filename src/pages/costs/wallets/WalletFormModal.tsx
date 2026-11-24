import type { PharmacyWalletType } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import type { WalletFormState } from "./walletTypes";

type Props = {
  isArabic: boolean;
  editing: boolean;
  form: WalletFormState;
  saving: boolean;
  isSubscriptionExpired: boolean;
  onChange: (form: WalletFormState) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function WalletFormModal({
  isArabic,
  editing,
  form,
  saving,
  isSubscriptionExpired,
  onChange,
  onSave,
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
          <h2>
            {editing
              ? isArabic
                ? "تعديل محفظة"
                : "Edit wallet"
              : isArabic
                ? "إضافة محفظة"
                : "Add wallet"}
          </h2>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <div className="catalogAccountFormFields">
          <div className="settingsField settingsField--lg">
            <label>{isArabic ? "اسم المحفظة" : "Wallet name"}</label>
            <input
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder={isArabic ? "مثال: صندوق الكاشير / بنك CIB" : "e.g. Cashier drawer / CIB"}
              autoFocus
            />
          </div>
          <div className="settingsField settingsField--md">
            <label>{isArabic ? "النوع" : "Type"}</label>
            <select
              value={form.walletType}
              onChange={(e) =>
                onChange({ ...form, walletType: e.target.value as PharmacyWalletType })
              }
            >
              {pharmacyService.WALLET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {isArabic ? option.ar : option.en}
                </option>
              ))}
            </select>
          </div>
          <div className="settingsField settingsField--sm">
            <label>{isArabic ? "الرصيد" : "Balance"}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.balance}
              onChange={(e) =>
                onChange({
                  ...form,
                  balance: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="settingsField settingsFieldFull">
            <label>{isArabic ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
            <input
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              placeholder={isArabic ? "رقم الحساب / فرع البنك…" : "Account number / bank branch…"}
            />
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={saving || isSubscriptionExpired}
            onClick={onSave}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ"
                : "Save"}
          </button>
          <button type="button" className="editBtn" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
