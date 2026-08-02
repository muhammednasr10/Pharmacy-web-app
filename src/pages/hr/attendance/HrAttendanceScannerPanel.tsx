import AttendanceBarcodeInput from "../../../components/AttendanceBarcodeInput";
import { mapAttendanceScanError } from "../helpers";
import type { HrPageState } from "../useHrPageState";

type Props = { state: HrPageState };

export default function HrAttendanceScannerPanel({ state }: Props) {
  const {
    isArabic,
    showAttendanceScanner,
    attendanceScanMode,
    setAttendanceScanMode,
    loading,
    busyAction,
    handleAttendanceBarcodeScan,
    attendanceScanFeedback,
    setAttendanceScanFeedback,
  } = state;

  if (!showAttendanceScanner) return null;

  return (
    <section className="attendanceScannerPanel card">
      <div className="attendanceScannerHeader">
        <div>
          <h3>{isArabic ? "تسجيل الحضور بالباركود / QR" : "Barcode / QR attendance"}</h3>
          <p className="returnsSectionHint">
            {isArabic
              ? "امسح بطاقة الموظف أو كود EMP — يُسجّل حضوراً ثم انصرافاً تلقائياً"
              : "Scan the employee badge or EMP code — auto check-in then check-out"}
          </p>
        </div>
        <div className="attendanceScanModeBtns">
          {(
            [
              ["auto", isArabic ? "تلقائي" : "Auto"],
              ["in", isArabic ? "حضور فقط" : "Check-in only"],
              ["out", isArabic ? "انصراف فقط" : "Check-out only"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={`smallBtn ${attendanceScanMode === mode ? "completeBtn" : "editBtn"}`}
              onClick={() => setAttendanceScanMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <AttendanceBarcodeInput
        isArabic={isArabic}
        disabled={loading || !!busyAction}
        onBarcodeScan={async (code) => {
          try {
            await handleAttendanceBarcodeScan(code);
          } catch (error) {
            const message = mapAttendanceScanError(
              error instanceof Error ? error.message : "scan_failed",
              isArabic,
            );
            setAttendanceScanFeedback({ text: message, ok: false });
            window.setTimeout(() => setAttendanceScanFeedback(null), 2800);
            throw error;
          }
        }}
      />

      {attendanceScanFeedback && (
        <p
          className={`posMessage attendanceScanFeedback ${attendanceScanFeedback.ok ? "" : "error"}`}
        >
          {attendanceScanFeedback.text}
        </p>
      )}
    </section>
  );
}
