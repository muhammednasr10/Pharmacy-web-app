import { useCallback, useEffect, useRef, useState } from "react";
import { useHardwareBarcodeScanner } from "../utils/useHardwareBarcodeScanner";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "./BarcodeCameraScanner";

type AttendanceBarcodeInputProps = {
  isArabic: boolean;
  disabled?: boolean;
  onBarcodeScan: (code: string) => void | Promise<void>;
};

export default function AttendanceBarcodeInput({
  isArabic,
  disabled = false,
  onBarcodeScan,
}: AttendanceBarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraSupported = canUseBarcodeCameraScanner();

  const focusInput = useCallback(() => {
    if (disabled || busy) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [busy, disabled]);

  const processBarcode = useCallback(
    async (raw: string) => {
      const clean = raw.trim();
      if (!clean || busy) return false;

      setBusy(true);
      try {
        await onBarcodeScan(clean);
        setValue("");
        focusInput();
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, focusInput, onBarcodeScan]
  );

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useHardwareBarcodeScanner({
    disabled: disabled || busy,
    onScan: (code) => {
      void processBarcode(code);
    },
    ignoreInputRef: inputRef,
    allowScanWhileEditing: true,
  });

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void processBarcode(value);
  }

  function handleCameraDetected(code: string) {
    setCameraOpen(false);
    void processBarcode(code);
    focusInput();
  }

  return (
    <div className="posBarcodeBlock attendanceBarcodeBlock">
      <label className="posBarcodeLabel" htmlFor="attendance-barcode-input">
        {isArabic ? "امسح باركود أو QR بطاقة الموظف" : "Scan employee badge barcode or QR"}
      </label>
      <div className="posBarcodeRow">
        <span className="posBarcodeIcon" aria-hidden="true">
          📷
        </span>
        <input
          id="attendance-barcode-input"
          ref={inputRef}
          className="posBarcodeInput"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled || busy}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArabic
              ? "امسح الكود أو اكتبه واضغط Enter"
              : "Scan code or type and press Enter"
          }
        />
        {cameraSupported && (
          <button
            type="button"
            className="posBarcodeCameraBtn"
            disabled={disabled || busy}
            onClick={() => setCameraOpen(true)}
            aria-label={isArabic ? "مسح بالكاميرا" : "Scan with camera"}
            title={isArabic ? "مسح QR بالكاميرا" : "Scan QR with camera"}
          >
            📷
          </button>
        )}
        {value && (
          <button
            type="button"
            className="posBarcodeClearBtn"
            onClick={() => {
              setValue("");
              focusInput();
            }}
            aria-label={isArabic ? "مسح" : "Clear"}
          >
            ✕
          </button>
        )}
      </div>
      {cameraOpen && (
        <BarcodeCameraScanner
          isArabic={isArabic}
          includeQrCode
          onDetected={handleCameraDetected}
          onClose={() => {
            setCameraOpen(false);
            focusInput();
          }}
        />
      )}
    </div>
  );
}
