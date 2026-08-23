import { useCallback, useEffect, useState } from "react";
import type { AppUser, CashierShift, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import CashierShiftCloseModal from "./CashierShiftCloseModal";
import { isPharmacyManager } from "../utils/roles";
import { getReportQuickRange } from "../utils/reportDateRange";

type PosShiftsTableProps = {
  isArabic: boolean;
  currency: string;
  pharmacyId: string;
  appUser: AppUser | null;
  pharmacySettings?: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
  activeShiftId?: number;
  refreshKey?: string | number;
  onSelectShift?: (shift: CashierShift) => void;
  onShiftClosed?: (shift: CashierShift) => void;
};

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function formatDateTime(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PosShiftsTable({
  isArabic,
  currency,
  pharmacyId,
  appUser,
  pharmacySettings,
  getPaymentLabel,
  activeShiftId,
  refreshKey = 0,
  onSelectShift,
  onShiftClosed,
}: PosShiftsTableProps) {
  const [rows, setRows] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [closingShift, setClosingShift] = useState<CashierShift | null>(null);
  const monthRange = getReportQuickRange("month");
  const [fromDate, setFromDate] = useState(monthRange.from);
  const [toDate, setToDate] = useState(monthRange.to);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  function applyTodayFilter() {
    const todayRange = getReportQuickRange("today");
    setFromDate(todayRange.from);
    setToDate(todayRange.to);
  }

  const canViewShifts =
    appUser &&
    (appUser.role === "cashier" || isPharmacyManager(appUser) || appUser.role === "super_admin");

  const canManageAllShifts =
    appUser && (isPharmacyManager(appUser) || appUser.role === "super_admin");

  const loadRows = useCallback(async () => {
    if (!pharmacyId || !canViewShifts) return;
    setLoading(true);
    try {
      const from = `${fromDate}T00:00:00.000Z`;
      const to = `${toDate}T23:59:59.999Z`;
      const cashierId =
        appUser?.role === "cashier" && !isPharmacyManager(appUser) ? appUser.uid : undefined;
      const data = await pharmacyService.listCashierShifts(pharmacyId, {
        from,
        to,
        cashierId,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId, canViewShifts, fromDate, toDate, statusFilter, appUser]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshKey]);

  async function handleShiftClosedFromTable(closed: CashierShift) {
    setClosingShift(null);
    setRows((current) =>
      current.map((row) => (row.id === closed.id ? { ...row, ...closed, status: "closed" } : row)),
    );
    onShiftClosed?.(closed);
    await loadRows();
  }

  async function handleDownload(shift: CashierShift) {
    const summary = await pharmacyService.computeCashierShiftSummary(shift);
    const { downloadCashierShiftPdf } = await import("../utils/cashierShiftReport");
    downloadCashierShiftPdf({
      shift,
      summary,
      pharmacy: pharmacySettings,
      currency,
      isArabic,
      getPaymentLabel,
    });
  }

  async function handleDelete(shift: CashierShift) {
    if (!appUser) return;

    const confirmed = window.confirm(
      isArabic
        ? `حذف الوردية ${shift.shiftNumber}؟ لا يمكن التراجع.`
        : `Delete shift ${shift.shiftNumber}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(shift.id);
    try {
      await pharmacyService.deleteCashierShift({
        shiftId: shift.id,
        pharmacyId,
        requesterId: appUser.uid,
        canManageAll: Boolean(canManageAllShifts),
      });
      setRows((current) => current.filter((row) => row.id !== shift.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("shift_still_open")) {
        alert(isArabic ? "لا يمكن حذف وردية مفتوحة" : "Cannot delete an open shift");
      } else if (message.includes("shift_has_sales")) {
        alert(
          isArabic
            ? "لا يمكن حذف وردية مرتبطة بمبيعات"
            : "Cannot delete a shift linked to sales",
        );
      } else if (message.includes("not_authorized")) {
        alert(isArabic ? "ليس لديك صلاحية الحذف" : "You are not allowed to delete this shift");
      } else {
        alert(message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (!canViewShifts) return null;

  return (
    <div className="posShiftsTableSection is-open">
      <div className="posShiftsTableHeading">
        <h3>{isArabic ? "جدول الورديات" : "Shifts table"}</h3>
      </div>

      <div className="posShiftsTablePanel" id="pos-shifts-table-panel">
        <div className="posShiftsTableFilters">
          <div className="posShiftsTableFilterDates">
            <label>
              {isArabic ? "من" : "From"}
              <input
                type="date"
                className="tableInput"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label>
              {isArabic ? "إلى" : "To"}
              <input
                type="date"
                className="tableInput"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
            <label>
              {isArabic ? "الحالة" : "Status"}
              <select
                className="tableInput"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "open" | "closed")
                }
              >
                <option value="all">{isArabic ? "الكل" : "All"}</option>
                <option value="open">{isArabic ? "مفتوحة" : "Open"}</option>
                <option value="closed">{isArabic ? "مغلقة" : "Closed"}</option>
              </select>
            </label>
          </div>
          <div className="posShiftsTableFilterActions">
            <button
              type="button"
              className="rangeChip"
              onClick={applyTodayFilter}
              title={isArabic ? "عرض ورديات اليوم فقط" : "Show today's shifts only"}
            >
              {isArabic ? "اليوم" : "Today"}
            </button>
            <button
              type="button"
              className="secondaryBtn posShiftsTableRefreshBtn"
              onClick={() => void loadRows()}
              disabled={loading}
            >
              {loading ? (isArabic ? "جاري التحميل..." : "Loading...") : isArabic ? "تحديث" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="tableWrap posShiftsTableWrap">
          <table className="dataTable posShiftsTable">
            <thead>
              <tr>
                <th>{isArabic ? "الوردية" : "Shift"}</th>
                <th>{isArabic ? "الكاشير" : "Cashier"}</th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{isArabic ? "فتح" : "Opened"}</th>
                <th>{isArabic ? "إغلاق" : "Closed"}</th>
                <th>{isArabic ? "المبيعات" : "Sales"}</th>
                <th>{isArabic ? "الفواتير" : "Invoices"}</th>
                <th>{isArabic ? "الفرق" : "Variance"}</th>
                <th className="posShiftsTableActionsCol">{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="emptyCell">
                    {loading
                      ? isArabic
                        ? "جاري التحميل..."
                        : "Loading..."
                      : isArabic
                        ? "لا توجد ورديات في هذه الفترة"
                        : "No shifts in this period"}
                  </td>
                </tr>
              ) : (
                rows.map((shift) => {
                  const isActive = shift.id === activeShiftId;
                  const variance = Number(shift.cashVariance ?? 0);
                  const canDelete =
                    shift.status === "closed" &&
                    (canManageAllShifts || shift.cashierId === appUser?.uid) &&
                    (shift.invoiceCount ?? 0) === 0;

                  const canClose =
                    shift.status === "open" &&
                    (canManageAllShifts || shift.cashierId === appUser?.uid);
                  const canSelect =
                    shift.status === "open" && !isActive && Boolean(onSelectShift);

                  return (
                    <tr key={shift.id} className={isActive ? "posShiftsTableRowActive" : undefined}>
                      <td>
                        <strong>{shift.shiftNumber}</strong>
                        {isActive ? (
                          <span className="posShiftsTableCurrentTag">
                            {isArabic ? "الحالية" : "Current"}
                          </span>
                        ) : null}
                      </td>
                      <td>{shift.cashierName || shift.cashierId}</td>
                      <td>
                        <span
                          className={`posShiftStatusBadge posShiftStatusBadge--${shift.status}`}
                        >
                          {shift.status === "open"
                            ? isArabic
                              ? "مفتوحة"
                              : "Open"
                            : isArabic
                              ? "مغلقة"
                              : "Closed"}
                        </span>
                      </td>
                      <td>{formatDateTime(shift.openedAt, isArabic)}</td>
                      <td>{formatDateTime(shift.closedAt, isArabic)}</td>
                      <td>{formatMoney(shift.totalSales, currency)}</td>
                      <td>{shift.invoiceCount ?? 0}</td>
                      <td
                        className={
                          shift.status === "closed"
                            ? variance < 0
                              ? "textDanger"
                              : variance > 0
                                ? "textSuccess"
                                : ""
                            : ""
                        }
                      >
                        {shift.status === "closed" ? formatMoney(variance, currency) : "—"}
                      </td>
                      <td className="posShiftsTableActionsCol">
                        <div className="posShiftsTableActions">
                          {canSelect ? (
                            <button
                              type="button"
                              className="smallBtn posShiftsTableUseBtn"
                              onClick={() => onSelectShift?.(shift)}
                              title={isArabic ? "فتح البيع على هذه الوردية" : "Use this shift for sales"}
                            >
                              {isArabic ? "فتح البيع" : "Use shift"}
                            </button>
                          ) : null}
                          {canClose ? (
                            <button
                              type="button"
                              className="dangerBtn posShiftsTableCloseBtn"
                              onClick={() => setClosingShift(shift)}
                              title={isArabic ? "إغلاق الوردية" : "Close shift"}
                            >
                              {isArabic ? "إغلاق" : "Close"}
                            </button>
                          ) : null}
                          {shift.status === "closed" ? (
                            <button
                              type="button"
                              className="printBtn tableIconBtn"
                              onClick={() => void handleDownload(shift)}
                              title={isArabic ? "طباعة PDF" : "Print PDF"}
                              aria-label={isArabic ? "طباعة PDF" : "Print PDF"}
                            >
                              <span aria-hidden="true">🖨️</span>
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className="deleteSmallBtn tableIconBtn"
                              onClick={() => void handleDelete(shift)}
                              disabled={deletingId === shift.id}
                              title={isArabic ? "حذف" : "Delete"}
                              aria-label={isArabic ? "حذف الوردية" : "Delete shift"}
                            >
                              <span aria-hidden="true">🗑️</span>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {closingShift && appUser ? (
        <CashierShiftCloseModal
          isArabic={isArabic}
          currency={currency}
          shift={closingShift}
          appUser={appUser}
          pharmacySettings={pharmacySettings}
          getPaymentLabel={getPaymentLabel}
          onClose={() => setClosingShift(null)}
          onClosed={(closed) => void handleShiftClosedFromTable(closed)}
        />
      ) : null}
    </div>
  );
}
