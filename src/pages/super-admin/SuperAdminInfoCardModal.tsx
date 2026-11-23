type InfoRow = {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
};

type SuperAdminInfoCardModalProps = {
  isArabic: boolean;
  title: string;
  rows: InfoRow[];
  onClose: () => void;
};

export default function SuperAdminInfoCardModal({
  isArabic,
  title,
  rows,
  onClose,
}: SuperAdminInfoCardModalProps) {
  return (
    <div className="modalOverlay" role="presentation" onClick={onClose}>
      <div
        className="invoiceModal userModal saasInfoCardModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saas-info-card-title"
        onClick={(event) => event.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader">
          <div>
            <h3 id="saas-info-card-title">{title}</h3>
          </div>
          <button type="button" className="editBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <dl className="saasInfoCardList">
          {rows.map((row) => (
            <div key={row.label} className="saasInfoCardRow">
              <dt>{row.label}</dt>
              <dd dir={row.dir}>{row.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
