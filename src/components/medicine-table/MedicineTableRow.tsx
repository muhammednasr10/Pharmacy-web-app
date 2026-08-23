import type { Medicine } from "../../types";
import {
  resolveMedicineActiveIngredient,
  resolveMedicineArabicName,
  resolveMedicineEnglishName,
} from "../../utils/medicineLookup";

type MedicineTableRowProps = {
  medicine: Medicine;
  isArabic: boolean;
  currency: string;
  t: Record<string, string>;
  splitNameColumns: boolean;
  showBranchColumn: boolean;
  showCostProfitColumns: boolean;
  showProfitColumn: boolean;
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

export default function MedicineTableRow({
  medicine,
  isArabic,
  currency,
  t,
  splitNameColumns,
  showBranchColumn,
  showCostProfitColumns,
  showProfitColumn,
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
}: MedicineTableRowProps) {
  return (
    <tr>
      {showBranchColumn && (
        <td>
          {getBranchLabel
            ? getBranchLabel(medicine.pharmacyId)
            : medicine.pharmacyId || "—"}
        </td>
      )}
      {splitNameColumns ? (
        <>
          <td
            className="medicineNameCell medicineNameCellAr"
            title={resolveMedicineArabicName(medicine)}
          >
            {resolveMedicineArabicName(medicine) || "—"}
          </td>
          <td
            className="medicineNameCell medicineNameCellEn"
            dir="ltr"
            title={resolveMedicineEnglishName(medicine)}
          >
            {resolveMedicineEnglishName(medicine) || "—"}
          </td>
          <td
            className="medicineNameCell medicineNameCellIngredient"
            dir="ltr"
            title={resolveMedicineActiveIngredient(medicine)}
          >
            {resolveMedicineActiveIngredient(medicine) || "—"}
          </td>
        </>
      ) : (
        <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
      )}
      <td className="medicineColBarcode" title={medicine.barcode}>
        {medicine.barcode}
      </td>
      <td>
        {onViewStockDetail ? (
          <button
            type="button"
            className="stockQtyBtn"
            onClick={() => onViewStockDetail(medicine)}
            title={isArabic ? "عرض تفاصيل حركة الكمية" : "View stock movement details"}
          >
            <span
              className={
                medicine.qty <= resolveLowStockThreshold(medicine)
                  ? "badge danger"
                  : "badge ok"
              }
            >
              {medicine.qty}
            </span>
          </button>
        ) : (
          <span
            className={
              medicine.qty <= resolveLowStockThreshold(medicine)
                ? "badge danger"
                : "badge ok"
            }
          >
            {medicine.qty}
          </span>
        )}
      </td>
      <td>{medicine.expiry}</td>
      {showCostProfitColumns && (
        <td>
          {(medicine.buyPrice || 0).toFixed(2)} {currency}
        </td>
      )}
      <td>
        {(medicine.price || 0).toFixed(2)} {currency}
      </td>
      {showProfitColumn && (
        <td>
          {((medicine.price || 0) - (medicine.buyPrice || 0)).toFixed(2)} {currency}
        </td>
      )}
      <td>
        <div className="actionButtons">
          {canUsePOS && onAddToCart && (
            <button
              type="button"
              className="smallBtn"
              onClick={() => onAddToCart(medicine)}
            >
              {addToCartLabel || t.add}
            </button>
          )}
          {showManagementActions && canManageInventory && (
            <button
              type="button"
              className="editBtn"
              onClick={() => onEditMedicine(medicine)}
            >
              {isArabic ? "تعديل" : "Edit"}
            </button>
          )}
          {showManagementActions && canDeleteMedicine && (
            <button
              type="button"
              className="deleteSmallBtn"
              onClick={() => onDeleteMedicine(medicine)}
            >
              {isArabic ? "حذف" : "Delete"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
