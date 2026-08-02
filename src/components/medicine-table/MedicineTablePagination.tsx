import { MEDICINE_TABLE_PAGE_SIZE } from "../../constants/medicineCatalog";

type MedicineTablePaginationProps = {
  isArabic: boolean;
  filteredCount: number;
  safePage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
};

export default function MedicineTablePagination({
  isArabic,
  filteredCount,
  safePage,
  totalPages,
  onPrevious,
  onNext,
}: MedicineTablePaginationProps) {
  if (filteredCount <= MEDICINE_TABLE_PAGE_SIZE) {
    return null;
  }

  return (
    <div className="medicineTablePagination">
      <span className="medicineTablePaginationMeta">
        {isArabic
          ? `${safePage * MEDICINE_TABLE_PAGE_SIZE + 1}–${Math.min(
              (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
              filteredCount,
            )} من ${filteredCount.toLocaleString()}`
          : `${safePage * MEDICINE_TABLE_PAGE_SIZE + 1}–${Math.min(
              (safePage + 1) * MEDICINE_TABLE_PAGE_SIZE,
              filteredCount,
            )} of ${filteredCount.toLocaleString()}`}
      </span>
      <div className="medicineTablePaginationActions">
        <button
          type="button"
          className="editBtn"
          disabled={safePage <= 0}
          onClick={onPrevious}
        >
          {isArabic ? "السابق" : "Previous"}
        </button>
        <span className="medicineTablePaginationPage">
          {isArabic
            ? `صفحة ${safePage + 1} / ${totalPages}`
            : `Page ${safePage + 1} / ${totalPages}`}
        </span>
        <button
          type="button"
          className="editBtn"
          disabled={safePage >= totalPages - 1}
          onClick={onNext}
        >
          {isArabic ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}
