import PosCustomerDataPanel from "./PosCustomerDataPanel";

type Props = {
  open: boolean;
  isArabic: boolean;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  required: boolean;
  onClose: () => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  onCustomerAddressChange?: (value: string) => void;
};

export default function PosCustomerDataModal({
  open,
  isArabic,
  customerName,
  customerPhone,
  customerAddress,
  required,
  onClose,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
}: Props) {
  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="invoiceModal userModal posCustomerDataModal"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "بيانات العميل" : "Customer details"}</h2>
            <p className="returnsSectionHint" style={{ margin: "0.25rem 0 0" }}>
              {isArabic ? "بيانات العميل على الفاتورة" : "Customer details on the invoice"}
            </p>
          </div>
          <button type="button" className="deleteSmallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>

        <PosCustomerDataPanel
          isArabic={isArabic}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          required={required}
          onCustomerNameChange={onCustomerNameChange}
          onCustomerPhoneChange={onCustomerPhoneChange}
          onCustomerAddressChange={onCustomerAddressChange}
        />

        <div className="modalActions">
          <button type="button" className="completeBtn" onClick={onClose}>
            {isArabic ? "تم" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
