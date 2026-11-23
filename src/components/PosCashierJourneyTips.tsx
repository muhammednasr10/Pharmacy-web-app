import { useMemo, useState } from "react";
import type { AppUser, CashierShift } from "../types";
import { isPharmacyManager, isSuperAdmin } from "../utils/roles";

type PosCashierJourneyTipsProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  activeShift: CashierShift | null;
  cartItemsCount: number;
  isOnline: boolean;
  pendingOfflineSalesCount?: number;
};

export default function PosCashierJourneyTips({
  isArabic,
  appUser,
  activeShift,
  cartItemsCount,
  isOnline,
  pendingOfflineSalesCount = 0,
}: PosCashierJourneyTipsProps) {
  const [dismissed, setDismissed] = useState(false);

  const tip = useMemo(() => {
    if (!appUser) return null;
    const isCashierRole =
      appUser.role === "cashier" || isPharmacyManager(appUser) || isSuperAdmin(appUser);
    if (!isCashierRole) return null;

    if (!activeShift) {
      return isArabic
        ? "ابدأ وردية جديدة قبل البيع — الرصيد الافتتاحي يمكن أن يكون 0."
        : "Start a cashier shift before selling — opening cash can be 0.";
    }
    if (!isOnline && pendingOfflineSalesCount > 0) {
      return isArabic
        ? `أوفلاين: ${pendingOfflineSalesCount} فاتورة محلية بانتظار المزامنة عند عودة النت.`
        : `Offline: ${pendingOfflineSalesCount} local invoice(s) will sync when you reconnect.`;
    }
    if (cartItemsCount === 0) {
      return isArabic
        ? "امسح الباركود أو استخدم البحث السريع، ثم أكمل البيع. المرتجع الفوري من زر المرتجع."
        : "Scan a barcode or use quick search, then complete the sale. Instant return is on the Return button.";
    }
    return isArabic
      ? "راجع الكميات في السلة — أي كمية أكبر من 1 ستُطلب تأكيدها عند البيع."
      : "Check cart quantities — any qty greater than 1 is confirmed at checkout.";
  }, [
    appUser,
    activeShift,
    cartItemsCount,
    isArabic,
    isOnline,
    pendingOfflineSalesCount,
  ]);

  if (!tip || dismissed) return null;

  return (
    <div className="posCashierJourneyTips" role="note">
      <p>{tip}</p>
      <button type="button" className="deleteSmallBtn" onClick={() => setDismissed(true)}>
        {isArabic ? "إخفاء" : "Dismiss"}
      </button>
    </div>
  );
}
