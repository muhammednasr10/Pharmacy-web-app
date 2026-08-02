import { ALL_BRANCHES_ID } from "../constants/branches";
import type { PharmacySettings } from "../types";
import { buildBranchSelectGroups } from "../utils/branchDisplay";

type BranchScopeSelectProps = {
  pharmacies: Pick<PharmacySettings, "id" | "name" | "name_en" | "organizationId">[];
  value: string;
  onChange: (value: string) => void;
  isArabic: boolean;
  includeAllBranches?: boolean;
  allBranchesValue?: string;
  allBranchesLabel?: string;
  includeAllOption?: { value: string; label?: string };
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export default function BranchScopeSelect({
  pharmacies,
  value,
  onChange,
  isArabic,
  includeAllBranches = false,
  allBranchesValue = ALL_BRANCHES_ID,
  allBranchesLabel,
  includeAllOption,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: BranchScopeSelectProps) {
  const groups = buildBranchSelectGroups(pharmacies, isArabic);
  const showOrgGroups = groups.length > 1;

  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {includeAllOption ? (
        <option value={includeAllOption.value}>
          {includeAllOption.label || (isArabic ? "الكل" : "All")}
        </option>
      ) : null}
      {includeAllBranches ? (
        <option value={allBranchesValue}>
          {allBranchesLabel || (isArabic ? "كل الفروع" : "All branches")}
        </option>
      ) : null}

      {showOrgGroups
        ? groups.map((group) => (
            <optgroup key={group.organizationId} label={group.organizationName}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.optionLabel}
                </option>
              ))}
            </optgroup>
          ))
        : groups.flatMap((group) =>
            group.options.map((option) => (
              <option key={option.id} value={option.id}>
                {group.options.length > 1 ? option.combinedLabel : group.organizationName}
              </option>
            )),
          )}
    </select>
  );
}
