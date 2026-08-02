import BranchScopeSelect from "../../components/BranchScopeSelect";
import type { PurchasesPageState } from "./usePurchasesPageState";

type Props = { state: PurchasesPageState };

export default function PurchasesListPanel({ state }: Props) {
  const {
    isArabic,
    t,
    currency,
    canUsePurchases,
    canDeletePurchase,
    isSubscriptionExpired,
    showBranchColumn,
    safeNumber,
    branchOptions,
    purchaseSearch,
    setPurchaseSearch,
    purchaseFromDate,
    setPurchaseFromDate,
    purchaseToDate,
    setPurchaseToDate,
    branchFilter,
    setBranchFilter,
    viewGroup,
    setViewGroup,
    saving,
    deletingPurchaseNumber,
    filteredPurchaseGroups,
    formatBranchLabel,
    openEditPurchaseModal,
    handleDeletePurchase,
    exportPurchasesCSV,
    clearFilters,
  } = state;

  return (
    <>
      <div className="cardHeader purchasesHistoryHeader">
        <h2>{isArabic ? "سجل المشتريات" : "Purchases History"}</h2>
        <button type="button" className="printBtn" onClick={exportPurchasesCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      <div className="filtersBar purchaseFiltersBar">
        <input
          value={purchaseSearch}
          onChange={(e) => setPurchaseSearch(e.target.value)}
          placeholder={
            isArabic
              ? "بحث برقم التوريد أو الدواء أو الباركود أو المورد"
              : "Search purchase no., medicine, barcode, or supplier"
          }
        />

        {showBranchColumn && branchOptions.length > 1 && (
          <BranchScopeSelect
            pharmacies={branchOptions}
            value={branchFilter}
            onChange={setBranchFilter}
            isArabic={isArabic}
            includeAllOption={{
              value: "all",
              label: isArabic ? "كل الفروع" : "All branches",
            }}
          />
        )}

        <input
          type="date"
          value={purchaseFromDate}
          onChange={(e) => setPurchaseFromDate(e.target.value)}
        />

        <input
          type="date"
          value={purchaseToDate}
          onChange={(e) => setPurchaseToDate(e.target.value)}
        />

        <button type="button" className="clearCartBtn" onClick={clearFilters}>
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredPurchaseGroups.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد مشتريات حتى الآن" : "No purchases yet"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "رقم التوريد" : "Purchase No."}</th>
                {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
                <th>{isArabic ? "عدد الأصناف" : "Items"}</th>
                <th>{isArabic ? "إجمالي الكمية" : "Total Qty"}</th>
                <th>{isArabic ? "إجمالي التكلفة" : "Total Cost"}</th>
                <th>{isArabic ? "المورد" : "Supplier"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseGroups.map((group) => (
                <tr key={group.purchaseNumber}>
                  <td>
                    <strong className="purchaseNumberTag">{group.purchaseNumber}</strong>
                  </td>
                  {showBranchColumn && <td>{formatBranchLabel(group.pharmacyId)}</td>}
                  <td>{group.items.length}</td>
                  <td>{group.totalQuantity}</td>
                  <td>
                    {group.totalCost.toFixed(2)} {currency}
                  </td>
                  <td>{group.supplierName || "-"}</td>
                  <td>{group.userName || "-"}</td>
                  <td>{group.date || group.createdAt || "-"}</td>
                  <td>
                    <div className="actionButtons purchaseRowActions">
                      <button
                        type="button"
                        className="smallBtn"
                        onClick={() => setViewGroup(group)}
                      >
                        {isArabic ? "عرض" : "View"}
                      </button>
                      {canUsePurchases && (
                        <button
                          type="button"
                          className="editBtn"
                          disabled={isSubscriptionExpired || saving}
                          onClick={() => void openEditPurchaseModal(group)}
                        >
                          {t.edit}
                        </button>
                      )}
                      {canDeletePurchase && (
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={
                            isSubscriptionExpired || deletingPurchaseNumber === group.purchaseNumber
                          }
                          onClick={() => void handleDeletePurchase(group)}
                        >
                          {deletingPurchaseNumber === group.purchaseNumber
                            ? isArabic
                              ? "..."
                              : "..."
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

      {viewGroup && (
        <div className="modalOverlay">
          <div className="invoiceModal purchaseViewModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {isArabic ? "أدوية التوريد" : "Purchase items"} — {viewGroup.purchaseNumber}
                </h2>
                <p className="returnsSectionHint">
                  {isArabic ? "الفرع:" : "Branch:"} {formatBranchLabel(viewGroup.pharmacyId)}
                  {" · "}
                  {isArabic ? "المورد:" : "Supplier:"} {viewGroup.supplierName || "-"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={() => setViewGroup(null)}>
                ×
              </button>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.medicine}</th>
                    <th>{t.barcode}</th>
                    <th>{t.qty}</th>
                    <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
                    <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
                    <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewGroup.items.map((item) => (
                    <tr key={item.id}>
                      <td>{isArabic ? item.medicineName_ar : item.medicineName_en}</td>
                      <td>{item.barcode}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {safeNumber(item.buyPrice).toFixed(2)} {currency}
                      </td>
                      <td>
                        {safeNumber(item.sellPrice).toFixed(2)} {currency}
                      </td>
                      <td>
                        {safeNumber(item.totalCost).toFixed(2)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="purchaseViewSummary">
              <span>
                {isArabic ? "عدد الأصناف:" : "Items:"} {viewGroup.items.length}
              </span>
              <span>
                {isArabic ? "إجمالي الكمية:" : "Total qty:"} {viewGroup.totalQuantity}
              </span>
              <strong>
                {isArabic ? "إجمالي التكلفة:" : "Total cost:"} {viewGroup.totalCost.toFixed(2)}{" "}
                {currency}
              </strong>
            </div>

            <div className="modalActions">
              <button type="button" className="completeBtn" onClick={() => setViewGroup(null)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
