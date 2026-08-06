import { useMemo } from "react";
import { ALL_BRANCHES_ID, isAllBranchesMode } from "../constants/branches";

export function resolvePharmacyScopeKey(
  activeBranchId: string | null,
  appUserPharmacyId?: string | null,
): string {
  if (isAllBranchesMode(activeBranchId)) return ALL_BRANCHES_ID;
  return activeBranchId || appUserPharmacyId || "main";
}

export function usePharmacyScopeKey(
  activeBranchId: string | null,
  appUserPharmacyId?: string | null,
): string {
  return useMemo(
    () => resolvePharmacyScopeKey(activeBranchId, appUserPharmacyId),
    [activeBranchId, appUserPharmacyId],
  );
}
