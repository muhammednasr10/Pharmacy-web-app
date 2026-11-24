import { useState } from "react";
import { phonesMatchForUnlock } from "../../utils/pharmacyPhoneUnlock";

type Props = {
  isArabic: boolean;
  pharmacyPhone: string;
  onUnlock: () => void;
  onClose: () => void;
};

export default function InventoryBuyPriceUnlockModal({
  isArabic,
  pharmacyPhone,
  onUnlock,
  onClose,
}: Props) {
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!phonesMatchForUnlock(phoneInput, pharmacyPhone)) {
      setError(
        isArabic
          ? "رقم التليفون غير صحيح — استخدم رقم التسجيل"
          : "Incorrect phone — use the registration phone number",
      );
      return;
    }
    onUnlock();
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="invoiceModal inventoryBuyPriceUnlockModal"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <h2>{isArabic ? "إظهار سعر الشراء" : "Show buy price"}</h2>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <p className="returnsSectionHint">
          {isArabic
            ? "أدخل رقم تليفون الصيدلية المسجّل عند الاشتراك لإظهار عمود سعر الشراء."
            : "Enter the pharmacy phone used at registration to reveal the buy price column."}
        </p>
        <form className="catalogAccountFormFields" onSubmit={handleSubmit}>
          <div className="settingsField settingsField--md">
            <label htmlFor="inventory-buy-price-unlock-phone">
              {isArabic ? "رقم التليفون" : "Phone number"}
            </label>
            <input
              id="inventory-buy-price-unlock-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={phoneInput}
              onChange={(event) => {
                setPhoneInput(event.target.value);
                if (error) setError("");
              }}
              placeholder={isArabic ? "01xxxxxxxxx" : "01xxxxxxxxx"}
            />
          </div>
          {error ? (
            <p className="invMgmtError" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modalActions">
            <button type="submit" className="completeBtn">
              {isArabic ? "إظهار العمود" : "Show column"}
            </button>
            <button type="button" className="editBtn" onClick={onClose}>
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
