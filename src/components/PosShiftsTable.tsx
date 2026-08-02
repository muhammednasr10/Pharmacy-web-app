import { useCallback, useEffect, useState } from "react";
import type { AppUser, CashierShift, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { downloadCashierShiftPdf } from "../utils/cashierShiftReport";
import { isPharmacyManager } from "../utils/roles";

type PosShiftsTableProps = {
  isArabic: boolean;
  currency: string;
  pharmacyId: string;
  appUser: AppUser | null;
  pharmacySettings?: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
  activeShiftId?: number;
  refreshKey?: string | number;
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
}: PosShiftsTableProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(todayIsoDate);
  const [toDate, setToDate] = useState(todayIsoDate);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const canViewShifts =
    appUser &&
    (appUser.role === "cashier" || isPharmacyManager(appUser) || appUser.role === "super_admin");

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
    if (!open) return;
    void loadRows();
  }, [open, loadRows, refreshKey]);

  async function handleDownload(shift: CashierShift) {
    const summary = await pharmacyService.computeCashierShiftSummary(shift);
    downloadCashierShiftPdf({
      shift,
      summary,
      pharmacy: pharmacySettings,
      currency,
      isArabic,
      getPaymentLabel,
    });
  }

  if (!canViewShifts) return null;

  return (
    <div className={`posShiftsTableSection${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="posShiftsTableToggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="pos-shifts-table-panel"
      >
        <span className="posShiftsTableToggleIcon" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        <span className="posShiftsTableToggleText">
          <span className="posShiftsTableToggleTitle">
            {isArabic ? "جدول الورديات" : "Shifts table"}
          </span>
          <span className="posShiftsTableToggleHint mutedText">
            {open
              ? isArabic
                ? "اضغط للإغلاق"
                : "Click to collapse"
              : isArabic
                ? "اضغط للفتح — عرض ورديات الكاشير"
                : "Click to open — view cashier shifts"}
          </span>
        </span>
      </button>

      {open ? (
        <div className="posShiftsTablePanel" id="pos-shifts-table-panel">
          <div className="posShiftsTableFilters">
            <label>
              {isArabic ? "من" : "From"}
              <input
                type="date"
                className="tableInput"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label>
              {isArabic ? "إلى" : "To"}
              <input
                type="date"
                className="tableInput"
                value={toDate}
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
            <button
              type="button"
              className="secondaryBtn posShiftsTableRefreshBtn"
              onClick={() => void loadRows()}
              disabled={loading}
            >
              {loading ? (isArabic ? "جاري التحميل..." : "Loading...") : isArabic ? "تحديث" : "Refresh"}
            </button>
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
                  <th />
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
                        <td>
                          {shift.status === "closed" ? (
                            <button
                              type="button"
                              className="secondaryBtn"
                              onClick={() => void handleDownload(shift)}
                            >
                              PDF
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
