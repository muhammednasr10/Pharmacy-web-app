import type { ReturnRecord } from "../types";

type ReturnModalProps = {
  selectedReturn: ReturnRecord;
  onClose: () => void;
  onViewOriginalInvoice?: (invoiceNumber: string) => void;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  safeNumber: (value: unknown) => number;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  onDelete?: (record: ReturnRecord) => void;
  canDelete?: boolean;
  isDeleting?: boolean;
};

export default function ReturnModal({
  selectedReturn,
  onClose,
  onViewOriginalInvoice,
  isArabic,
  t,
  currency,
  safeNumber,
  getReturnTypeLabel,
  getRefundMethodLabel,
  onDelete,
  canDelete = false,
  isDeleting = false,
}: ReturnModalProps) {
  const items = Array.isArray(selectedReturn.items) ? selectedReturn.items : [];
  const totalQty = items.reduce((sum, item) => sum + safeNumber(item.quantity), 0);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="invoiceModal returnDetailModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <span className="returnDocBadge">{isArabic ? "مرتجع" : "RETURN"}</span>
            <h2>{isArabic ? "تفاصيل المرتجع" : "Return Details"}</h2>
            <p className="returnDocNumber">{selectedReturn.returnNumber}</p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="returnDetailNotice">
          {isArabic
            ? "هذا سجل مرتجع — تم إرجاع الأصناف للمخزون واسترداد المبلغ حسب طريقة الاسترداد أدناه."
            : "This is a return record — items were restored to stock and refunded per the method below."}
        </div>

        <div className="invoiceInfo returnDetailInfo">
          <div>
            <span>{isArabic ? "نوع المرتجع" : "Return Type"}</span>
            <strong>{getReturnTypeLabel(selectedReturn)}</strong>
          </div>
          <div>
            <span>{t.date}</span>
            <strong>{selectedReturn.date || "-"}</strong>
          </div>
          <div>
            <span>{isArabic ? "الموظف" : "Employee"}</span>
            <strong>{selectedReturn.userName || "-"}</strong>
          </div>
          <div>
            <span>{isArabic ? "الفاتورة الأصلية" : "Original Invoice"}</span>
            <strong className="returnLinkedInvoice">
              {onViewOriginalInvoice ? (
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => onViewOriginalInvoice(selectedReturn.invoiceNumber)}
                >
                  {selectedReturn.invoiceNumber}
                </button>
              ) : (
                selectedReturn.invoiceNumber || "-"
              )}
            </strong>
          </div>
          <div>
            <span>{isArabic ? "طريقة الاسترداد" : "Refund Method"}</span>
            <strong>{getRefundMethodLabel(selectedReturn)}</strong>
          </div>
          <div>
            <span>{isArabic ? "المبلغ المسترد" : "Refunded Amount"}</span>
            <strong className="returnRefundAmount">
              {safeNumber(selectedReturn.total).toFixed(2)} {currency}
            </strong>
          </div>
        </div>

        {selectedReturn.reason ? (
          <div className="returnReasonBox">
            <span>{isArabic ? "سبب المرتجع" : "Return Reason"}</span>
            <p>{selectedReturn.reason}</p>
          </div>
        ) : null}

        <div className="returnItemsSummary">
          {isArabic
            ? `${items.length} صنف — إجمالي ${totalQty} وحدة مرجعة`
            : `${items.length} item(s) — ${totalQty} unit(s) returned`}
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{t.item}</th>
                <th>{t.barcode}</th>
                <th>{isArabic ? "الكمية المرجعة" : "Returned Qty"}</th>
                <th>{t.unitPrice}</th>
                <th>{t.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const quantity = safeNumber(item.quantity);
                const unitPrice = safeNumber(item.unitPrice);
                const lineTotal = safeNumber(item.lineTotal || unitPrice * quantity);

                return (
                  <tr key={`${item.medicineId || index}-${index}`}>
                    <td>{isArabic ? item.name_ar || "-" : item.name_en || "-"}</td>
                    <td>{item.barcode || "-"}</td>
                    <td>
                      <span className="badge warn">{quantity}</span>
                    </td>
                    <td>
                      {unitPrice.toFixed(2)} {currency}
                    </td>
                    <td className="returnRefundAmount">
                      {lineTotal.toFixed(2)} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="modalActions">
          {canDelete && onDelete && (
            <button
              type="button"
              className="dangerBtn"
              disabled={isDeleting}
              onClick={() => onDelete(selectedReturn)}
            >
              {isDeleting ? (isArabic ? "جاري الحذف..." : "Deleting...") : t.delete}
            </button>
          )}
          <button type="button" className="completeBtn" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
