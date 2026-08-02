import type { PharmacySettings } from "../types";
import { getOrgBranchLabel } from "./branchDisplay";

export function getBranchLabel(
  branchId: string | undefined | null,
  branches: Pick<PharmacySettings, "id" | "name" | "name_en" | "organizationId">[],
  isArabic: boolean,
): string {
  return getOrgBranchLabel(branchId, branches, isArabic);
}

export { getOrgBranchLabel, resolveBranchDisplay, buildBranchSelectGroups } from "./branchDisplay";
export type { BranchDisplayInfo, BranchSelectGroup } from "./branchDisplay";
