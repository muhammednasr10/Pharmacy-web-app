type InventoryPaginationBarProps = {
  isArabic: boolean;
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export default function InventoryPaginationBar({
  isArabic,
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
}: InventoryPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className="invMgmtPagination" aria-busy={loading}>
      <span className="invMgmtPaginationMeta">
        {total === 0
          ? isArabic
            ? "لا توجد نتائج"
            : "No results"
          : isArabic
            ? `${from.toLocaleString()}–${to.toLocaleString()} من ${total.toLocaleString()}`
            : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div className="invMgmtPaginationActions">
        <button
          type="button"
          className="editBtn"
          disabled={loading || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          {isArabic ? "السابق" : "Previous"}
        </button>
        <span className="invMgmtPaginationPage">
          {isArabic ? `صفحة ${safePage} / ${totalPages}` : `Page ${safePage} / ${totalPages}`}
        </span>
        <button
          type="button"
          className="editBtn"
          disabled={loading || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          {isArabic ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}
