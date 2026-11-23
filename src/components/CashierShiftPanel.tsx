import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppUser, CashierShift, CashierShiftSummary, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import CashierShiftCloseModal from "./CashierShiftCloseModal";
import { isPharmacyManager } from "../utils/roles";
import { cashAmountErrorMessage, parseCashAmountInput } from "../utils/cashierShiftCash";
import { formatCashierShiftOpenError } from "../utils/cashierShiftErrors";

type CashierShiftPanelProps = {
  isArabic: boolean;
  currency: string;
  pharmacyId: string;
  appUser: AppUser | null;
  activeShift: CashierShift | null;
  pharmacySettings?: PharmacySettings | null;
  workShiftId?: string;
  onShiftChange: (shift: CashierShift | null) => void;
  getPaymentLabel: (method: string) => string;
  onShiftOpened?: () => void;
  showQuickSaleButton?: boolean;
  quickSaleOpen?: boolean;
  onOpenQuickSale?: () => void;
  onCloseQuickSale?: () => void;
  /** Bump after each sale so open-shift summary reloads immediately. */
  summaryRefreshKey?: string | number;
};

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

export default function CashierShiftPanel({
  isArabic,
  currency,
  pharmacyId,
  appUser,
  activeShift,
  pharmacySettings,
  workShiftId,
  onShiftChange,
  getPaymentLabel,
  onShiftOpened,
  showQuickSaleButton = false,
  quickSaleOpen = false,
  onOpenQuickSale,
  onCloseQuickSale,
  summaryRefreshKey = 0,
}: CashierShiftPanelProps) {
  const [summary, setSummary] = useState<CashierShiftSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [busy, setBusy] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [openingCashError, setOpeningCashError] = useState("");
  const [panelFeedback, setPanelFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [isOfflineSummary, setIsOfflineSummary] = useState(false);

  const openingCashParsed = useMemo(() => parseCashAmountInput(openingCash), [openingCash]);
  const canSubmitOpen =
    openingCashParsed.ok && busy !== "open" && Boolean(appUser) && Boolean(pharmacyId);

  const refreshSummary = useCallback(async () => {
    if (!activeShift) {
      setSummary(null);
      setOfflinePendingCount(0);
      setIsOfflineSummary(false);
      return;
    }
    setLoadingSummary(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { listPendingOfflineSales } = await import("../utils/offlinePosStorage");
        const pending = (await listPendingOfflineSales(activeShift.pharmacyId)).filter(
          (sale) =>
            (sale.status === "pending" || sale.status === "failed") &&
            sale.invoice.cashierShiftId === activeShift.id,
        );
        setOfflinePendingCount(pending.length);
        setIsOfflineSummary(true);
        const totalSales = pending.reduce((sum, sale) => sum + Number(sale.invoice.total || 0), 0);
        const cashSales = pending.reduce((sum, sale) => {
          const method = String(sale.invoice.paymentMethod || "cash").toLowerCase();
          return method === "cash" ? sum + Number(sale.invoice.total || 0) : sum;
        }, 0);
        const visaSales = pending.reduce((sum, sale) => {
          const method = String(sale.invoice.paymentMethod || "").toLowerCase();
          return method === "visa" ? sum + Number(sale.invoice.total || 0) : sum;
        }, 0);
        const walletSales = pending.reduce((sum, sale) => {
          const method = String(sale.invoice.paymentMethod || "").toLowerCase();
          return method === "wallet" ? sum + Number(sale.invoice.total || 0) : sum;
        }, 0);
        setSummary({
          totalSales,
          netSales: totalSales,
          cashSales,
          visaSales,
          walletSales,
          creditSales: 0,
          returnsTotal: 0,
          customerPaymentsCash: 0,
          customerPaymentsOther: 0,
          invoiceCount: pending.length,
          expectedCash: Number(activeShift.openingCash || 0) + cashSales,
        });
        return;
      }
      setIsOfflineSummary(false);
      const { listPendingOfflineSales } = await import("../utils/offlinePosStorage");
      const pending = (await listPendingOfflineSales(activeShift.pharmacyId)).filter(
        (sale) =>
          (sale.status === "pending" || sale.status === "failed") &&
          sale.invoice.cashierShiftId === activeShift.id,
      );
      setOfflinePendingCount(pending.length);
      const next = await pharmacyService.computeCashierShiftSummary(activeShift);
      if (pending.length > 0) {
        const pendingTotal = pending.reduce((sum, sale) => sum + Number(sale.invoice.total || 0), 0);
        const pendingCash = pending.reduce((sum, sale) => {
          const method = String(sale.invoice.paymentMethod || "cash").toLowerCase();
          return method === "cash" ? sum + Number(sale.invoice.total || 0) : sum;
        }, 0);
        setSummary({
          ...next,
          totalSales: next.totalSales + pendingTotal,
          netSales: next.netSales + pendingTotal,
          cashSales: next.cashSales + pendingCash,
          invoiceCount: next.invoiceCount + pending.length,
          expectedCash: next.expectedCash + pendingCash,
        });
      } else {
        setSummary(next);
      }
    } catch (error) {
      console.error("Cashier shift summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeShift]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, summaryRefreshKey]);

  async function openStartModal() {
    setOpeningCash("0");
    setOpeningCashError("");
    setPanelFeedback(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPanelFeedback({
        type: "error",
        text: isArabic
          ? "فتح وردية جديدة غير متاح بدون اتصال. أكمل البيع على الوردية المفتوحة إن وُجدت."
          : "Opening a new shift requires an internet connection. Continue selling on the open shift if available.",
      });
      return;
    }

    const readiness = await pharmacyService.probeCashierShiftsReady(pharmacyId);
    if (!readiness.ok) {
      console.error("Cashier shifts not ready:", readiness.reason, readiness.detail);
      let text =
        readiness.reason === "missing_table"
          ? isArabic
            ? "خدمة ورديات الكاشير غير جاهزة على هذا الفرع."
            : "Cashier shifts service is not ready on this branch."
          : readiness.reason === "forbidden"
            ? isArabic
              ? "ليس لديك صلاحية الوصول لورديات هذا الفرع."
              : "You do not have permission to access shifts for this branch."
            : isArabic
              ? "تعذر التحقق من خدمة الورديات. راجع سجل المطوّر."
              : "Could not verify shifts service. See developer console.";
      setPanelFeedback({ type: "error", text });
      return;
    }

    setShowOpenModal(true);
  }

  async function handleOpenShift() {
    if (!appUser || busy === "open") return;
    const parsed = parseCashAmountInput(openingCash);
    if (!parsed.ok) {
      setOpeningCashError(cashAmountErrorMessage(parsed.reason, isArabic, "opening"));
      return;
    }
    setOpeningCashError("");
    setPanelFeedback(null);

    setBusy("open");
    try {
      const shift = await pharmacyService.openCashierShift({
        pharmacyId,
        cashierId: appUser.uid,
        cashierName: appUser.name,
        openingCash: parsed.value,
        workShiftId,
      });
      onShiftChange(shift);
      setShowOpenModal(false);
      setOpeningCash("0");
      setPanelFeedback({
        type: "success",
        text: isArabic ? "تم فتح الوردية بنجاح" : "Shift opened successfully",
      });
      onShiftOpened?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Open cashier shift failed:", message, error);
      setPanelFeedback({
        type: "error",
        text: formatCashierShiftOpenError(message, isArabic),
      });
    } finally {
      setBusy("");
    }
  }

  function handleShiftClosed(_closed: CashierShift) {
    onShiftChange(null);
    setShowCloseModal(false);
    setPanelFeedback({
      type: "success",
      text: isArabic ? "تم إغلاق الوردية وحفظ التقرير" : "Shift closed and report saved",
    });
  }

  if (!appUser || !pharmacyId) return null;

  const canManageShift =
    appUser.role === "cashier" || isPharmacyManager(appUser) || appUser.role === "super_admin";

  if (!canManageShift) return null;

  if (!activeShift) {
    return (
      <>
        {panelFeedback ? (
          <div
            className={
              panelFeedback.type === "error" ? "loginError cashierShiftFeedback" : "loginSuccess cashierShiftFeedback"
            }
            role="status"
          >
            {panelFeedback.text}
          </div>
        ) : null}
        <div className="cashierShiftStartOnly">
          <button
            type="button"
            className="completeBtn cashierShiftOpenTrigger"
            onClick={() => void openStartModal()}
            disabled={Boolean(busy)}
          >
            {isArabic ? "بدء وردية جديدة" : "Start new shift"}
          </button>
        </div>

        {showOpenModal ? (
          <div className="modalOverlay modalOverlay--abovePos">
            <div
              className="invoiceModal userModal cashierShiftModal"
              onClick={(event) => event.stopPropagation()}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="modalHeader">
                <h3>{isArabic ? "فتح وردية كاشير" : "Open cashier shift"}</h3>
                <button
                  type="button"
                  className="deleteSmallBtn"
                  onClick={() => setShowOpenModal(false)}
                  disabled={busy === "open"}
                >
                  {isArabic ? "إغلاق" : "Close"}
                </button>
              </div>
              <label className="formField cashierShiftFormField">
                {isArabic ? "رصيد الصندوق الافتتاحي" : "Opening cash in drawer"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`tableInput${openingCashError || !openingCashParsed.ok ? " is-invalid" : ""}`}
                  value={openingCash}
                  onChange={(event) => {
                    const next = event.target.value;
                    setOpeningCash(next);
                    const parsed = parseCashAmountInput(next);
                    setOpeningCashError(
                      parsed.ok ? "" : cashAmountErrorMessage(parsed.reason, isArabic, "opening"),
                    );
                  }}
                  disabled={busy === "open"}
                />
                {openingCashError ? (
                  <span className="fieldErrorText" role="alert">
                    {openingCashError}
                  </span>
                ) : (
                  <span className="mutedText">
                    {isArabic ? "أدخل رصيد الصندوق. يمكنك إدخال 0" : "Enter drawer cash. You can enter 0"}
                  </span>
                )}
              </label>
              {panelFeedback?.type === "error" ? (
                <div className="loginError" role="alert">
                  {panelFeedback.text}
                </div>
              ) : null}
              <div className="modalActions cashierShiftModalActions">
                <button
                  type="button"
                  className="completeBtn cashierShiftStartBtn"
                  onClick={() => void handleOpenShift()}
                  disabled={!canSubmitOpen}
                >
                  {busy === "open"
                    ? isArabic
                      ? "جاري الفتح..."
                      : "Opening..."
                    : isArabic
                      ? "بدء الوردية"
                      : "Start shift"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {panelFeedback ? (
        <div
          className={
            panelFeedback.type === "error" ? "loginError cashierShiftFeedback" : "loginSuccess cashierShiftFeedback"
          }
          role="status"
        >
          {panelFeedback.text}
        </div>
      ) : null}
      <div className="cashierShiftPanel">
        <div className="cashierShiftPanelActive">
          <div className="cashierShiftPanelMeta">
            <strong>{activeShift.shiftNumber}</strong>
            <span>
              {isArabic ? "رصيد افتتاحي:" : "Opening:"}{" "}
              {formatMoney(activeShift.openingCash, currency)}
            </span>
            {summary && (
              <>
                <span>
                  {isArabic ? "مبيعات:" : "Sales:"} {formatMoney(summary.netSales, currency)} (
                  {summary.invoiceCount})
                  {summary.returnsTotal > 0
                    ? isArabic
                      ? ` · مرتجع ${formatMoney(summary.returnsTotal, currency)}`
                      : ` · returns ${formatMoney(summary.returnsTotal, currency)}`
                    : ""}
                </span>
                <span>
                  {isArabic ? "نقد متوقع:" : "Expected cash:"}{" "}
                  {formatMoney(summary.expectedCash, currency)}
                </span>
                {offlinePendingCount > 0 ? (
                  <span className="cashierShiftOfflineTag" title={isArabic ? "مبيعات محفوظة محلياً بانتظار المزامنة" : "Local sales waiting to sync"}>
                    {isArabic
                      ? `محلي بانتظار المزامنة: ${offlinePendingCount}`
                      : `Local pending sync: ${offlinePendingCount}`}
                  </span>
                ) : null}
                {isOfflineSummary ? (
                  <span className="cashierShiftOfflineTag cashierShiftOfflineTag--mode">
                    {isArabic ? "ملخص أوفلاين (غير مزامن بالكامل)" : "Offline summary (not fully synced)"}
                  </span>
                ) : offlinePendingCount === 0 ? (
                  <span className="cashierShiftSyncedTag">
                    {isArabic ? "متزامن مع السيرفر" : "Synced with server"}
                  </span>
                ) : null}
              </>
            )}
            {loadingSummary && (
              <span className="returnsSectionHint">
                {isArabic ? "جاري التحديث..." : "Refreshing..."}
              </span>
            )}
          </div>
          <div className="cashierShiftPanelActions">
            {showQuickSaleButton && !quickSaleOpen && onOpenQuickSale ? (
              <button
                type="button"
                className="completeBtn posQuickSaleOpenBtn"
                onClick={onOpenQuickSale}
                disabled={Boolean(busy)}
              >
                <span className="posQuickSaleOpenBtnIcon" aria-hidden="true">
                  🛒
                </span>
                {isArabic ? "فتح البيع السريع" : "Open quick sale"}
              </button>
            ) : null}
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => void refreshSummary()}
              disabled={loadingSummary || Boolean(busy)}
            >
              {isArabic ? "تحديث" : "Refresh"}
            </button>
            <button
              type="button"
              className="dangerBtn"
              onClick={() => {
                onCloseQuickSale?.();
                setShowCloseModal(true);
              }}
              disabled={Boolean(busy)}
            >
              {isArabic ? "إغلاق الوردية" : "Close shift"}
            </button>
          </div>
        </div>
      </div>

      {showCloseModal && activeShift && appUser ? (
        <CashierShiftCloseModal
          isArabic={isArabic}
          currency={currency}
          shift={activeShift}
          appUser={appUser}
          pharmacySettings={pharmacySettings}
          getPaymentLabel={getPaymentLabel}
          onClose={() => setShowCloseModal(false)}
          onClosed={handleShiftClosed}
        />
      ) : null}
    </>
  );
}
