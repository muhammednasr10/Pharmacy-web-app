import { safeNumber } from "./helpers";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersDebtsTab({ state }: Props) {
  const {
    isArabic,
    t,
    activeTab,
    filteredCustomerDebts,
    customerSearch,
    setCustomerSearch,
    customerDebtFilter,
    setCustomerDebtFilter,
    totalDebts,
    totalPaid,
    totalRemaining,
    openCustomerPaymentModal,
    setSelectedCustomer,
  } = state;

  if (activeTab !== "debts") return null;

  return (
    <>
      <div className="summaryGrid reportSummary">
        <div>
          <span>{isArabic ? "عدد العملاء" : "Customers"}</span>
          <strong>{filteredCustomerDebts.length}</strong>
        </div>
        <div>
          <span>{isArabic ? "إجمالي الآجل" : "Total Credit"}</span>
          <strong>
            {totalDebts.toFixed(2)} {t.currency}
          </strong>
        </div>
        <div>
          <span>{isArabic ? "إجمالي المحصل" : "Total Paid"}</span>
          <strong>
            {totalPaid.toFixed(2)} {t.currency}
          </strong>
        </div>
        <div>
          <span>{isArabic ? "المتبقي" : "Remaining"}</span>
          <strong>
            {totalRemaining.toFixed(2)} {t.currency}
          </strong>
        </div>
      </div>

      <div className="filtersBar">
        <input
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder={isArabic ? "بحث باسم العميل" : "Search customer"}
        />
        <select
          value={customerDebtFilter}
          onChange={(e) => setCustomerDebtFilter(e.target.value as "all" | "debt" | "paid")}
        >
          <option value="all">{isArabic ? "كل العملاء" : "All customers"}</option>
          <option value="debt">{isArabic ? "عليه مديونية" : "Has debt"}</option>
          <option value="paid">{isArabic ? "مسدد بالكامل" : "Fully paid"}</option>
        </select>
        <button
          className="clearCartBtn"
          onClick={() => {
            setCustomerSearch("");
            setCustomerDebtFilter("all");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredCustomerDebts.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد مديونيات آجلة" : "No credit debts"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "اسم العميل" : "Customer"}</th>
                <th>{isArabic ? "إجمالي الآجل" : "Total Credit"}</th>
                <th>{isArabic ? "المحصل" : "Paid"}</th>
                <th>{isArabic ? "المتبقي" : "Remaining"}</th>
                <th>{isArabic ? "عدد الفواتير" : "Invoices"}</th>
                <th>{isArabic ? "آخر فاتورة" : "Last Invoice"}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomerDebts.map((customer) => (
                <tr key={customer.customerName}>
                  <td>{customer.customerName}</td>
                  <td>
                    {safeNumber(customer.totalDebt).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    {safeNumber(customer.paidAmount).toFixed(2)} {t.currency}
                  </td>
                  <td>
                    <span
                      className={
                        safeNumber(customer.remainingDebt) > 0 ? "badge danger" : "badge ok"
                      }
                    >
                      {safeNumber(customer.remainingDebt).toFixed(2)} {t.currency}
                    </span>
                  </td>
                  <td>{customer.invoicesCount}</td>
                  <td>{customer.lastInvoiceDate}</td>
                  <td>
                    <div className="actionButtons">
                      {safeNumber(customer.remainingDebt) > 0 && (
                        <button
                          className="smallBtn"
                          onClick={() => openCustomerPaymentModal(customer)}
                        >
                          {isArabic ? "تحصيل" : "Collect"}
                        </button>
                      )}
                      <button className="printBtn" onClick={() => setSelectedCustomer(customer)}>
                        {isArabic ? "كشف حساب" : "Statement"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
