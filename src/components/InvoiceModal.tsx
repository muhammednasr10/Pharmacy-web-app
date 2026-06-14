import type { Invoice } from "../types";
import ModalOverlay from "./ModalOverlay";

type InvoiceModalProps = {
  selectedInvoice: Invoice;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  getPaymentLabel: (method: string) => string;
  safeNumber: (value: any) => number;
};

export default function InvoiceModal({
  selectedInvoice,
  onClose,
  onPrint,
  isArabic,
  t,
  currency,
  getPaymentLabel,
  safeNumber,
}: InvoiceModalProps) {
  return (
    <ModalOverlay>
      <div className="invoiceModal">
        <div className="modalHeader">
          <div>
            <h2>{t.invoiceDetails}</h2>
            <p>{selectedInvoice.invoiceNumber || `#${selectedInvoice.id}`}</p>
          </div>
          <button className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="invoiceInfo">
          <div>
            <span>{t.date}</span>
            <strong>{selectedInvoice.date || "-"}</strong>
          </div>
          <div>
            <span>{t.paymentMethod}</span>
            <strong>{getPaymentLabel(selectedInvoice.paymentMethod || "cash")}</strong>
          </div>
          <div>
            <span>{t.subtotal}</span>
            <strong>
              {safeNumber(selectedInvoice.subtotal || selectedInvoice.total).toFixed(2)} {currency}
            </strong>
          </div>
          <div>
            <span>{t.discount}</span>
            <strong>
              {safeNumber(selectedInvoice.discount).toFixed(2)} {currency}
            </strong>
          </div>
          <div>
            <span>{t.total}</span>
            <strong>
              {safeNumber(selectedInvoice.total).toFixed(2)} {currency}
            </strong>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{t.item}</th>
                <th>{t.barcode}</th>
                <th>{t.qty}</th>
                <th>{t.unitPrice}</th>
                <th>{t.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(selectedInvoice.items) ? selectedInvoice.items : []).map(
                (item, index) => {
                  const quantity = safeNumber(item.quantity);
                  const unitPrice = safeNumber(item.unitPrice);
                  const lineTotal = safeNumber(item.lineTotal || unitPrice * quantity);

                  return (
                    <tr key={`${item.medicineId || index}-${index}`}>
                      <td>{isArabic ? item.name_ar || "-" : item.name_en || "-"}</td>
                      <td>{item.barcode || "-"}</td>
                      <td>{quantity}</td>
                      <td>
                        {unitPrice.toFixed(2)} {currency}
                      </td>
                      <td>
                        {lineTotal.toFixed(2)} {currency}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
        <div className="modalActions">
          <button className="printFullBtn" onClick={() => onPrint(selectedInvoice)}>
            <span aria-hidden="true">🖨️</span>
            <span>{t.printInvoice}</span>
          </button>
          <button className="completeBtn" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
