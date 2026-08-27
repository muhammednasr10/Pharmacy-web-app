import type { PharmacySettings } from "../types";
import type { PosSearchScope } from "./PosManualSalePanel";

type PosWarehouseScopeBarProps = {
  isArabic: boolean;
  pharmacyId: string;
  branches: PharmacySettings[];
  searchScope: PosSearchScope;
  getBranchLabel?: (branchId: string | undefined) => string;
  onChange: (scope: PosSearchScope) => void;
};

export default function PosWarehouseScopeBar({
  isArabic,
  pharmacyId,
  branches,
  searchScope,
  getBranchLabel,
  onChange,
}: PosWarehouseScopeBarProps) {
  const branchOptions = branches.filter((branch) => Boolean(branch.id));
  if (branchOptions.length <= 1) return null;

  // If scope still holds the current pharmacy id after a warehouse switch, treat as "current".
  const effectiveScope: PosSearchScope =
    searchScope === pharmacyId ? "current" : searchScope;

  return (
    <div className="posWarehouseScopeBar">
      <span className="posWarehouseScopeLabel">
        {isArabic ? "مصدر البحث:" : "Search in:"}
      </span>
      <div className="posSearchScopeBar" role="group" aria-label={isArabic ? "نطاق البحث" : "Search scope"}>
        <button
          type="button"
          className={`posSearchScopeChip${effectiveScope === "current" ? " is-active" : ""}`}
          onClick={() => onChange("current")}
        >
          {isArabic ? "المخزن الحالي" : "Current warehouse"}
        </button>
        <button
          type="button"
          className={`posSearchScopeChip${effectiveScope === "all" ? " is-active" : ""}`}
          onClick={() => onChange("all")}
        >
          {isArabic ? "كل الفروع" : "All branches"}
        </button>
        {branchOptions
          .filter((branch) => branch.id !== pharmacyId)
          .map((branch) => (
            <button
              key={branch.id}
              type="button"
              className={`posSearchScopeChip${effectiveScope === branch.id ? " is-active" : ""}`}
              onClick={() => onChange(branch.id)}
            >
              {branch.name || getBranchLabel?.(branch.id) || branch.id}
            </button>
          ))}
      </div>
    </div>
  );
}
