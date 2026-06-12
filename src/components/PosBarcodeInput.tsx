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
};

const PosBarcodeInput = forwardRef<PosBarcodeInputHandle, PosBarcodeInputProps>(
  function PosBarcodeInput({ medicines, isArabic, onAddToCart, disabled = false }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cameraSupported = canUseBarcodeCameraScanner();

    const focusInput = useCallback(() => {
      if (disabled) return;
      requestAnimationFrame(() => inputRef.current?.focus());
    }, [disabled]);

    useImperativeHandle(ref, () => ({ focus: focusInput }), [focusInput]);

    const showMessage = useCallback((text: string, error = false) => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      setMessage({ text, error });
      messageTimerRef.current = setTimeout(() => setMessage(null), error ? 2200 : 1800);
    }, []);

    const processBarcode = useCallback(
      (raw: string) => {
        const clean = raw.trim();
        if (!clean) return false;

        const found = findMedicineByBarcode(medicines, clean);
        if (found) {
          onAddToCart(found);
          setValue("");
          playBarcodeBeep(true);
          showMessage(
            isArabic
              ? `تمت إضافة ${found.name_ar} للسلة`
              : `${found.name_en || found.name_ar} added to cart`,
          );
          focusInput();
          return true;
        }

        playBarcodeBeep(false);
        showMessage(
          isArabic ? "الباركود غير موجود في المخزون" : "Barcode not found in inventory",
          true,
        );
        return false;
      },
      [focusInput, isArabic, medicines, onAddToCart, showMessage],
    );

    useEffect(() => {
      focusInput();
      return () => {
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      };
    }, [focusInput, medicines]);

    useHardwareBarcodeScanner({
      disabled,
      onScan: processBarcode,
      ignoreInputRef: inputRef,
    });

    function handleChange(nextValue: string) {
      setValue(nextValue);
      const found = findMedicineByBarcode(medicines, nextValue);
      if (found) {
        processBarcode(nextValue);
      }
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      processBarcode(value);
    }

    function handleCameraDetected(code: string) {
      setCameraOpen(false);
      processBarcode(code);
      focusInput();
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
      <div className="posBarcodeBlock">
        <label className="posBarcodeLabel" htmlFor="pos-barcode-input">
          {isArabic ? "مسح الباركود للبيع" : "Scan barcode to sell"}
        </label>
        <div className="posBarcodeRow">
          <span className="posBarcodeIcon" aria-hidden="true">
            📷
          </span>
          <input
            id="pos-barcode-input"
            ref={inputRef}
            className="posBarcodeInput"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={disabled}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
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
  },
);

export default PosBarcodeInput;
