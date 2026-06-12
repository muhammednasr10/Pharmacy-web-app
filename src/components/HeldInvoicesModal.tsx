import type { HeldInvoice } from "../types";

type HeldInvoicesModalProps = {
  heldInvoices: HeldInvoice[];
  isArabic: boolean;
  currency: string;
  isProcessing: boolean;
  onClose: () => void;
  onResume: (held: HeldInvoice) => void;
  onDelete: (held: HeldInvoice) => void;
};

function formatHeldTime(value?: string, isArabic?: boolean) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-US");
  } catch {
    return value;
  }
}

export default function HeldInvoicesModal({
  heldInvoices,
  isArabic,
  currency,
  isProcessing,
  onClose,
  onResume,
  onDelete,
}: HeldInvoicesModalProps) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="invoiceModal posModalWide" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "الفواتير المعلقة" : "Held Invoices"}</h2>
            <p>
              {isArabic
                ? `${heldInvoices.length} فاتورة معلقة`
                : `${heldInvoices.length} held invoice(s)`}
            </p>
          </div>
          <button className="closeBtn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {heldInvoices.length === 0 ? (
          <p className="empty">{isArabic ? "لا توجد فواتير معلقة حالياً" : "No held invoices"}</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{isArabic ? "رقم مؤقت" : "Hold #"}</th>
                  <th>{isArabic ? "العميل" : "Customer"}</th>
                  <th>{isArabic ? "الأصناف" : "Items"}</th>
                  <th>{isArabic ? "الإجمالي" : "Total"}</th>
                  <th>{isArabic ? "وقت التعليق" : "Held At"}</th>
                  <th>{isArabic ? "المستخدم" : "User"}</th>
                  <th>{isArabic ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {heldInvoices.map((held) => (
                  <tr key={held.id}>
                    <td>{held.holdNumber}</td>
                    <td>{held.customerName?.trim() || "-"}</td>
                    <td>{held.cartItems?.length || 0}</td>
                    <td>
                      {(held.total || 0).toFixed(2)} {currency}
                    </td>
                    <td>{formatHeldTime(held.createdAt, isArabic)}</td>
                    <td>{held.createdByName || "-"}</td>
                    <td>
                      <div className="heldInvoiceActions">
                        <button
                          className="editBtn"
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onResume(held)}
                        >
                          {isArabic ? "استرجاع" : "Resume"}
                        </button>
                        <button
                          className="deleteSmallBtn"
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onDelete(held)}
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
