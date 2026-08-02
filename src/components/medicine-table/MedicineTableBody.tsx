import type { Medicine } from "../../types";
import MedicineTableRow from "./MedicineTableRow";

type MedicineTableBodyProps = {
  pageRows: Medicine[];
  tableColumnCount: number;
  splitNameColumns: boolean;
  showBranchColumn: boolean;
  showCostProfitColumns: boolean;
  isArabic: boolean;
  currency: string;
  t: Record<string, string>;
  emptyMessage?: string;
  showManagementActions: boolean;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  onAddToCart?: (medicine: Medicine) => void;
  addToCartLabel?: string;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  onViewStockDetail?: (medicine: Medicine) => void;
  resolveLowStockThreshold: (medicine: Medicine) => number;
};

export default function MedicineTableBody({
  pageRows,
  tableColumnCount,
  splitNameColumns,
  showBranchColumn,
  showCostProfitColumns,
  isArabic,
  currency,
  t,
  emptyMessage,
  showManagementActions,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  getBranchLabel,
  onAddToCart,
  addToCartLabel,
  onEditMedicine,
  onDeleteMedicine,
  onViewStockDetail,
  resolveLowStockThreshold,
}: MedicineTableBodyProps) {
  return (
    <div className={`tableWrap${splitNameColumns ? " medicineTableSplitNames" : ""}`}>
      <table>
        {splitNameColumns && (
          <colgroup>
            {showBranchColumn && <col className="medicineColBranch" />}
            <col className="medicineColNameAr" />
            <col className="medicineColNameEn" />
            <col className="medicineColIngredient" />
            <col className="medicineColBarcode" />
            <col className="medicineColQty" />
            <col className="medicineColExpiry" />
            {showCostProfitColumns && <col className="medicineColBuy" />}
            <col className="medicineColSell" />
            {showCostProfitColumns && <col className="medicineColProfit" />}
            <col className="medicineColAction" />
          </colgroup>
        )}
        <thead>
          <tr>
            {showBranchColumn && <th>{isArabic ? "الفرع" : "Branch"}</th>}
            {splitNameColumns ? (
              <>
                <th className="medicineNameCell medicineNameCellAr">
                  {isArabic ? "الدواء بالعربي" : "Medicine (Arabic)"}
                </th>
                <th className="medicineNameCell medicineNameCellEn">
                  {isArabic ? "الدواء بالإنجليزي" : "Medicine (English)"}
                </th>
                <th className="medicineNameCell medicineNameCellIngredient">
                  {isArabic ? "المادة الفعالة" : "Active ingredient"}
                </th>
              </>
            ) : (
              <th>{t.medicine}</th>
            )}
            <th>{t.barcode}</th>
            <th>{t.qty}</th>
            <th>{t.expiry}</th>
            {showCostProfitColumns && <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>}
            <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
            {showCostProfitColumns && <th>{isArabic ? "الربح" : "Profit"}</th>}
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={tableColumnCount} className="empty">
                {emptyMessage ||
                  (isArabic ? "لا توجد نتائج مطابقة للفلاتر" : "No rows match the filters")}
              </td>
            </tr>
          ) : (
            pageRows.map((medicine) => (
              <MedicineTableRow
                key={`${medicine.pharmacyId || "main"}-${medicine.id}`}
                medicine={medicine}
                isArabic={isArabic}
                currency={currency}
                t={t}
                splitNameColumns={splitNameColumns}
                showBranchColumn={showBranchColumn}
                showCostProfitColumns={showCostProfitColumns}
                showManagementActions={showManagementActions}
                canUsePOS={canUsePOS}
                canManageInventory={canManageInventory}
                canDeleteMedicine={canDeleteMedicine}
                getBranchLabel={getBranchLabel}
                onAddToCart={onAddToCart}
                addToCartLabel={addToCartLabel}
                onEditMedicine={onEditMedicine}
                onDeleteMedicine={onDeleteMedicine}
                onViewStockDetail={onViewStockDetail}
                resolveLowStockThreshold={resolveLowStockThreshold}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
