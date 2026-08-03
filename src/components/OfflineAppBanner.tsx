type OfflineAppBannerProps = {
  isArabic: boolean;
  isOnline: boolean;
  pendingCount: number;
  appDataCacheAt: string | null;
  isSyncing?: boolean;
};

function formatCacheAge(isArabic: boolean, updatedAt: string | null) {
  if (!updatedAt) {
    return isArabic ? "لا توجد نسخة محفوظة بعد" : "No cached snapshot yet";
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

export default function OfflineAppBanner({
  isArabic,
  isOnline,
  pendingCount,
  appDataCacheAt,
  isSyncing = false,
}: OfflineAppBannerProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const offline = !isOnline;

  return (
    <div className={`offlineAppBanner ${offline ? "isOffline" : "isOnline"}`} role="status">
      <div className="offlineAppBannerMain">
        <strong>
          {offline
            ? isArabic
              ? "وضع عدم الاتصال — يعمل من النسخة المحفوظة محلياً"
              : "Offline mode — using locally saved data"
            : isSyncing
              ? isArabic
                ? "جارٍ مزامنة البيانات مع السيرفر..."
                : "Syncing data with the server..."
              : isArabic
                ? "متصل — بيانات بانتظار المزامنة"
                : "Online — data waiting to sync"}
        </strong>
        <p>
          {offline
            ? isArabic
              ? "يمكنك تصفح آخر نسخة محفوظة والبيع من نقطة البيع. التعديلات تُرفع تلقائياً عند عودة الإنترنت."
              : "Browse the last saved snapshot and use POS. Changes upload automatically when you are back online."
            : pendingCount > 0
              ? isArabic
                ? `${pendingCount} عملية محفوظة محلياً (مبيعات) بانتظار الرفع.`
                : `${pendingCount} locally saved operation(s) waiting to upload.`
              : isArabic
                ? "تمت مزامنة البيانات المحفوظة."
                : "Locally saved data has been synced."}
        </p>
      </div>
      <div className="offlineAppBannerMeta">
        <span>{isArabic ? "آخر نسخة محفوظة:" : "Last saved snapshot:"}</span>
        <strong>{formatCacheAge(isArabic, appDataCacheAt)}</strong>
      </div>
    </div>
  );
}
