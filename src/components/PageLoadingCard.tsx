type PageLoadingCardProps = {
  isArabic: boolean;
  label?: string;
  /** Thin inline indicator while AppShell stays visible (route Suspense). */
  compact?: boolean;
};

export default function PageLoadingCard({ isArabic, label, compact = false }: PageLoadingCardProps) {
  if (compact) {
    return (
      <div className="pageLoadingCompact" role="status" aria-live="polite">
        <div className="pageLoadingCompactBar" aria-hidden="true" />
        <span>
          {label || (isArabic ? "جاري تحميل الصفحة..." : "Loading page...")}
        </span>
      </div>
    );
  }

  return (
    <div className="pageLoadingCard" role="status" aria-live="polite">
      <div className="pageLoadingSpinner" aria-hidden="true" />
      <strong>{label || (isArabic ? "جاري تحميل الصفحة..." : "Loading page...")}</strong>
      <span>{isArabic ? "يرجى الانتظار" : "Please wait"}</span>
    </div>
  );
}
