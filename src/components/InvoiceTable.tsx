import { useMemo } from "react";
import type { Invoice, PaymentMethod, ReturnRecord } from "../types";
import { getReturnedInvoiceNumbers } from "../utils/returnHelpers";

type InvoiceTableProps = {
  filteredInvoices: Invoice[];
  t: Record<string, string>;
  isArabic: boolean;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  invoiceSearch: string;
  invoicePaymentFilter: "all" | PaymentMethod;
  invoiceFromDate: string;
  invoiceToDate: string;
  setInvoiceSearch: (value: string) => void;
  setInvoicePaymentFilter: (value: "all" | PaymentMethod) => void;
  setInvoiceFromDate: (value: string) => void;
  setInvoiceToDate: (value: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onReturnInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  canUseReturns: boolean;
  exportInvoicesCSV: () => void;
  getPaymentLabel: (method: string) => string;
  embedded?: boolean;
  returns?: ReturnRecord[];
};

export default function InvoiceTable({
  filteredInvoices,
  t,
  isArabic,
  showBranchColumn = false,
  getBranchLabel,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  setInvoiceSearch,
  setInvoicePaymentFilter,
  setInvoiceFromDate,
  setInvoiceToDate,
  onViewInvoice,
  onReturnInvoice,
  onPrintInvoice,
  canUseReturns,
  exportInvoicesCSV,
  getPaymentLabel,
  embedded = false,
  returns = [],
}: InvoiceTableProps) {
  const returnedInvoiceNumbers = useMemo(
    () => getReturnedInvoiceNumbers(returns),
    [returns],
  );

  const Wrapper = embedded ? "div" : "section";
  const wrapperClass = embedded ? "invoicePickerEmbed" : "card invoicesPage";

  return (
    <Wrapper className={wrapperClass}>
      {!embedded && (
        <div className="cardHeader">
          <h2>{t.allInvoices}</h2>
          <button className="printBtn" onClick={exportInvoicesCSV}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
          </button>
        </div>
      )}
      <div className="filtersBar">
        <input
          value={invoiceSearch}
          onChange={(e) => setInvoiceSearch(e.target.value)}
          placeholder={
            isArabic
              ? "بحث برقم الفاتورة أو العميل أو الكاشير"
              : "Search invoice, customer, or cashier"
          }
        />
        <select
          value={invoicePaymentFilter}
          onChange={(e) => setInvoicePaymentFilter(e.target.value as "all" | PaymentMethod)}
        >
          <option value="all">{isArabic ? "كل طرق الدفع" : "All payments"}</option>
          <option value="cash">{getPaymentLabel("cash")}</option>
          <option value="visa">{getPaymentLabel("visa")}</option>
          <option value="wallet">{getPaymentLabel("wallet")}</option>
          <option value="credit">{getPaymentLabel("credit")}</option>
        </select>
        <input
          type="date"
          value={invoiceFromDate}
          onChange={(e) => setInvoiceFromDate(e.target.value)}
        />
        <input
          type="date"
          value={invoiceToDate}
          onChange={(e) => setInvoiceToDate(e.target.value)}
        />
        <button
          className="clearCartBtn"
          onClick={() => {
            setInvoiceSearch("");
            setInvoicePaymentFilter("all");
            setInvoiceFromDate("");
            setInvoiceToDate("");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>
      {filteredInvoices.length === 0 ? (
        <p className="empty">{t.noInvoices}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{t.invoiceNo}</th>
                <th>{t.date}</th>
                <th>{t.paymentMethod}</th>
                <th>{isArabic ? "العميل" : "Customer"}</th>
                <th>{t.subtotal}</th>
                <th>{t.discount}</th>
                <th>{t.total}</th>
                <th>{t.items}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={`${invoice.pharmacyId || "main"}-${invoice.id}`}>
                  {showBranchColumn && (
                    <td>
                      {getBranchLabel
                        ? getBranchLabel(invoice.pharmacyId)
                        : invoice.pharmacyId || "—"}
                    </td>
                  )}
                  <td>
                    <div className="invoiceNumberCell">
                      {embedded ? (
                        <span className="invoiceDocBadge">
                          {invoice.invoiceNumber || `#${invoice.id}`}
                        </span>
                      ) : (
                        <span>{invoice.invoiceNumber || `#${invoice.id}`}</span>
                      )}
                      {returnedInvoiceNumbers.has(String(invoice.invoiceNumber ?? "").trim()) && (
                        <span
                          className="returnTypeBadge invoice"
                          title={
                            isArabic
                              ? "تم تسجيل مرتجع على هذه الفاتورة"
                              : "This invoice has a return recorded"
                          }
                        >
                          {isArabic ? "مرتجع" : "Returned"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{invoice.date}</td>
                  <td>{getPaymentLabel(invoice.paymentMethod || "cash")}</td>
                  <td>{invoice.customerName || "-"}</td>
                  <td>
                    {(invoice.subtotal || invoice.total || 0).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    {(invoice.discount || 0).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    {(invoice.total || 0).toFixed(2)} {t.currency}
                  </td>
                  <td>{invoice.items?.length || 0}</td>
                  <td>
                    <div className="actionButtons">
                      <button className="smallBtn" onClick={() => onViewInvoice(invoice)}>
                        {t.view}
                      </button>
                      {canUseReturns && (
                        <button className="editBtn" onClick={() => onReturnInvoice(invoice)}>
                          {isArabic ? "مرتجع" : "Return"}
                        </button>
                      )}
                      <button className="printBtn" onClick={() => onPrintInvoice(invoice)}>
                        <span aria-hidden="true">🖨️</span>
                        <span>{t.print}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Wrapper>
  );
}
