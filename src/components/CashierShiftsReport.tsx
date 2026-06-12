import { useCallback, useEffect, useState } from "react";
import type { AppUser, CashierShift, PharmacySettings } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { downloadCashierShiftPdf } from "../utils/cashierShiftReport";
import { isPharmacyManager } from "../utils/roles";

type CashierShiftsReportProps = {
  isArabic: boolean;
  currency: string;
  pharmacyId: string;
  appUser: AppUser | null;
  pharmacySettings?: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
};

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function formatDateTime(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

export default function CashierShiftsReport({
  isArabic,
  currency,
  pharmacyId,
  appUser,
  pharmacySettings,
  getPaymentLabel,
}: CashierShiftsReportProps) {
  const [rows, setRows] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadRows = useCallback(async () => {
    if (!pharmacyId) return;
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
        status: "closed",
        limit: 100,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId, fromDate, toDate, appUser]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

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

  return (
    <section className="card cashierShiftsReportCard">
      <div className="cardHeader">
        <div>
          <h3>{isArabic ? "تقفيل ورديات الكاشير" : "Cashier shift closings"}</h3>
          <p className="returnsSectionHint">
            {isArabic
              ? "سجل الورديات المغلقة مع الفرق بين النقد المتوقع والفعلي."
              : "Closed shifts with expected vs actual cash variance."}
          </p>
        </div>
        <button
          type="button"
          className="secondaryBtn"
          onClick={() => void loadRows()}
          disabled={loading}
        >
          {loading ? (isArabic ? "جاري التحميل..." : "Loading...") : isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      <div className="hrFilters">
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
      </div>

      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>{isArabic ? "الوردية" : "Shift"}</th>
              <th>{isArabic ? "الكاشير" : "Cashier"}</th>
              <th>{isArabic ? "فتح" : "Opened"}</th>
              <th>{isArabic ? "إغلاق" : "Closed"}</th>
              <th>{isArabic ? "المبيعات" : "Sales"}</th>
              <th>{isArabic ? "متوقع" : "Expected"}</th>
              <th>{isArabic ? "فعلي" : "Actual"}</th>
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
                      ? "لا توجد ورديات مغلقة في هذه الفترة"
                      : "No closed shifts in this period"}
                </td>
              </tr>
            ) : (
              rows.map((shift) => (
                <tr key={shift.id}>
                  <td>{shift.shiftNumber}</td>
                  <td>{shift.cashierName || shift.cashierId}</td>
                  <td>{formatDateTime(shift.openedAt, isArabic)}</td>
                  <td>{formatDateTime(shift.closedAt, isArabic)}</td>
                  <td>{formatMoney(shift.totalSales, currency)}</td>
                  <td>{formatMoney(shift.expectedCash ?? 0, currency)}</td>
                  <td>{formatMoney(shift.actualCash ?? 0, currency)}</td>
                  <td
                    className={
                      Number(shift.cashVariance ?? 0) < 0
                        ? "textDanger"
                        : Number(shift.cashVariance ?? 0) > 0
                          ? "textSuccess"
                          : ""
                    }
                  >
                    {formatMoney(shift.cashVariance ?? 0, currency)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => void handleDownload(shift)}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
