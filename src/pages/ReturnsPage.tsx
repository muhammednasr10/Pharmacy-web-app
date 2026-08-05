import { useMemo, useState } from "react";
import InvoiceTable from "../components/InvoiceTable";
import type { Invoice, PaymentMethod, ReturnRecord } from "../types";

type ReturnsPageProps = {
  returns: ReturnRecord[];
  filteredInvoicesList: Invoice[];
  invoiceSearch: string;
  invoicePaymentFilter: "all" | PaymentMethod;
  invoiceFromDate: string;
  invoiceToDate: string;
  setInvoiceSearch: (value: string) => void;
  setInvoicePaymentFilter: (value: "all" | PaymentMethod) => void;
  setInvoiceFromDate: (value: string) => void;
  setInvoiceToDate: (value: string) => void;
  exportInvoicesCSV: () => void;
  exportReturnsCSV: () => void;
  getPaymentLabel: (method: string) => string;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  getReturnItemsSummary: (record: ReturnRecord) => string;
  onViewReturn: (record: ReturnRecord) => void;
  onDeleteReturn: (record: ReturnRecord) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onReturnInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  canUseReturns: boolean;
  canCreateReturn?: boolean;
  canDeleteReturn: boolean;
  deletingReturnId: number | string | null;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  safeNumber: (value: unknown) => number;
};

function parseReturnDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function ReturnsPage({
  returns,
  filteredInvoicesList,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  setInvoiceSearch,
  setInvoicePaymentFilter,
  setInvoiceFromDate,
  setInvoiceToDate,
  exportInvoicesCSV,
  exportReturnsCSV,
  getPaymentLabel,
  getReturnTypeLabel,
  getRefundMethodLabel,
  getReturnItemsSummary,
  onViewReturn,
  onDeleteReturn,
  onViewInvoice,
  onReturnInvoice,
  onPrintInvoice,
  canUseReturns,
  canCreateReturn = false,
  canDeleteReturn,
  deletingReturnId,
  showBranchColumn = false,
  getBranchLabel,
  t,
  isArabic,
  currency,
  safeNumber,
}: ReturnsPageProps) {
  const [returnSearch, setReturnSearch] = useState("");
  const [returnFromDate, setReturnFromDate] = useState("");
  const [returnToDate, setReturnToDate] = useState("");
  const [returnTypeFilter, setReturnTypeFilter] = useState<"all" | "instant" | "invoice">("all");
  const [showNewReturnPicker, setShowNewReturnPicker] = useState(false);

  const sortedReturns = useMemo(
    () =>
      [...returns].sort((a, b) => {
        const aTime = parseReturnDate(a.createdAt || a.date)?.getTime() || 0;
        const bTime = parseReturnDate(b.createdAt || b.date)?.getTime() || 0;
        return bTime - aTime;
      }),
    [returns],
  );

  const filteredReturns = useMemo(() => {
    const query = returnSearch.trim().toLowerCase();

    return sortedReturns.filter((record) => {
      if (returnTypeFilter === "instant" && !record.isInstant) return false;
      if (returnTypeFilter === "invoice" && record.isInstant) return false;

      if (query) {
        const haystack = [
          record.returnNumber,
          record.invoiceNumber,
          record.userName,
          record.reason,
          ...(record.items || []).map((item) => item.name_ar),
          ...(record.items || []).map((item) => item.name_en),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      const recordDate = parseReturnDate(record.date || record.createdAt);
      if (returnFromDate && recordDate) {
        const from = new Date(returnFromDate);
        if (recordDate < from) return false;
      }
      if (returnToDate && recordDate) {
        const to = new Date(returnToDate);
        to.setHours(23, 59, 59, 999);
        if (recordDate > to) return false;
      }

      return true;
    });
  }, [sortedReturns, returnSearch, returnFromDate, returnToDate, returnTypeFilter]);

  const returnsTotal = useMemo(
    () => filteredReturns.reduce((sum, record) => sum + safeNumber(record.total), 0),
    [filteredReturns, safeNumber],
  );

  function handlePickInvoiceForReturn(invoice: Invoice) {
    setShowNewReturnPicker(false);
    onReturnInvoice(invoice);
  }

  return (
    <div className="returnsPageWrap">
      <section className="card returnsIntroCard">
        <div className="returnsIntroContent">
          <span className="returnsIntroIcon" aria-hidden="true">
            ↩️
          </span>
          <div>
            <h2>{isArabic ? "سجل المرتجعات" : "Returns History"}</h2>
            <p>
              {isArabic
                ? "هنا تظهر عمليات إرجاع الأصناف للمخزون واسترداد المبالغ. الفواتير (المبيعات) موجودة في صفحة الفواتير فقط."
                : "Returned items and refunded amounts appear here. Sales invoices are on the Invoices page only."}
            </p>
          </div>
        </div>
        <div className="returnsIntroLegend">
          <span className="returnLegendItem">
            <span className="returnDocBadge small">RET</span>
            {isArabic ? "رقم المرتجع" : "Return number"}
          </span>
          <span className="returnLegendItem">
            <span className="invoiceDocBadge small">INV</span>
            {isArabic ? "الفاتورة الأصلية (البيع)" : "Original sale invoice"}
          </span>
        </div>
      </section>

      <div className="returnsStats">
        <div className="returnsStatCard">
          <span>{isArabic ? "عدد المرتجعات" : "Returns Count"}</span>
          <strong>{filteredReturns.length}</strong>
        </div>
        <div className="returnsStatCard accent">
          <span>{isArabic ? "إجمالي المبالغ المستردة" : "Total Refunded"}</span>
          <strong>
            {returnsTotal.toFixed(2)} {currency}
          </strong>
        </div>
      </div>

      <section className="card returnsHistoryCard">
        <div className="cardHeader returnsPageActions">
          <div>
            <h2>{isArabic ? "تفاصيل المرتجعات" : "Return Records"}</h2>
            <p className="returnsSectionHint">
              {isArabic
                ? "متى تم المرتجع، من قام به، على أي فاتورة، وكيف تم الاسترداد"
                : "When, who, which invoice, and how each return was processed"}
            </p>
          </div>
          <div className="returnsHeaderBtns">
            {(canCreateReturn ?? canUseReturns) ? (
              <button
                type="button"
                className="printFullBtn"
                onClick={() => setShowNewReturnPicker(true)}
              >
                {isArabic ? "تسجيل مرتجع جديد" : "New Return"}
              </button>
            ) : null}
            <button type="button" className="printBtn" onClick={exportReturnsCSV}>
              <span aria-hidden="true">⬇️</span>
              <span>{isArabic ? "تصدير المرتجعات" : "Export Returns"}</span>
            </button>
          </div>
        </div>

        <div className="filtersBar returnsFiltersBar">
          <input
            value={returnSearch}
            onChange={(e) => setReturnSearch(e.target.value)}
            placeholder={
              isArabic
                ? "بحث برقم المرتجع أو الفاتورة أو الموظف أو الصنف"
                : "Search return, invoice, employee, or item"
            }
          />
          <select
            value={returnTypeFilter}
            onChange={(e) => setReturnTypeFilter(e.target.value as "all" | "instant" | "invoice")}
          >
            <option value="all">{isArabic ? "كل أنواع المرتجع" : "All return types"}</option>
            <option value="instant">{isArabic ? "مرتجع لحظي (POS)" : "Instant (POS)"}</option>
            <option value="invoice">{isArabic ? "مرتجع على فاتورة" : "Invoice return"}</option>
          </select>
          <input
            type="date"
            value={returnFromDate}
            onChange={(e) => setReturnFromDate(e.target.value)}
          />
          <input
            type="date"
            value={returnToDate}
            onChange={(e) => setReturnToDate(e.target.value)}
          />
          <button
            type="button"
            className="clearCartBtn"
            onClick={() => {
              setReturnSearch("");
              setReturnFromDate("");
              setReturnToDate("");
              setReturnTypeFilter("all");
            }}
          >
            {isArabic ? "مسح الفلاتر" : "Clear filters"}
          </button>
        </div>

        {filteredReturns.length === 0 ? (
          <p className="empty">
            {isArabic ? "لا توجد مرتجعات مطابقة للبحث" : "No matching returns"}
          </p>
        ) : (
          <div className="tableWrap">
            <table className="returnsTable">
              <thead>
                <tr>
                  {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "رقم المرتجع" : "Return No."}</th>
                  <th>{isArabic ? "الفاتورة الأصلية" : "Original Invoice"}</th>
                  <th>{t.date}</th>
                  <th>{isArabic ? "الموظف" : "Employee"}</th>
                  <th>{isArabic ? "طريقة الاسترداد" : "Refund"}</th>
                  <th>{isArabic ? "الأصناف المرجعة" : "Returned Items"}</th>
                  <th>{isArabic ? "المبلغ المسترد" : "Refunded"}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((record) => (
                  <tr key={record.id}>
                    {showBranchColumn && (
                      <td>
                        {getBranchLabel
                          ? getBranchLabel(record.pharmacyId)
                          : record.pharmacyId || "—"}
                      </td>
                    )}
                    <td>
                      <span
                        className={
                          record.isInstant ? "returnTypeBadge instant" : "returnTypeBadge invoice"
                        }
                      >
                        {getReturnTypeLabel(record)}
                      </span>
                    </td>
                    <td>
                      <span className="returnDocBadge">{record.returnNumber}</span>
                    </td>
                    <td>
                      <span className="invoiceDocBadge">{record.invoiceNumber}</span>
                    </td>
                    <td>{record.date || "-"}</td>
                    <td>{record.userName || "-"}</td>
                    <td>{getRefundMethodLabel(record)}</td>
                    <td className="returnItemsCell">{getReturnItemsSummary(record)}</td>
                    <td className="returnRefundAmount">
                      {safeNumber(record.total).toFixed(2)} {currency}
                    </td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => onViewReturn(record)}
                        >
                          {t.view}
                        </button>
                        {canDeleteReturn && (
                          <button
                            type="button"
                            className="deleteSmallBtn"
                            disabled={deletingReturnId === record.id}
                            onClick={() => onDeleteReturn(record)}
                          >
                            {deletingReturnId === record.id
                              ? isArabic
                                ? "جاري الحذف..."
                                : "Deleting..."
                              : t.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showNewReturnPicker && (canCreateReturn ?? canUseReturns) && (
        <div className="modalOverlay">
          <div className="invoiceModal returnsPickerModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "تسجيل مرتجع جديد" : "Create New Return"}</h2>
                <p>
                  {isArabic
                    ? "اختر فاتورة بيع (INV) ثم اضغط «مرتجع»"
                    : "Select a sale invoice (INV), then click Return"}
                </p>
              </div>
              <button
                type="button"
                className="closeBtn"
                onClick={() => setShowNewReturnPicker(false)}
              >
                ×
              </button>
            </div>

            <InvoiceTable
              embedded
              filteredInvoices={filteredInvoicesList}
              t={t}
              isArabic={isArabic}
              invoiceSearch={invoiceSearch}
              invoicePaymentFilter={invoicePaymentFilter}
              invoiceFromDate={invoiceFromDate}
              invoiceToDate={invoiceToDate}
              setInvoiceSearch={setInvoiceSearch}
              setInvoicePaymentFilter={setInvoicePaymentFilter}
              setInvoiceFromDate={setInvoiceFromDate}
              setInvoiceToDate={setInvoiceToDate}
              onViewInvoice={onViewInvoice}
              onReturnInvoice={handlePickInvoiceForReturn}
              onPrintInvoice={onPrintInvoice}
              canUseReturns={canUseReturns}
              returns={returns}
              exportInvoicesCSV={exportInvoicesCSV}
              getPaymentLabel={getPaymentLabel}
            />

            <div className="modalActions">
              <button
                type="button"
                className="completeBtn"
                onClick={() => setShowNewReturnPicker(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
