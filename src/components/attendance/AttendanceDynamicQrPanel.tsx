import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { fetchDynamicAttendanceQr } from "../../services/secureAttendanceService";
import { ATTENDANCE_QR_REFRESH_MS, ATTENDANCE_QR_TTL_SECONDS } from "../../utils/secureAttendanceQr";

type AttendanceDynamicQrPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  branchLabel?: string;
  defaultExpanded?: boolean;
};

export default function AttendanceDynamicQrPanel({
  isArabic,
  pharmacyId,
  branchLabel,
  defaultExpanded = false,
}: AttendanceDynamicQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(ATTENDANCE_QR_TTL_SECONDS);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const windowStartRef = useRef(0);

  const refreshQr = useCallback(async () => {
    if (!pharmacyId) return;
    try {
      const payload = await fetchDynamicAttendanceQr(pharmacyId);
      const dataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(dataUrl);
      setError("");
      windowStartRef.current = Date.now();
      setSecondsLeft(ATTENDANCE_QR_TTL_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "qr_failed");
      setQrDataUrl("");
    }
  }, [pharmacyId]);

  useEffect(() => {
    if (collapsed || !pharmacyId) return;
    void refreshQr();
    const refreshTimer = window.setInterval(() => {
      void refreshQr();
    }, ATTENDANCE_QR_REFRESH_MS);
    return () => window.clearInterval(refreshTimer);
  }, [collapsed, pharmacyId, refreshQr]);

  useEffect(() => {
    if (collapsed) return;
    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - windowStartRef.current) / 1000);
      setSecondsLeft(Math.max(0, ATTENDANCE_QR_TTL_SECONDS - elapsed));
    }, 500);
    return () => window.clearInterval(tick);
  }, [collapsed, qrDataUrl]);

  return (
    <div className="attendanceDynamicQrPanel cardInner">
      <button
        type="button"
        className="attendanceDynamicQrToggle"
        onClick={() => setCollapsed((value) => !value)}
      >
        <span>{isArabic ? "رمز الحضور للفرع" : "Branch attendance QR"}</span>
        <span className="attendanceDynamicQrToggleMeta">
          {branchLabel ? `${branchLabel} · ` : ""}
          {collapsed ? (isArabic ? "عرض" : "Show") : (isArabic ? "إخفاء" : "Hide")}
        </span>
      </button>

      {!collapsed && (
        <div className="attendanceDynamicQrBody">
          <p className="attendanceDynamicQrHint">
            {isArabic
              ? `اعرض هذا الرمز على تابلت أو شاشة عند مدخل الفرع. يتجدد كل ${ATTENDANCE_QR_TTL_SECONDS} ثوانٍ. الموظفون يمسحونه من موبايلهم عبر «حضور بصمة» مع تفعيل GPS.`
              : `Show this QR on a branch tablet or screen at the entrance. Refreshes every ${ATTENDANCE_QR_TTL_SECONDS} seconds. Staff scan it from their phone via «Secure check-in» with GPS enabled.`}
          </p>
          {error ? (
            <p className="attendanceDynamicQrError">
              {error.includes("not_authorized")
                ? isArabic
                  ? "لا توجد صلاحية لعرض QR"
                  : "Not allowed to display QR"
                : isArabic
                  ? "تعذر توليد QR — شغّل secure-attendance-geofence.sql في Supabase"
                  : "Could not generate QR — run secure-attendance-geofence.sql in Supabase"}
            </p>
          ) : qrDataUrl ? (
            <div className="attendanceDynamicQrVisual">
              <img src={qrDataUrl} alt={isArabic ? "رمز حضور" : "Attendance QR"} />
              <span className="attendanceDynamicQrTimer">
                {isArabic ? `صلاحية ${secondsLeft} ث` : `Valid ${secondsLeft}s`}
              </span>
            </div>
          ) : (
            <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
          )}
        </div>
      )}
    </div>
  );
}
