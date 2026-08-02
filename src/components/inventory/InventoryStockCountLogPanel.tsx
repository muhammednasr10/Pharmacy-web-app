import { useEffect, useState } from "react";
import type { StockMovement } from "../../types";
import { formatDateInput } from "../../utils/date";
import { downloadCSV } from "../../utils/csvExport";
import { fetchStockCountSessionMovements } from "../../services/pharmacy/inventoryPaginationService";
import { usePaginatedStockCountLogs } from "../../hooks/usePaginatedStockCountLogs";
import InventoryPaginationBar from "./InventoryPaginationBar";

type InventoryStockCountLogPanelProps = {
  isArabic: boolean;
  enabled: boolean;
  refreshKey?: number;
  onStartStockCount?: () => void;
  canManageInventory?: boolean;
};

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLogDate(value: string, isArabic: boolean) {
  if (!value) return "-";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InventoryStockCountLogPanel({
  isArabic,
  enabled,
  refreshKey = 0,
  onStartStockCount,
  canManageInventory = false,
}: InventoryStockCountLogPanelProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [detailRows, setDetailRows] = useState<StockMovement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { rows, total, page, pageSize, loading, error, setPage } = usePaginatedStockCountLogs({
    enabled,
    search: debouncedSearch,
    fromDate,
    toDate,
    refreshKey,
  });

  useEffect(() => {
    if (!enabled || expandedLogId == null) return;

    const log = rows.find((row) => row.id === expandedLogId);
    if (!log?.createdAt) {
      setDetailRows([]);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    void fetchStockCountSessionMovements(log.createdAt).then((movements) => {
      if (cancelled) return;
      setDetailRows(movements);
      setDetailLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, expandedLogId, rows]);

  function toggleExpand(logId: number) {
    setExpandedLogId((current) => (current === logId ? null : logId));
    setDetailRows([]);
  }

  function exportCsv() {
    const header = [
      isArabic ? "التاريخ" : "Date",
      isArabic ? "المستخدم" : "User",
      isArabic ? "العنوان" : "Title",
      isArabic ? "الملخص" : "Summary",
      isArabic ? "رقم الجلسة" : "Session ID",
    ];

    const body = rows.map((log) => [
      log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
      log.userName || "-",
      log.title || "-",
      log.description || "-",
      log.referenceId || "-",
    ]);

    downloadCSV(`stock-count-log-${formatDateInput(new Date())}.csv`, [header, ...body]);
  }

  return (
    <div className="invMgmtPanel" role="tabpanel">
      <div className="invMgmtPanelToolbar">
        <div className="filtersBar invMgmtFiltersBar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isArabic ? "بحث بالملخص أو المستخدم أو رقم الجلسة" : "Search summary, user, or session"
            }
          />
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          <button
            type="button"
            className="clearCartBtn"
            onClick={() => {
              setSearch("");
              setFromDate("");
              setToDate("");
            }}
          >
            {isArabic ? "مسح الفلاتر" : "Clear filters"}
          </button>
        </div>
        <div className="inventoryHeaderActions">
          {canManageInventory && onStartStockCount ? (
            <button type="button" className="editBtn" onClick={onStartStockCount}>
              {isArabic ? "📋 بدء جرد جديد" : "📋 New stock count"}
            </button>
          ) : null}
          <button type="button" className="printBtn" onClick={exportCsv} disabled={!rows.length}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير الصفحة" : "Export page"}</span>
          </button>
        </div>
      </div>

      {error ? <p className="invMgmtError">{error}</p> : null}

      {loading && rows.length === 0 ? (
        <p className="empty">{isArabic ? "جاري تحميل سجل الجرد..." : "Loading stock count log..."}</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          {isArabic
            ? "لا توجد جلسات جرد مسجّلة — ابدأ جرداً من تبويب المخزون الحالي"
            : "No stock count sessions yet — start one from Current stock"}
        </p>
      ) : (
        <div className={`invMgmtStockCountLog ${loading ? "is-loading" : ""}`}>
          {rows.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <article key={log.id} className={`invMgmtStockCountLogCard ${isExpanded ? "is-expanded" : ""}`}>
                <button
                  type="button"
                  className="invMgmtStockCountLogSummary"
                  onClick={() => toggleExpand(log.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="invMgmtStockCountLogMain">
                    <strong>{log.title || (isArabic ? "جرد مخزون" : "Stock count")}</strong>
                    <span className="mutedText">{log.description}</span>
                  </div>
                  <div className="invMgmtStockCountLogMeta">
                    <span>{formatLogDate(log.createdAt, isArabic)}</span>
                    <span>{log.userName || (isArabic ? "غير معروف" : "Unknown")}</span>
                    <span className="invMgmtStockCountLogChevron">{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="invMgmtStockCountLogDetails">
                    {detailLoading ? (
                      <p className="mutedText">
                        {isArabic ? "جاري تحميل تفاصيل الجرد..." : "Loading count details..."}
                      </p>
                    ) : detailRows.length === 0 ? (
                      <p className="mutedText">
                        {isArabic
                          ? "لا توجد بنود فرق مسجّلة في هذه الجلسة"
                          : "No variance lines recorded for this session"}
                      </p>
                    ) : (
                      <div className="stockCountTableWrap">
                        <table className="stockCountTable">
                          <thead>
                            <tr>
                              <th>{isArabic ? "الدواء" : "Medicine"}</th>
                              <th>{isArabic ? "الباركود" : "Barcode"}</th>
                              <th>{isArabic ? "في النظام" : "System"}</th>
                              <th>{isArabic ? "بعد الجرد" : "Counted"}</th>
                              <th>{isArabic ? "الفرق" : "Variance"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRows.map((line) => (
                              <tr key={`${line.id}-${line.medicineId}`}>
                                <td>{line.medicineName_ar || line.medicineName_en || "-"}</td>
                                <td dir="ltr">{line.barcode || "-"}</td>
                                <td>{safeNumber(line.qtyBefore)}</td>
                                <td>{safeNumber(line.qtyAfter)}</td>
                                <td className={safeNumber(line.quantityChange) !== 0 ? "warnCell" : ""}>
                                  {safeNumber(line.quantityChange) > 0 ? "+" : ""}
                                  {safeNumber(line.quantityChange)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {log.referenceId ? (
                      <p className="invMgmtStockCountLogRef mutedText" dir="ltr">
                        {isArabic ? "رقم الجلسة:" : "Session:"} {log.referenceId}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <InventoryPaginationBar
        isArabic={isArabic}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
}
