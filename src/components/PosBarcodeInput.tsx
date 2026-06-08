import { useCallback, useEffect, useRef, useState } from "react";
import type { Medicine } from "../types";

type PosBarcodeInputProps = {
  medicines: Medicine[];
  isArabic: boolean;
  onAddToCart: (medicine: Medicine) => void;
  disabled?: boolean;
};

function findMedicineByBarcode(medicines: Medicine[], raw: string) {
  const code = raw.trim();
  if (!code) return undefined;
  return medicines.find((medicine) => medicine.barcode.trim() === code);
}

export default function PosBarcodeInput({
  medicines,
  isArabic,
  onAddToCart,
  disabled = false,
}: PosBarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = useCallback(() => {
    if (disabled) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

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
        showMessage(
          isArabic ? `تمت إضافة ${found.name_ar} للسلة` : `${found.name_en} added to cart`
        );
        focusInput();
        return true;
      }

      showMessage(
        isArabic ? "الباركود غير موجود في المخزون" : "Barcode not found in inventory",
        true
      );
      return false;
    },
    [focusInput, isArabic, medicines, onAddToCart, showMessage]
  );

  useEffect(() => {
    focusInput();
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [focusInput]);

  useEffect(() => {
    if (disabled) return;

    let buffer = "";
    let lastKeyTime = 0;
    const scanGapMs = 80;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName || "";
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;

      if (target === inputRef.current) return;
      if (isEditable) return;

      if (event.key === "Enter") {
        if (buffer.length >= 4) {
          event.preventDefault();
          processBarcode(buffer);
          buffer = "";
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const now = Date.now();
        if (now - lastKeyTime > scanGapMs) buffer = "";
        lastKeyTime = now;
        buffer += event.key;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, processBarcode]);

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
    </div>
  );
}
