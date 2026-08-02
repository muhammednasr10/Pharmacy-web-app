import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Medicine } from "../types";
import { findMedicineByBarcode } from "../utils/medicineLookup";
import { playBarcodeBeep } from "../utils/barcodeBeep";
import { useHardwareBarcodeScanner } from "../utils/useHardwareBarcodeScanner";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "./BarcodeCameraScanner";

export type PosBarcodeInputHandle = {
  focus: () => void;
};

type PosBarcodeInputProps = {
  medicines: Medicine[];
  isArabic: boolean;
  onAddToCart: (medicine: Medicine) => void;
  disabled?: boolean;
  lookupBarcode?: (barcode: string) => Promise<Medicine | null | undefined>;
};

const PosBarcodeInput = forwardRef<PosBarcodeInputHandle, PosBarcodeInputProps>(
  function PosBarcodeInput({ medicines, isArabic, onAddToCart, disabled = false, lookupBarcode }, ref) {
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [barcodeValue, setBarcodeValue] = useState("");
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraSupported = canUseBarcodeCameraScanner();

    const focusBarcode = useCallback(() => {
      if (disabled) return;
      requestAnimationFrame(() => barcodeInputRef.current?.focus());
    }, [disabled]);

    useImperativeHandle(ref, () => ({ focus: focusBarcode }), [focusBarcode]);

    const showMessage = useCallback((text: string, error = false) => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      setMessage({ text, error });
      messageTimerRef.current = setTimeout(() => setMessage(null), error ? 2200 : 1800);
    }, []);

    const processBarcode = useCallback(
      async (raw: string) => {
        const clean = raw.trim();
        if (!clean) return false;

        const found = lookupBarcode
          ? (await lookupBarcode(clean)) || findMedicineByBarcode(medicines, clean)
          : findMedicineByBarcode(medicines, clean);
        if (found) {
          onAddToCart(found);
          setBarcodeValue("");
          playBarcodeBeep(true);
          showMessage(
            isArabic
              ? `تمت إضافة ${found.name_ar} للسلة`
              : `${found.name_en || found.name_ar} added to cart`,
          );
          focusBarcode();
          return true;
        }

        playBarcodeBeep(false);
        showMessage(
          isArabic ? "الباركود غير موجود في المخزون" : "Barcode not found in inventory",
          true,
        );
        return false;
      },
      [focusBarcode, isArabic, lookupBarcode, medicines, onAddToCart, showMessage],
    );

    useEffect(() => {
      focusBarcode();
      return () => {
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- autofocus once on mount
    }, []);

    useHardwareBarcodeScanner({
      disabled,
      onScan: (code) => {
        void processBarcode(code);
      },
      ignoreInputRef: barcodeInputRef,
    });

    function handleBarcodeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void processBarcode(barcodeValue);
    }

    function handleCameraDetected(code: string) {
      setCameraOpen(false);
      void processBarcode(code);
      focusBarcode();
    }

    function openCameraScanner() {
      if (disabled) return;
      if (!cameraSupported) {
        showMessage(
          isArabic
            ? "مسح الكاميرا غير مدعوم هنا — استخدم Chrome على الجوال"
            : "Camera scan is not supported here — use Chrome on mobile",
          true,
        );
        return;
      }
      setCameraOpen(true);
    }

    return (
      <div className="posBarcodeBlock posBarcodeOnly">
        <div className="posSearchField">
          <label className="posBarcodeLabel" htmlFor="pos-barcode-input">
            {isArabic ? "مسح الباركود للبيع" : "Scan barcode to sell"}
          </label>
          <div className="posBarcodeRow">
            <span className="posBarcodeIcon" aria-hidden="true">
              📷
            </span>
            <input
              id="pos-barcode-input"
              ref={barcodeInputRef}
              className="posBarcodeInput"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              value={barcodeValue}
              onChange={(event) => setBarcodeValue(event.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder={
                isArabic
                  ? "امسح الباركود أو اكتبه واضغط Enter"
                  : "Scan barcode or type and press Enter"
              }
            />
            {cameraSupported && (
              <button
                type="button"
                className="posBarcodeCameraBtn"
                disabled={disabled}
                onClick={openCameraScanner}
                aria-label={isArabic ? "مسح بالكاميرا" : "Scan with camera"}
                title={isArabic ? "مسح بالكاميرا" : "Scan with camera"}
              >
                📷
              </button>
            )}
            {barcodeValue && (
              <button
                type="button"
                className="posBarcodeClearBtn"
                onClick={() => {
                  setBarcodeValue("");
                  focusBarcode();
                }}
                aria-label={isArabic ? "مسح" : "Clear"}
              >
                ✕
              </button>
            )}
          </div>
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
              focusBarcode();
            }}
          />
        )}
      </div>
    );
  },
);

export default PosBarcodeInput;
