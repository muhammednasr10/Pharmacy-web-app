import type { Medicine } from "../types";

type MedicineTableProps = {
  filteredMedicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  showManagementActions: boolean;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onAddToCart: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
};

export default function MedicineTable({
  filteredMedicines,
  t,
  isArabic,
  currency,
  showManagementActions,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  onAddToCart,
  onEditMedicine,
  onDeleteMedicine,
}: MedicineTableProps) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>{t.medicine}</th>
            <th>{t.barcode}</th>
            <th>{t.qty}</th>
            <th>{t.expiry}</th>
            <th>{isArabic ? "سعر الشراء" : "Buy Price"}</th>
            <th>{isArabic ? "سعر البيع" : "Sell Price"}</th>
            <th>{isArabic ? "الربح" : "Profit"}</th>
            <th>{t.action}</th>
          </tr>
        </thead>
        <tbody>
          {filteredMedicines.map((medicine) => (
            <tr key={medicine.id}>
              <td>{isArabic ? medicine.name_ar : medicine.name_en}</td>
              <td>{medicine.barcode}</td>
              <td>
                <span className={medicine.qty <= 20 ? "badge danger" : "badge ok"}>
                  {medicine.qty}
                </span>
              </td>
              <td>{medicine.expiry}</td>
              <td>
                {(medicine.buyPrice || 0).toFixed(2)} {currency}
              </td>
              <td>
                {(medicine.price || 0).toFixed(2)} {currency}
              </td>
              <td>
                {((medicine.price || 0) - (medicine.buyPrice || 0)).toFixed(2)} {currency}
              </td>
              <td>
                <div className="actionButtons">
                  {canUsePOS && (
                    <button className="smallBtn" onClick={() => onAddToCart(medicine)}>
                      {t.add}
                    </button>
                  )}
                  {showManagementActions && canManageInventory && (
                    <button className="editBtn" onClick={() => onEditMedicine(medicine)}>
                      {isArabic ? "تعديل" : "Edit"}
                    </button>
                  )}
                  {showManagementActions && canDeleteMedicine && (
                    <button className="deleteSmallBtn" onClick={() => onDeleteMedicine(medicine)}>
                      {isArabic ? "حذف" : "Delete"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
