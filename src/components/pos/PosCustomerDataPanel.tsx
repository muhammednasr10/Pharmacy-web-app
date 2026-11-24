type PosCustomerDataPanelProps = {
  isArabic: boolean;
  customerName: string;
  customerPhone: string;
  required: boolean;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
};

export default function PosCustomerDataPanel({
  isArabic,
  customerName,
  customerPhone,
  required,
  onCustomerNameChange,
  onCustomerPhoneChange,
}: PosCustomerDataPanelProps) {
  return (
    <div className="posCustomerDataPanel">
      <label>{isArabic ? "اسم العميل" : "Customer name"}</label>
      <input
        value={customerName}
        onChange={(e) => onCustomerNameChange(e.target.value)}
        placeholder={
          required
            ? isArabic
              ? "مطلوب للدليفري / الآجل"
              : "Required for delivery / credit"
            : isArabic
              ? "اختياري — يظهر على الفاتورة"
              : "Optional — shown on invoice"
        }
      />
      <label>{isArabic ? "رقم الموبايل" : "Phone"}</label>
      <input
        type="tel"
        inputMode="tel"
        value={customerPhone}
        onChange={(e) => onCustomerPhoneChange?.(e.target.value)}
        placeholder={isArabic ? "اختياري" : "Optional"}
      />
    </div>
  );
}
