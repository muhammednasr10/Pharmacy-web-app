import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Medicine } from "../types";
import { findMedicineByBarcode, searchMedicines } from "../utils/medicineLookup";
import { playBarcodeBeep } from "../utils/barcodeBeep";
import { useHardwareBarcodeScanner } from "../utils/useHardwareBarcodeScanner";
import BarcodeCameraScanner, { canUseBarcodeCameraScanner } from "./BarcodeCameraScanner";
import {
  clearStockCountSession,
  createStockCountSession,
  getLineVariance,
  getVarianceLines,
  loadStockCountSession,
  recordStockCountScan,
  removeStockCountLine,
  saveStockCountSession,
  setStockCountLineQty,
  summarizeStockCountSession,
  type StockCountSession,
} from "../utils/stockCount";

type StockCountModalProps = {
  isArabic: boolean;
  pharmacyId: string;
  medicines: Medicine[];
  userId?: string;
  userName?: string;
  disabled?: boolean;
  onClose: () => void;
  onApply: (session: StockCountSession) => Promise<void>;
};

export default function StockCountModal({
  isArabic,
  pharmacyId,
  medicines,
  disabled = false,
  onClose,
  onApply,
}: StockCountModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"count" | "review">("count");
  const [session, setSession] = useState<StockCountSession>(() => {
    return loadStockCountSession(pharmacyId) || createStockCountSession(pharmacyId);
  });
  const [scanValue, setScanValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraSupported = canUseBarcodeCameraScanner();

  const summary = useMemo(() => summarizeStockCountSession(session), [session]);
  const varianceLines = useMemo(() => getVarianceLines(session), [session]);

  const focusInput = useCallback(() => {
    if (disabled || step !== "count") return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled, step]);

  const showMessage = useCallback((text: string, error = false) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage({ text, error });
    messageTimerRef.current = setTimeout(() => setMessage(null), error ? 2200 : 1800);
  }, []);

  const updateSession = useCallback(
    (next: StockCountSession | ((prev: StockCountSession) => StockCountSession)) => {
      setSession((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        saveStockCountSession(resolved);
        return resolved;
      });
    },
    [],
  );

  const processBarcode = useCallback(
    (raw: string) => {
      const clean = raw.trim();
      if (!clean || disabled) return false;

      const found = findMedicineByBarcode(medicines, clean);
      if (!found) {
        playBarcodeBeep(false);
        showMessage(
          isArabic ? "الباركود غير موجود في هذا الفرع" : "Barcode not found in this branch",
          true,
        );
        return false;
      }

      updateSession((prev) => recordStockCountScan(prev, found));
      setScanValue("");
      playBarcodeBeep(true);
      showMessage(
        isArabic ? `تم عد ${found.name_ar} (+1)` : `Counted ${found.name_en || found.name_ar} (+1)`,
      );
      focusInput();
      return true;
    },
    [disabled, focusInput, isArabic, medicines, showMessage, updateSession],
  );

  useEffect(() => {
    focusInput();
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [focusInput]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useHardwareBarcodeScanner({
    disabled: disabled || step !== "count",
    onScan: processBarcode,
    ignoreInputRef: inputRef,
  });

  const searchResults = useMemo(() => {
    const query = searchValue.trim();
    if (query.length < 2) return [];
    return searchMedicines(medicines, query).slice(0, 8);
  }, [medicines, searchValue]);

  function handleResetSession() {
    const confirmed = window.confirm(
      isArabic
        ? "مسح جلسة الجرد الحالية والبدء من جديد؟"
        : "Clear the current count session and start over?",
    );
    if (!confirmed) return;
    clearStockCountSession(pharmacyId);
    const fresh = createStockCountSession(pharmacyId);
    setSession(fresh);
    setStep("count");
    setSearchValue("");
    setScanValue("");
  }

  async function handleApply() {
    if (varianceLines.length === 0) {
      alert(isArabic ? "لا توجد فروقات لتسويتها" : "No variances to adjust");
      return;
    }

    const confirmed = window.confirm(
      isArabic
        ? `تأكيد تسوية ${varianceLines.length} صنف في المخزون؟`
        : `Apply adjustments for ${varianceLines.length} items?`,
    );
    if (!confirmed) return;

    setApplying(true);
    try {
      await onApply(session);
      clearStockCountSession(pharmacyId);
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر تطبيق تسوية الجرد"
            : "Could not apply stock count adjustments",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalCard stockCountModal"
        dir={isArabic ? "rtl" : "ltr"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="stockCountHeader">
          <div>
            <h2>{isArabic ? "جرد مخزون" : "Stock Count"}</h2>
            <p className="mutedText">
              {step === "count"
                ? isArabic
                  ? "امسح الباركود أو ابحث يدوياً — كل مسحة تزيد العدد +1"
                  : "Scan barcode or search manually — each scan adds +1"
                : isArabic
                  ? "راجع الفروقات قبل تسوية المخزون"
                  : "Review variances before applying adjustments"}
            </p>
          </div>
          <button type="button" className="smallBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="stockCountSummaryRow">
          <span>
            {isArabic ? "أصناف معدودة" : "Counted"}: {summary.totalLines}
          </span>
          <span>
            {isArabic ? "متطابق" : "Matched"}: {summary.matchedLines}
          </span>
          <span>
            {isArabic ? "فروقات" : "Variances"}: {summary.varianceLines}
          </span>
          <span>
            {isArabic ? "فرق الكمية" : "Qty diff"}: {summary.totalVariance > 0 ? "+" : ""}
            {summary.totalVariance}
          </span>
        </div>

        {step === "count" ? (
          <>
            <div className="stockCountScanBlock">
              <label className="posBarcodeLabel" htmlFor="stock-count-barcode">
                {isArabic ? "مسح باركود للجرد" : "Scan barcode to count"}
              </label>
              <div className="posBarcodeRow">
                <input
                  ref={inputRef}
                  id="stock-count-barcode"
                  type="text"
                  value={scanValue}
                  disabled={disabled}
                  placeholder={isArabic ? "وجّه الماسح هنا..." : "Focus scanner here..."}
                  onChange={(event) => {
                    const next = event.target.value;
                    setScanValue(next);
                    if (next.includes("\n") || next.includes("\r")) {
                      processBarcode(next.replace(/[\n\r]/g, ""));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      processBarcode(scanValue);
                    }
                  }}
                />
                {cameraSupported && (
                  <button
                    type="button"
                    className="posBarcodeCameraBtn"
                    disabled={disabled}
                    onClick={() => setCameraOpen(true)}
                  >
                    {isArabic ? "كاميرا" : "Camera"}
                  </button>
                )}
              </div>
              {message && (
                <p className={message.error ? "stockCountMessage error" : "stockCountMessage"}>
                  {message.text}
                </p>
              )}
            </div>

            <div className="stockCountSearchBlock">
              <input
                type="text"
                value={searchValue}
                disabled={disabled}
                placeholder={
                  isArabic ? "بحث بالاسم أو الباركود..." : "Search by name or barcode..."
                }
                onChange={(event) => setSearchValue(event.target.value)}
              />
              {searchResults.length > 0 && (
                <ul className="stockCountSearchResults">
                  {searchResults.map((medicine) => (
                    <li key={medicine.id}>
                      <button
                        type="button"
                        onClick={() => {
                          updateSession((prev) => recordStockCountScan(prev, medicine));
                          setSearchValue("");
                          playBarcodeBeep(true);
                        }}
                      >
                        <span>{medicine.name_ar}</span>
                        <span className="mutedText">
                          {medicine.barcode || "—"} · {isArabic ? "نظام" : "sys"} {medicine.qty}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="stockCountTableWrap">
              {session.lines.length === 0 ? (
                <p className="empty">{isArabic ? "لم يُعد أي صنف بعد" : "No items counted yet"}</p>
              ) : (
                <table className="stockCountTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الدواء" : "Medicine"}</th>
                      <th>{isArabic ? "النظام" : "System"}</th>
                      <th>{isArabic ? "المعدود" : "Counted"}</th>
                      <th>{isArabic ? "الفرق" : "Diff"}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {session.lines.map((line) => {
                      const variance = getLineVariance(line);
                      return (
                        <tr key={line.medicineId}>
                          <td>
                            <strong>{line.name_ar}</strong>
                            <div className="mutedText">{line.barcode || "—"}</div>
                          </td>
                          <td>{line.systemQty}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="stockCountQtyInput"
                              value={line.countedQty}
                              disabled={disabled}
                              onChange={(event) =>
                                updateSession((prev) =>
                                  setStockCountLineQty(
                                    prev,
                                    line.medicineId,
                                    Number(event.target.value),
                                  ),
                                )
                              }
                            />
                          </td>
                          <td
                            className={
                              variance === 0 ? "" : variance > 0 ? "textSuccess" : "textDanger"
                            }
                          >
                            {variance > 0 ? `+${variance}` : variance}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="deleteSmallBtn"
                              onClick={() =>
                                updateSession((prev) => removeStockCountLine(prev, line.medicineId))
                              }
                            >
                              {isArabic ? "حذف" : "Remove"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <textarea
              className="stockCountNotes"
              value={session.notes}
              disabled={disabled}
              placeholder={isArabic ? "ملاحظات الجرد (اختياري)" : "Count notes (optional)"}
              onChange={(event) =>
                updateSession((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </>
        ) : (
          <div className="stockCountReview">
            {varianceLines.length === 0 ? (
              <p className="empty">
                {isArabic
                  ? "كل الأصناف المعدودة متطابقة مع النظام"
                  : "All counted items match the system"}
              </p>
            ) : (
              <table className="stockCountTable">
                <thead>
                  <tr>
                    <th>{isArabic ? "الدواء" : "Medicine"}</th>
                    <th>{isArabic ? "النظام" : "System"}</th>
                    <th>{isArabic ? "المعدود" : "Counted"}</th>
                    <th>{isArabic ? "الفرق" : "Diff"}</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceLines.map((line) => {
                    const variance = getLineVariance(line);
                    return (
                      <tr key={line.medicineId}>
                        <td>{line.name_ar}</td>
                        <td>{line.systemQty}</td>
                        <td>{line.countedQty}</td>
                        <td className={variance > 0 ? "textSuccess" : "textDanger"}>
                          {variance > 0 ? `+${variance}` : variance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="stockCountActions">
          <button
            type="button"
            className="editBtn"
            onClick={handleResetSession}
            disabled={applying}
          >
            {isArabic ? "جلسة جديدة" : "New session"}
          </button>
          {step === "count" ? (
            <button
              type="button"
              className="completeBtn"
              disabled={session.lines.length === 0 || disabled}
              onClick={() => setStep("review")}
            >
              {isArabic ? "مراجعة الفروقات" : "Review variances"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="editBtn"
                onClick={() => setStep("count")}
                disabled={applying}
              >
                {isArabic ? "رجوع للعد" : "Back to count"}
              </button>
              <button
                type="button"
                className="completeBtn"
                disabled={applying || varianceLines.length === 0 || disabled}
                onClick={() => void handleApply()}
              >
                {applying
                  ? isArabic
                    ? "جاري التسوية..."
                    : "Applying..."
                  : isArabic
                    ? "تسوية المخزون"
                    : "Apply adjustments"}
              </button>
            </>
          )}
        </div>

        {cameraOpen && (
          <BarcodeCameraScanner
            isArabic={isArabic}
            onClose={() => setCameraOpen(false)}
            onDetected={(code) => {
              setCameraOpen(false);
              processBarcode(code);
            }}
          />
        )}
      </div>
    </div>
  );
}
