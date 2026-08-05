import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Medicine } from "../types";
import {
  findMedicineByBarcode,
  findMedicineByExactName,
  getMedicineDisplayName,
  medicineToEntryValues,
  normalizeMedicineText,
  searchMedicines,
  type MedicineEntryValues,
} from "../utils/medicineLookup";
import { playBarcodeBeep } from "../utils/barcodeBeep";
import { useHardwareBarcodeScanner } from "../utils/useHardwareBarcodeScanner";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "./BarcodeCameraScanner";

type MedicineEntryGridProps = {
  medicines: Medicine[];
  value: MedicineEntryValues;
  onChange: (value: MedicineEntryValues) => void;
  isArabic: boolean;
  t: Record<string, string>;
  disabled?: boolean;
  excludeMedicineId?: number | null;
  qtyPlaceholder?: string;
  resetKey?: string | number;
  showBarcodeCamera?: boolean;
  enableHardwareScanner?: boolean;
  showBuyPrice?: boolean;
  lookupBarcode?: (barcode: string) => Promise<Medicine | null | undefined>;
};

type ActiveField = "barcode" | "name_ar" | "name_en" | null;

export default function MedicineEntryGrid({
  medicines,
  value,
  onChange,
  isArabic,
  t,
  disabled = false,
  excludeMedicineId = null,
  qtyPlaceholder,
  resetKey = 0,
  showBarcodeCamera = true,
  enableHardwareScanner = true,
  showBuyPrice = true,
  lookupBarcode,
}: MedicineEntryGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [matchedMedicine, setMatchedMedicine] = useState<Medicine | null>(null);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraSupported = canUseBarcodeCameraScanner();

  const catalog = useMemo(
    () => medicines.filter((medicine) => medicine.id !== excludeMedicineId),
    [medicines, excludeMedicineId],
  );

  const activeQuery =
    activeField === "barcode"
      ? value.barcode
      : activeField === "name_ar"
        ? value.name_ar
        : activeField === "name_en"
          ? value.name_en
          : "";

  const suggestions = useMemo(() => {
    if (!activeField || activeQuery.trim().length < 1) return [];
    return searchMedicines(catalog, activeQuery, 8);
  }, [activeField, activeQuery, catalog]);

  useEffect(() => {
    setActiveField(null);
    setMatchedMedicine(null);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, []);

  const applyMedicine = useCallback(
    (medicine: Medicine, current?: Partial<MedicineEntryValues>) => {
      setMatchedMedicine(medicine);
      onChange(medicineToEntryValues(medicine, current ?? value));
      setActiveField(null);
    },
    [onChange, value],
  );

  const resolveMedicineByBarcode = useCallback(
    async (barcode: string): Promise<Medicine | undefined> => {
      const code = normalizeMedicineText(barcode);
      if (!code) return undefined;

      const local = findMedicineByBarcode(catalog, code);
      if (local) return local;

      if (!lookupBarcode) return undefined;
      return (await lookupBarcode(code)) || undefined;
    },
    [catalog, lookupBarcode],
  );

  const lookupAndApplyBarcode = useCallback(
    async (barcode: string, current?: Partial<MedicineEntryValues>) => {
      const code = normalizeMedicineText(barcode);
      if (!code) {
        setMatchedMedicine(null);
        return false;
      }

      const local = findMedicineByBarcode(catalog, code);
      if (local) {
        applyMedicine(local, current);
        return true;
      }

      if (!lookupBarcode) {
        setMatchedMedicine(null);
        return false;
      }

      setBarcodeLookupLoading(true);
      try {
        const remote = await lookupBarcode(code);
        if (remote) {
          applyMedicine(remote, current);
          return true;
        }
        setMatchedMedicine(null);
        return false;
      } finally {
        setBarcodeLookupLoading(false);
      }
    },
    [applyMedicine, catalog, lookupBarcode],
  );

  useEffect(() => {
    const code = normalizeMedicineText(value.barcode);
    if (!code) {
      setMatchedMedicine(null);
      return;
    }

    const local = findMedicineByBarcode(catalog, code);
    if (local) {
      setMatchedMedicine(local);
      return;
    }

    const byName = findMedicineByExactName(catalog, value.name_ar);
    if (byName) {
      setMatchedMedicine(byName);
      return;
    }

    if (!lookupBarcode) {
      setMatchedMedicine(null);
      return;
    }

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(() => {
      void lookupAndApplyBarcode(code);
    }, 350);
  }, [catalog, lookupAndApplyBarcode, lookupBarcode, value.barcode, value.name_ar]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveField(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function applyMedicineSelection(medicine: Medicine) {
    applyMedicine(medicine);
  }

  const processScannedBarcode = useCallback(
    async (raw: string) => {
      const clean = raw.trim();
      if (!clean) return;

      const found = await resolveMedicineByBarcode(clean);
      if (found) {
        playBarcodeBeep(true);
        applyMedicine(found);
        return;
      }

      playBarcodeBeep(false);
      onChange({ ...value, barcode: clean });
      setActiveField("barcode");
      setMatchedMedicine(null);
    },
    [applyMedicine, onChange, resolveMedicineByBarcode, value],
  );

  useHardwareBarcodeScanner({
    disabled: disabled || !enableHardwareScanner,
    onScan: (code) => {
      void processScannedBarcode(code);
    },
    ignoreInputRef: barcodeInputRef,
    allowScanWhileEditing: true,
  });

  function handleCameraBarcode(code: string) {
    setCameraOpen(false);
    void processScannedBarcode(code);
  }

  function openCameraScanner() {
    if (disabled || !showBarcodeCamera || !cameraSupported) return;
    setCameraOpen(true);
  }

  function tryAutoMatch(nextValue: MedicineEntryValues, field: ActiveField) {
    const byBarcode = findMedicineByBarcode(catalog, nextValue.barcode);
    if (byBarcode) {
      applyMedicine(byBarcode, nextValue);
      return;
    }

    if (field === "barcode" && lookupBarcode && normalizeMedicineText(nextValue.barcode)) {
      onChange(nextValue);
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = setTimeout(() => {
        void lookupAndApplyBarcode(nextValue.barcode, nextValue);
      }, 350);
      return;
    }

    if (field === "name_ar") {
      const byName = findMedicineByExactName(catalog, nextValue.name_ar);
      if (byName) {
        applyMedicine(byName, nextValue);
        return;
      }
    }

    if (field === "name_en") {
      const byName = findMedicineByExactName(catalog, nextValue.name_en);
      if (byName) {
        applyMedicine(byName, nextValue);
        return;
      }
    }

    setMatchedMedicine(null);
    onChange(nextValue);
  }

  function updateField<K extends keyof MedicineEntryValues>(key: K, raw: string | number) {
    const nextValue = { ...value, [key]: raw };
    if (key === "barcode" || key === "name_ar" || key === "name_en") {
      tryAutoMatch(nextValue, key);
      return;
    }
    onChange(nextValue);
  }

  const statusText = barcodeLookupLoading
    ? isArabic
      ? "جاري البحث في المخزن..."
      : "Looking up in inventory..."
    : matchedMedicine
      ? isArabic
        ? `موجود في المخزن · الكمية الحالية ${matchedMedicine.qty}`
        : `In stock · current qty ${matchedMedicine.qty}`
      : normalizeMedicineText(value.barcode) || normalizeMedicineText(value.name_ar)
        ? isArabic
          ? "دواء جديد — سيُضاف للمخزون عند الحفظ"
          : "New medicine — will be added to stock on save"
        : "";

  return (
    <div className="medicineEntryGrid" ref={rootRef}>
      {statusText && (
        <div
          className={
            barcodeLookupLoading
              ? "medicineLookupStatus isLoading"
              : matchedMedicine
                ? "medicineLookupStatus isExisting"
                : "medicineLookupStatus isNew"
          }
        >
          {statusText}
        </div>
      )}

      <div className="formGrid medicineEntryGridFields">
        <div className="medicineEntryField medicineLookupField">
          <label>{t.barcode}</label>
          <div className="medicineBarcodeInputRow">
            <input
              ref={barcodeInputRef}
              value={value.barcode}
              onChange={(e) => updateField("barcode", e.target.value)}
              onFocus={() => setActiveField("barcode")}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void processScannedBarcode(value.barcode);
              }}
              onBlur={() => {
                if (normalizeMedicineText(value.barcode)) {
                  void lookupAndApplyBarcode(value.barcode);
                }
              }}
              placeholder={t.barcode}
              disabled={disabled}
              autoComplete="off"
            />
            {showBarcodeCamera && cameraSupported && (
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
          </div>
          {activeField === "barcode" && suggestions.length > 0 && (
            <div className="medicineLookupSuggestions" role="listbox">
              {suggestions.map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  className="medicineLookupSuggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyMedicineSelection(medicine)}
                >
                  <strong>{getMedicineDisplayName(medicine, isArabic)}</strong>
                  <span>
                    {medicine.barcode}
                    {" · "}
                    {isArabic ? "كمية" : "Qty"} {medicine.qty}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="medicineEntryField medicineLookupField">
          <label>{isArabic ? "اسم الدواء بالعربي" : "Arabic medicine name"}</label>
          <input
            value={value.name_ar}
            onChange={(e) => updateField("name_ar", e.target.value)}
            onFocus={() => setActiveField("name_ar")}
            placeholder={isArabic ? "اسم الدواء بالعربي" : "Arabic medicine name"}
            disabled={disabled}
            autoComplete="off"
          />
          {activeField === "name_ar" && suggestions.length > 0 && (
            <div className="medicineLookupSuggestions" role="listbox">
              {suggestions.map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  className="medicineLookupSuggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyMedicineSelection(medicine)}
                >
                  <strong>{medicine.name_ar}</strong>
                  <span>
                    {medicine.barcode}
                    {" · "}
                    {medicine.name_en}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="medicineEntryField medicineLookupField">
          <label>{isArabic ? "اسم الدواء بالإنجليزي" : "English medicine name"}</label>
          <input
            value={value.name_en}
            onChange={(e) => updateField("name_en", e.target.value)}
            onFocus={() => setActiveField("name_en")}
            placeholder={isArabic ? "اسم الدواء بالإنجليزي" : "English medicine name"}
            disabled={disabled}
            autoComplete="off"
          />
          {activeField === "name_en" && suggestions.length > 0 && (
            <div className="medicineLookupSuggestions" role="listbox">
              {suggestions.map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  className="medicineLookupSuggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyMedicineSelection(medicine)}
                >
                  <strong>{medicine.name_en}</strong>
                  <span>
                    {medicine.barcode}
                    {" · "}
                    {medicine.name_ar}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="medicineEntryField">
          <label>{qtyPlaceholder || t.qty}</label>
          <input
            type="number"
            value={value.qty || ""}
            onChange={(e) => updateField("qty", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder={qtyPlaceholder || t.qty}
            disabled={disabled}
          />
        </div>
        {showBuyPrice ? (
          <div className="medicineEntryField">
            <label>{isArabic ? "سعر الشراء" : "Buy price"}</label>
            <input
              type="number"
              value={value.buyPrice || ""}
              onChange={(e) =>
                updateField("buyPrice", e.target.value === "" ? 0 : Number(e.target.value))
              }
              placeholder={isArabic ? "سعر الشراء" : "Buy price"}
              disabled={disabled}
            />
          </div>
        ) : null}
        <div className="medicineEntryField">
          <label>{isArabic ? "سعر البيع" : "Sell price"}</label>
          <input
            type="number"
            value={value.price || ""}
            onChange={(e) =>
              updateField("price", e.target.value === "" ? 0 : Number(e.target.value))
            }
            placeholder={isArabic ? "سعر البيع" : "Sell price"}
            disabled={disabled}
          />
        </div>
        <div className="medicineEntryField">
          <label>{t.expiry}</label>
          <input
            type="date"
            value={value.expiry}
            onChange={(e) => updateField("expiry", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {cameraOpen && (
        <BarcodeCameraScanner
          isArabic={isArabic}
          onDetected={handleCameraBarcode}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
