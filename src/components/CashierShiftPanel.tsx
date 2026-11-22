import { useCallback, useEffect, useState } from "react";
import type { AppUser, CashierShift, CashierShiftSummary, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import CashierShiftCloseModal from "./CashierShiftCloseModal";
import { isPharmacyManager } from "../utils/roles";
import { cashAmountErrorMessage, parseCashAmountInput } from "../utils/cashierShiftCash";

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

  const refreshSummary = useCallback(async () => {
    if (!activeShift) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const next = await pharmacyService.computeCashierShiftSummary(activeShift);
      setSummary(next);
    } catch (error) {
      console.error("Cashier shift summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeShift]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, summaryRefreshKey]);

  async function handleOpenShift() {
    if (!appUser) return;
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
      let text = message;
      if (message.includes("shift_already_open")) {
        text = isArabic ? "لديك وردية مفتوحة بالفعل" : "You already have an open shift";
      } else if (message.includes("cashier_shifts")) {
        text = isArabic
          ? "جدول ورديات الكاشير غير مفعّل. شغّل supabase/cashier-shifts.sql"
          : "Cashier shifts table missing. Run supabase/cashier-shifts.sql";
      }
      setPanelFeedback({ type: "error", text });
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
            onClick={() => {
              setOpeningCash("0");
              setOpeningCashError("");
              setPanelFeedback(null);
              setShowOpenModal(true);
            }}
            disabled={Boolean(busy)}
          >
            {isArabic ? "بدء وردية جديدة" : "Start new shift"}
          </button>
        </div>

        {showOpenModal ? (
          <div className="modalOverlay">
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
                  className={`tableInput${openingCashError ? " is-invalid" : ""}`}
                  value={openingCash}
                  onChange={(event) => {
                    setOpeningCash(event.target.value);
                    setOpeningCashError("");
                  }}
                />
                {openingCashError ? (
                  <span className="fieldErrorText" role="alert">
                    {openingCashError}
                  </span>
                ) : (
                  <span className="mutedText">
                    {isArabic ? "الصفر مسموح — اترك الحقل فارغًا غير مقبول" : "Zero is allowed — empty is not"}
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
                  disabled={busy === "open"}
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
                  {isArabic ? "مبيعات:" : "Sales:"} {formatMoney(summary.totalSales, currency)} (
                  {summary.invoiceCount})
                </span>
                <span>
                  {isArabic ? "نقد متوقع:" : "Expected cash:"}{" "}
                  {formatMoney(summary.expectedCash, currency)}
                </span>
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
              onClick={() => setShowCloseModal(true)}
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
