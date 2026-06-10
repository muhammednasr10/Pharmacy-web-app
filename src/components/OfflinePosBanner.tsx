type OfflinePosBannerProps = {
  isArabic: boolean;
  isOnline: boolean;
  pendingCount: number;
  cacheUpdatedAt: string | null;
  isSyncing?: boolean;
};

function formatCacheAge(isArabic: boolean, updatedAt: string | null) {
  if (!updatedAt) {
    return isArabic ? "لا توجد نسخة مخزون محفوظة" : "No cached inventory snapshot";
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

export default function OfflinePosBanner({
  isArabic,
  isOnline,
  pendingCount,
  cacheUpdatedAt,
  isSyncing = false,
}: OfflinePosBannerProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const offline = !isOnline;

  return (
    <div className={`offlinePosBanner ${offline ? "isOffline" : "isOnline"}`} role="status">
      <div className="offlinePosBannerMain">
        <strong>
          {offline
            ? isArabic
              ? "وضع عدم الاتصال — نقطة البيع محدودة"
              : "Offline mode — limited POS"
            : isSyncing
              ? isArabic
                ? "جارٍ مزامنة المبيعات المحفوظة..."
                : "Syncing saved offline sales..."
              : isArabic
                ? "متصل — مبيعات بانتظار المزامنة"
                : "Online — sales waiting to sync"}
        </strong>
        <p>
          {offline
            ? isArabic
              ? "يمكنك البيع نقداً/فيزا/محفظة من المخزون المحفوظ محلياً. البيع الآجل والتعليق غير متاحين حتى عودة الاتصال."
              : "Cash, card, and wallet sales use locally cached stock. Credit sales and hold invoice are unavailable until you are back online."
            : pendingCount > 0
              ? isArabic
                ? `${pendingCount} فاتورة محفوظة محلياً بانتظار الرفع للسيرفر.`
                : `${pendingCount} locally saved invoice(s) waiting to upload.`
              : isArabic
                ? "تمت مزامنة المبيعات المحفوظة."
                : "Offline sales have been synced."}
        </p>
      </div>
      <div className="offlinePosBannerMeta">
        <span>{isArabic ? "آخر نسخة مخزون:" : "Inventory cache:"}</span>
        <strong>{formatCacheAge(isArabic, cacheUpdatedAt)}</strong>
      </div>
    </div>
  );
}
