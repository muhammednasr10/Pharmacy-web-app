import { useCallback, useEffect, useRef, useState } from "react";
import { useHardwareBarcodeScanner } from "../utils/useHardwareBarcodeScanner";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "./BarcodeCameraScanner";

type InstantReturnBarcodeInputProps = {
  isArabic: boolean;
  disabled?: boolean;
  onBarcodeScan: (code: string) => void | Promise<void>;
};

export default function InstantReturnBarcodeInput({
  isArabic,
  disabled = false,
  onBarcodeScan,
}: InstantReturnBarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraSupported = canUseBarcodeCameraScanner();

  const focusInput = useCallback(() => {
    if (disabled || busy) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [busy, disabled]);

  const showMessage = useCallback((text: string, error = false) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage({ text, error });
    messageTimerRef.current = setTimeout(() => setMessage(null), error ? 2200 : 1800);
  }, []);

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
        showMessage(
          isArabic ? "تعذر البحث بالباركود" : "Could not search by barcode",
          true
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, focusInput, isArabic, onBarcodeScan, showMessage]
  );

  useEffect(() => {
    focusInput();
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
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

  function openCameraScanner() {
    if (disabled || busy) return;
    if (!cameraSupported) {
      showMessage(
        isArabic
          ? "مسح الكاميرا غير مدعوم هنا — استخدم Chrome على الجوال"
          : "Camera scan is not supported here — use Chrome on mobile",
        true
      );
      return;
    }
    setCameraOpen(true);
  }

  return (
    <div className="posBarcodeBlock instantReturnBarcodeBlock">
      <label className="posBarcodeLabel" htmlFor="instant-return-barcode-input">
        {isArabic ? "مسح باركود الصنف للمرتجع" : "Scan item barcode for return"}
      </label>
      <div className="posBarcodeRow">
        <span className="posBarcodeIcon" aria-hidden="true">
          📷
        </span>
        <input
          id="instant-return-barcode-input"
          ref={inputRef}
          className="posBarcodeInput"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled || busy}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArabic
              ? "امسح الباركود (USB أو كاميرا) أو اكتبه واضغط Enter"
              : "Scan barcode (USB/camera) or type and press Enter"
          }
        />
        {cameraSupported && (
          <button
            type="button"
            className="posBarcodeCameraBtn"
            disabled={disabled || busy}
            onClick={openCameraScanner}
            aria-label={isArabic ? "مسح بالكاميرا" : "Scan with camera"}
            title={isArabic ? "مسح بالكاميرا" : "Scan with camera"}
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
      {message && (
        <div className={`posMessage ${message.error ? "error" : ""}`}>{message.text}</div>
      )}
      {cameraOpen && (
        <BarcodeCameraScanner
          isArabic={isArabic}
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
