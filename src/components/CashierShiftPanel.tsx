import { useCallback, useEffect, useState } from "react";
import type { AppUser, CashierShift, CashierShiftSummary, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { downloadCashierShiftPdf } from "../utils/cashierShiftReport";
import { isPharmacyManager } from "../utils/roles";

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
}: CashierShiftPanelProps) {
  const [summary, setSummary] = useState<CashierShiftSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [busy, setBusy] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const refreshSummary = useCallback(async () => {
    if (!activeShift) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const next = await pharmacyService.computeCashierShiftSummary(activeShift);
      setSummary(next);
      if (!actualCash && showCloseModal) {
        setActualCash(next.expectedCash.toFixed(2));
      }
    } catch (error) {
      console.error("Cashier shift summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  }, [activeShift, actualCash, showCloseModal]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    if (showCloseModal && summary) {
      setActualCash(summary.expectedCash.toFixed(2));
    }
  }, [showCloseModal, summary]);

  if (!appUser || !pharmacyId) return null;

  const canManageShift =
    appUser.role === "cashier" || isPharmacyManager(appUser) || appUser.role === "super_admin";

  if (!canManageShift) return null;

  async function handleOpenShift() {
    if (!appUser) return;
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      alert(isArabic ? "أدخل رصيد افتتاحي صحيح" : "Enter a valid opening cash amount");
      return;
    }

    setBusy("open");
    try {
      const shift = await pharmacyService.openCashierShift({
        pharmacyId,
        cashierId: appUser.uid,
        cashierName: appUser.name,
        openingCash: amount,
        workShiftId,
      });
      onShiftChange(shift);
      setShowOpenModal(false);
      setOpeningCash("0");
      onShiftOpened?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("shift_already_open")) {
        alert(isArabic ? "لديك وردية مفتوحة بالفعل" : "You already have an open shift");
      } else if (message.includes("cashier_shifts")) {
        alert(
          isArabic
            ? "جدول ورديات الكاشير غير مفعّل. شغّل supabase/cashier-shifts.sql"
            : "Cashier shifts table missing. Run supabase/cashier-shifts.sql",
        );
      } else {
        alert(message);
      }
    } finally {
      setBusy("");
    }
  }

  async function handleCloseShift() {
    if (!activeShift || !appUser) return;
    const counted = Number(actualCash);
    if (!Number.isFinite(counted) || counted < 0) {
      alert(isArabic ? "أدخل النقد الفعلي في الصندوق" : "Enter the actual cash in drawer");
      return;
    }

    setBusy("close");
    try {
      const closed = await pharmacyService.closeCashierShift({
        shiftId: activeShift.id,
        actualCash: counted,
        notes: closeNotes.trim(),
        closedById: appUser.uid,
        closedByName: appUser.name,
      });
      const closedSummary = await pharmacyService.computeCashierShiftSummary(closed);
      downloadCashierShiftPdf({
        shift: closed,
        summary: closedSummary,
        pharmacy: pharmacySettings,
        currency,
        isArabic,
        getPaymentLabel,
      });
      onShiftChange(null);
      setShowCloseModal(false);
      setCloseNotes("");
      setActualCash("");
      alert(isArabic ? "تم إغلاق الوردية وحفظ التقرير" : "Shift closed and report saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="cashierShiftPanel">
        {!activeShift ? (
          <div className="cashierShiftPanelEmpty">
            <span>{isArabic ? "لا توجد وردية مفتوحة" : "No open cashier shift"}</span>
            <button
              type="button"
              className="primaryBtn"
              onClick={() => setShowOpenModal(true)}
              disabled={Boolean(busy)}
            >
              {isArabic ? "فتح وردية" : "Open shift"}
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {showOpenModal && (
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
            <label className="formField">
              {isArabic ? "رصيد الصندوق الافتتاحي" : "Opening cash in drawer"}
              <input
                type="number"
                min="0"
                step="0.01"
                className="tableInput"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
              />
            </label>
            <div className="modalActions">
              <button
                type="button"
                className="primaryBtn"
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
      )}

      {showCloseModal && activeShift && summary && (
        <div className="modalOverlay">
          <div
            className="invoiceModal userModal cashierShiftModal"
            onClick={(event) => event.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="modalHeader">
              <h3>{isArabic ? "إغلاق الوردية" : "Close shift"}</h3>
              <button
                type="button"
                className="deleteSmallBtn"
                onClick={() => setShowCloseModal(false)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <div className="cashierShiftCloseGrid">
              <div>
                <span>{isArabic ? "رصيد افتتاحي" : "Opening cash"}</span>
                <strong>{formatMoney(activeShift.openingCash, currency)}</strong>
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
                <span>{isArabic ? "النقد المتوقع" : "Expected cash"}</span>
                <strong>{formatMoney(summary.expectedCash, currency)}</strong>
              </div>
            </div>

            <label className="formField">
              {isArabic ? "النقد الفعلي في الصندوق" : "Actual cash counted"}
              <input
                type="number"
                min="0"
                step="0.01"
                className="tableInput"
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
              />
            </label>

            {actualCash && (
              <p className="returnsSectionHint">
                {isArabic ? "الفرق:" : "Variance:"}{" "}
                {formatMoney(Number(actualCash) - summary.expectedCash, currency)}
              </p>
            )}

            <label className="formField">
              {isArabic ? "ملاحظات" : "Notes"}
              <textarea
                className="tableInput"
                rows={2}
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
              />
            </label>

            <div className="modalActions">
              <button
                type="button"
                className="dangerBtn"
                onClick={() => void handleCloseShift()}
                disabled={busy === "close"}
              >
                {busy === "close"
                  ? isArabic
                    ? "جاري الإغلاق..."
                    : "Closing..."
                  : isArabic
                    ? "تأكيد الإغلاق"
                    : "Confirm close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
