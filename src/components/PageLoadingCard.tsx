type PageLoadingCardProps = {
  isArabic: boolean;
  label?: string;
};

export default function PageLoadingCard({ isArabic, label }: PageLoadingCardProps) {
  return (
    <div className="pageLoadingCard" role="status" aria-live="polite">
      <div className="pageLoadingSpinner" aria-hidden="true" />
      <strong>{label || (isArabic ? "جاري تحميل الصفحة..." : "Loading page...")}</strong>
      <span>{isArabic ? "يرجى الانتظار" : "Please wait"}</span>
    </div>
  );
}
