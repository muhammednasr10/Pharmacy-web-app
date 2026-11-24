import type { PurchaseRequestItem } from "../../utils/purchaseRequests";

type InventoryPurchaseRequestsTableProps = {
  isArabic: boolean;
  rows: PurchaseRequestItem[];
  busyId: string | null;
  onQtyChange: (item: PurchaseRequestItem, value: string) => void;
  onMarkOrdered: (item: PurchaseRequestItem) => void;
  onRemove: (item: PurchaseRequestItem) => void;
};

export default function InventoryPurchaseRequestsTable({
  isArabic,
  rows,
  busyId,
  onQtyChange,
  onMarkOrdered,
  onRemove,
}: InventoryPurchaseRequestsTableProps) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>{isArabic ? "الدواء" : "Medicine"}</th>
            <th>{isArabic ? "الباركود" : "Barcode"}</th>
            <th>{isArabic ? "الكمية الحالية" : "Current qty"}</th>
            <th>{isArabic ? "كمية التوريد" : "Order qty"}</th>
            <th>{isArabic ? "مرات الطلب" : "Times asked"}</th>
            <th>{isArabic ? "بواسطة" : "By"}</th>
            <th>{isArabic ? "الإجراءات" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{isArabic ? item.name_ar : item.name_en || item.name_ar}</strong>
              </td>
              <td>{item.barcode || "—"}</td>
              <td>
                <span className={item.currentQty <= 0 ? "badge danger" : "badge warn"}>
                  {item.currentQty}
                </span>
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  className="invMgmtInlineQty"
                  value={item.requestedQty}
                  disabled={busyId === item.id}
                  onChange={(event) => onQtyChange(item, event.target.value)}
                />
              </td>
              <td>{item.requestCount}</td>
              <td>{item.createdByName || "—"}</td>
              <td>
                <div className="actionButtons">
                  <button
                    type="button"
                    className="editBtn"
                    disabled={busyId === item.id}
                    onClick={() => onMarkOrdered(item)}
                  >
                    {isArabic ? "تم التوريد" : "Mark ordered"}
                  </button>
                  <button
                    type="button"
                    className="deleteSmallBtn"
                    disabled={busyId === item.id}
                    onClick={() => onRemove(item)}
                  >
                    {isArabic ? "حذف" : "Remove"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
