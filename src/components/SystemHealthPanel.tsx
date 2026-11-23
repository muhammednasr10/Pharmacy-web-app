import { useCallback, useEffect, useState } from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import {
  countPendingOfflineSales,
  listPendingOfflineShiftCloses,
  loadCachedMedicines,
} from "../utils/offlinePosStorage";

type SystemHealthPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
};

type HealthSnapshot = {
  pendingSales: number;
  pendingShiftCloses: number;
  cachedMedicines: number;
  cacheUpdatedAt: string | null;
};

function formatCacheAge(iso: string | null, isArabic: boolean): string {
  if (!iso) return isArabic ? "لا يوجد كاش" : "No cache";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return iso;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return isArabic ? "الآن" : "Just now";
  if (mins < 60) return isArabic ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return isArabic ? `منذ ${hours} س` : `${hours}h ago`;
  return new Date(iso).toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

export default function SystemHealthPanel({ isArabic, pharmacyId }: SystemHealthPanelProps) {
  const isOnline = useOnlineStatus();
  const [snapshot, setSnapshot] = useState<HealthSnapshot>({
    pendingSales: 0,
    pendingShiftCloses: 0,
    cachedMedicines: 0,
    cacheUpdatedAt: null,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const [pendingSales, closes, cached] = await Promise.all([
        countPendingOfflineSales(pharmacyId),
        listPendingOfflineShiftCloses(pharmacyId),
        loadCachedMedicines(pharmacyId),
      ]);
      setSnapshot({
        pendingSales,
        pendingShiftCloses: closes.filter((row) => row.status === "pending" || row.status === "failed")
          .length,
        cachedMedicines: cached.medicines.length,
        cacheUpdatedAt: cached.updatedAt,
      });
    } catch (error) {
      console.warn("System health refresh:", error);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    void refresh();
  }, [refresh, isOnline]);

  const rows: Array<{ label: string; value: string; warn?: boolean }> = [
    {
      label: isArabic ? "الاتصال" : "Connection",
      value: isOnline
        ? isArabic
          ? "متصل"
          : "Online"
        : isArabic
          ? "بدون إنترنت"
          : "Offline",
      warn: !isOnline,
    },
    {
      label: isArabic ? "مبيعات معلّقة أوفلاين" : "Queued offline sales",
      value: String(snapshot.pendingSales),
      warn: snapshot.pendingSales > 0,
    },
    {
      label: isArabic ? "إغلاقات وردية معلّقة" : "Queued shift closes",
      value: String(snapshot.pendingShiftCloses),
      warn: snapshot.pendingShiftCloses > 0,
    },
    {
      label: isArabic ? "أدوية في كاش الأوفلاين" : "Offline medicine cache",
      value: snapshot.cachedMedicines.toLocaleString(),
    },
    {
      label: isArabic ? "آخر تحديث للكاش" : "Cache last updated",
      value: formatCacheAge(snapshot.cacheUpdatedAt, isArabic),
    },
  ];

  return (
    <div className="settingsPanel systemHealthPanel" dir={isArabic ? "rtl" : "ltr"}>
      <div className="settingsPanelHeader">
        <div>
          <h3>{isArabic ? "صحة النظام" : "System health"}</h3>
          <p className="mutedText">
            {isArabic
              ? "حالة الاتصال، الطابور المحلي، وكاش نقطة البيع للأوفلاين."
              : "Connection status, local queues, and offline POS cache."}
          </p>
        </div>
        <button type="button" className="secondaryBtn" onClick={() => void refresh()} disabled={loading}>
          {loading ? (isArabic ? "جاري التحديث..." : "Refreshing...") : isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>
      <div className="systemHealthGrid">
        {rows.map((row) => (
          <div className={`systemHealthCard${row.warn ? " is-warn" : ""}`} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
