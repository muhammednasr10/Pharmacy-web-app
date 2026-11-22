import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppUser, CashierShift, CashierShiftSummary, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { cashAmountErrorMessage, parseCashAmountInput } from "../utils/cashierShiftCash";

type CashierShiftCloseModalProps = {
  isArabic: boolean;
  currency: string;
  shift: CashierShift;
  appUser: AppUser;
  pharmacySettings?: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
  onClose: () => void;
  onClosed: (shift: CashierShift) => void;
};

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

export default function CashierShiftCloseModal({
  isArabic,
  currency,
  shift,
  appUser,
  pharmacySettings,
  getPaymentLabel,
  onClose,
  onClosed,
}: CashierShiftCloseModalProps) {
  const [summary, setSummary] = useState<CashierShiftSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [actualCashError, setActualCashError] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const parsedActual = useMemo(() => parseCashAmountInput(actualCash), [actualCash]);
  const canConfirmClose = Boolean(summary) && parsedActual.ok && !busy;

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const next = await pharmacyService.computeCashierShiftSummary(shift);
      setSummary(next);
      setActualCash("");
      setActualCashError("");
    } catch (error) {
      console.error("Cashier shift summary:", error);
      setFeedback({
        type: "error",
        text: isArabic ? "تعذّر تحميل ملخص الوردية" : "Could not load shift summary",
      });
    } finally {
      setLoadingSummary(false);
    }
  }, [isArabic, shift]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  async function handleCloseShift() {
    if (!summary) return;
    const parsed = parseCashAmountInput(actualCash);
    if (!parsed.ok) {
      setActualCashError(cashAmountErrorMessage(parsed.reason, isArabic, "actual"));
      return;
    }
    setActualCashError("");
    setFeedback(null);
    setBusy(true);
    try {
      const closed = await pharmacyService.closeCashierShift({
        shiftId: shift.id,
        actualCash: parsed.value,
        notes: closeNotes.trim(),
        closedById: appUser.uid,
        closedByName: appUser.name,
      });
      const closedSummary = await pharmacyService.computeCashierShiftSummary(closed);
      const { downloadCashierShiftPdf } = await import("../utils/cashierShiftReport");
      downloadCashierShiftPdf({
        shift: closed,
        summary: closedSummary,
        pharmacy: pharmacySettings,
        currency,
        isArabic,
        getPaymentLabel,
      });
      onClosed(closed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFeedback({ type: "error", text: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalOverlay subscriptionPaymentOverlay" role="presentation" onClick={onClose}>
      <div
        className="invoiceModal userModal cashierShiftModal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h3>{isArabic ? "إغلاق الوردية" : "Close shift"}</h3>
            <p className="mutedText">
              {shift.shiftNumber} · {shift.cashierName || shift.cashierId}
            </p>
          </div>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>

        {loadingSummary || !summary ? (
          <p className="returnsSectionHint">
            {isArabic ? "جاري تحميل ملخص الوردية..." : "Loading shift summary..."}
          </p>
        ) : (
          <>
            <div className="cashierShiftCloseGrid">
              <div>
                <span>{isArabic ? "رصيد افتتاحي" : "Opening cash"}</span>
                <strong>{formatMoney(shift.openingCash, currency)}</strong>
              </div>
              <div>
                <span>{isArabic ? "مبيعات نقدية" : "Cash sales"}</span>
                <strong>{formatMoney(summary.cashSales, currency)}</strong>
              </div>
              <div>
                <span>{getPaymentLabel("visa")}</span>
                <strong>{formatMoney(summary.visaSales, currency)}</strong>
              </div>
              <div>
                <span>{getPaymentLabel("wallet")}</span>
                <strong>{formatMoney(summary.walletSales, currency)}</strong>
              </div>
              <div>
                <span>{getPaymentLabel("credit")}</span>
                <strong>{formatMoney(summary.creditSales, currency)}</strong>
              </div>
              <div>
                <span>{isArabic ? "مرتجعات" : "Returns"}</span>
                <strong>{formatMoney(summary.returnsTotal, currency)}</strong>
              </div>
              <div>
                <span>{isArabic ? "تحصيلات نقدية" : "Cash collections"}</span>
                <strong>{formatMoney(summary.customerPaymentsCash, currency)}</strong>
              </div>
              <div>
                <span>{isArabic ? "إجمالي المبيعات" : "Total sales"}</span>
                <strong>{formatMoney(summary.totalSales, currency)}</strong>
              </div>
              <div className="cashierShiftCloseHighlight">
                <span>{isArabic ? "النقد المتوقع (للقراءة فقط)" : "Expected cash (read-only)"}</span>
                <strong>{formatMoney(summary.expectedCash, currency)}</strong>
              </div>
            </div>

            <label className="formField">
              {isArabic ? "النقد الفعلي في الصندوق" : "Actual cash counted"}
              <input
                type="number"
                min="0"
                step="0.01"
                className={`tableInput${actualCashError ? " is-invalid" : ""}`}
                value={actualCash}
                placeholder={isArabic ? "أدخل بعد العد" : "Enter after counting"}
                onChange={(event) => {
                  setActualCash(event.target.value);
                  setActualCashError("");
                }}
              />
              {actualCashError ? (
                <span className="fieldErrorText" role="alert">
                  {actualCashError}
                </span>
              ) : (
                <span className="mutedText">
                  {isArabic ? "اتركه فارغًا حتى تعدّ النقد — الصفر مسموح" : "Leave empty until counted — zero is allowed"}
                </span>
              )}
            </label>

            {parsedActual.ok ? (
              <p className="returnsSectionHint">
                {isArabic ? "الفرق:" : "Variance:"}{" "}
                {formatMoney(parsedActual.value - summary.expectedCash, currency)}
              </p>
            ) : null}

            <label className="formField">
              {isArabic ? "ملاحظات" : "Notes"}
              <textarea
                className="tableInput"
                rows={2}
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
              />
            </label>

            {feedback ? (
              <div className={feedback.type === "error" ? "loginError" : "loginSuccess"} role="status">
                {feedback.text}
              </div>
            ) : null}

            <div className="modalActions">
              <button
                type="button"
                className="dangerBtn"
                onClick={() => void handleCloseShift()}
                disabled={!canConfirmClose}
              >
                {busy
                  ? isArabic
                    ? "جاري الإغلاق..."
                    : "Closing..."
                  : isArabic
                    ? "تأكيد الإغلاق"
                    : "Confirm close"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
