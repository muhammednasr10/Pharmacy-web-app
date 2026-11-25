type Props = {
  isArabic: boolean;
  hasData: boolean;
  open: boolean;
  onOpen: () => void;
};

export default function PosCustomerDataOpenButton({ isArabic, hasData, open, onOpen }: Props) {
  return (
    <button
      type="button"
      className={`posCustomerDataBtn${hasData ? " has-data" : ""}${open ? " is-open" : ""}`}
      aria-label={isArabic ? "بيانات العميل" : "Customer details"}
      title={isArabic ? "بيانات العميل على الفاتورة" : "Invoice customer details"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
    >
      <span aria-hidden="true">👤</span>
      {hasData ? <span className="posCustomerDataDot" aria-hidden="true" /> : null}
    </button>
  );
}
