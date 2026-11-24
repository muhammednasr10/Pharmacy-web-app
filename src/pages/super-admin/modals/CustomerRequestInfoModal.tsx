type InfoField = {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
};

type Props = {
  isArabic: boolean;
  title: string;
  fields: InfoField[];
  onClose: () => void;
};

export default function CustomerRequestInfoModal({ isArabic, title, fields, onClose }: Props) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="invoiceModal saasModal customerRequestInfoModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="saasInfoGrid customerRequestInfoGrid">
          {fields.map((field) => (
            <div key={field.label}>
              <span>{field.label}</span>
              <strong dir={field.dir}>{field.value || "—"}</strong>
            </div>
          ))}
        </div>

        <div className="modalActions saasModalActions">
          <button type="button" className="smallBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
