import type { PharmacySettings } from "../types";

export function getBranchLabel(
  branchId: string | undefined | null,
  branches: Pick<PharmacySettings, "id" | "name" | "name_en">[],
  isArabic: boolean,
): string {
  if (!branchId) return "—";
  const branch = branches.find((item) => item.id === branchId);
  if (!branch) return branchId;
  return (isArabic ? branch.name : branch.name_en) || branch.name || branchId;
}
