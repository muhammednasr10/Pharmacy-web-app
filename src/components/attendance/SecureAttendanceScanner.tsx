import { useCallback, useMemo, useState } from "react";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "../BarcodeCameraScanner";
import { processSecureAttendance } from "../../services/secureAttendanceService";
import { getCurrentGeoPosition, formatGeolocationError } from "../../utils/geolocation";
import {
  formatSecureAttendanceError,
  type SecureAttendanceAction,
} from "../../utils/secureAttendanceQr";

type SecureAttendanceScannerProps = {
  isArabic: boolean;
  action: SecureAttendanceAction;
  disabled?: boolean;
  onSuccess?: (action: SecureAttendanceAction) => void;
};

export default function SecureAttendanceScanner({
  isArabic,
  action,
  disabled = false,
  onSuccess,
}: SecureAttendanceScannerProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const cameraSupported = canUseBarcodeCameraScanner();

  const actionLabel = useMemo(() => {
    if (action === "check_out") {
      return isArabic ? "انصراف بصمة" : "Secure check-out";
    }
    return isArabic ? "حضور بصمة" : "Secure check-in";
  }, [action, isArabic]);

  const processScan = useCallback(
    async (qrPayload: string) => {
      if (busy || disabled) return;
      setBusy(true);
      setStatus(null);
      setCameraOpen(false);

      try {
        const position = await getCurrentGeoPosition();
        const result = await processSecureAttendance({
          qrPayload: qrPayload.trim(),
          latitude: position.latitude,
          longitude: position.longitude,
          action,
        });

        if (!result.ok) {
          const code = result.error || "unknown";
          let message = formatSecureAttendanceError(code, isArabic);
          if (code === "outside_geofence" && result.distanceM != null) {
            message += isArabic
              ? ` (المسافة: ${result.distanceM} م)`
              : ` (distance: ${result.distanceM} m)`;
          }
          setStatus({ tone: "err", message });
          return;
        }

        const successMessage =
          action === "check_out"
            ? isArabic
              ? `تم تسجيل الانصراف بنجاح (${result.distanceM ?? "?"} م من الفرع)`
              : `Check-out recorded (${result.distanceM ?? "?"} m from branch)`
            : isArabic
              ? `تم تسجيل الحضور بنجاح (${result.distanceM ?? "?"} م من الفرع)`
              : `Check-in recorded (${result.distanceM ?? "?"} m from branch)`;

        setStatus({ tone: "ok", message: successMessage });
        onSuccess?.(action);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (
          message.startsWith("location_") ||
          message === "geolocation_unsupported"
        ) {
          setStatus({ tone: "err", message: formatGeolocationError(message, isArabic) });
        } else {
          setStatus({
            tone: "err",
            message: formatSecureAttendanceError(message, isArabic),
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [action, busy, disabled, isArabic, onSuccess],
  );

  return (
    <div className="secureAttendanceScanner">
      <p className="secureAttendanceScannerHint">
        {isArabic
          ? "امسح رمز QR المعروض على تابلت الفرع — يجب أن تكون داخل نطاق الصيدلية (GPS)."
          : "Scan the branch QR code on the entrance tablet — you must be within the pharmacy geofence (GPS)."}
      </p>

      <button
        type="button"
        className="completeBtn secureAttendanceScannerBtn"
        disabled={disabled || busy || !cameraSupported}
        onClick={() => setCameraOpen(true)}
      >
        {busy
          ? isArabic
            ? "جاري التحقق..."
            : "Verifying..."
          : actionLabel}
      </button>

      {!cameraSupported && (
        <p className="secureAttendanceScannerWarn">
          {isArabic
            ? "استخدم Chrome على الموبايل لمسح QR بالكاميرا."
            : "Use Chrome on mobile to scan QR with the camera."}
        </p>
      )}

      {status && (
        <div
          className={`secureAttendanceScannerStatus secureAttendanceScannerStatus--${status.tone}`}
          role="status"
        >
          {status.message}
        </div>
      )}

      {cameraOpen && (
        <BarcodeCameraScanner
          isArabic={isArabic}
          includeQrCode
          onDetected={(code) => {
            void processScan(code);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
