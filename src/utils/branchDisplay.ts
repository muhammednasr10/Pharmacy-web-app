import type { PharmacySettings } from "../types";
import {
  groupPharmaciesByOrganization,
  resolveOrganizationId,
  resolveOrganizationPrimaryPharmacy,
} from "./branchLimits";

export type BranchDisplayInfo = {
  organizationName: string;
  branchName: string;
  branchSiteName: string;
  optionLabel: string;
  combinedLabel: string;
  isMainSite: boolean;
};

type BranchRow = Pick<PharmacySettings, "id" | "name" | "name_en" | "organizationId">;

function readPharmacyName(pharmacy: BranchRow, isArabic: boolean): string {
  return (isArabic ? pharmacy.name : pharmacy.name_en) || pharmacy.name || pharmacy.id;
}

export function resolveBranchDisplay(
  branchId: string | null | undefined,
  pharmacies: BranchRow[],
  isArabic: boolean,
): BranchDisplayInfo {
  const fallback = {
    organizationName: "—",
    branchName: "—",
    branchSiteName: "—",
    optionLabel: "—",
    combinedLabel: "—",
    isMainSite: false,
  };

  if (!branchId) return fallback;

  const branch = pharmacies.find((item) => item.id === branchId);
  if (!branch) {
    return {
      organizationName: branchId,
      branchName: branchId,
      branchSiteName: branchId,
      optionLabel: branchId,
      combinedLabel: branchId,
      isMainSite: false,
    };
  }

  const organizationId = resolveOrganizationId(branch as PharmacySettings);
  const orgBranches = pharmacies.filter(
    (item) => resolveOrganizationId(item as PharmacySettings) === organizationId,
  );
  const primary = resolveOrganizationPrimaryPharmacy(
    orgBranches as PharmacySettings[],
    organizationId,
  );
  const organizationName = readPharmacyName(primary, isArabic);
  const isMainSite = branch.id === primary.id;
  const branchSiteName = readPharmacyName(branch, isArabic);
  const mainSiteLabel = isArabic ? "المقر الرئيسي" : "Main site";
  const branchName = isMainSite ? mainSiteLabel : branchSiteName;
  const optionLabel = branchName;

  const combinedLabel = isMainSite
    ? `${organizationName} — ${mainSiteLabel}`
    : `${organizationName} — ${branchSiteName}`;

  return {
    organizationName,
    branchName,
    branchSiteName,
    optionLabel,
    combinedLabel,
    isMainSite,
  };
}

export type BranchSelectGroup = {
  organizationId: string;
  organizationName: string;
  options: Array<{
    id: string;
    optionLabel: string;
    combinedLabel: string;
    isMainSite: boolean;
  }>;
};

export function buildBranchSelectGroups(
  pharmacies: BranchRow[],
  isArabic: boolean,
): BranchSelectGroup[] {
  if (pharmacies.length === 0) return [];

  const groups = groupPharmaciesByOrganization(pharmacies as PharmacySettings[]);
  return groups.map((group) => {
    const organizationName = readPharmacyName(group.primary, isArabic);
    const orderedBranches = [group.primary, ...group.childBranches];
    return {
      organizationId: group.organizationId,
      organizationName,
      options: orderedBranches.map((branch) => {
        const display = resolveBranchDisplay(branch.id, pharmacies, isArabic);
        return {
          id: branch.id,
          optionLabel: display.optionLabel,
          combinedLabel: display.combinedLabel,
          isMainSite: display.isMainSite,
        };
      }),
    };
  });
}

export function getOrgBranchLabel(
  branchId: string | null | undefined,
  pharmacies: BranchRow[],
  isArabic: boolean,
): string {
  if (!branchId) return "—";
  if (pharmacies.length <= 1) {
    const single = pharmacies[0];
    return single ? readPharmacyName(single, isArabic) : branchId;
  }

  const orgIds = new Set(
    pharmacies.map((pharmacy) => resolveOrganizationId(pharmacy as PharmacySettings)),
  );
  if (orgIds.size <= 1) {
    return resolveBranchDisplay(branchId, pharmacies, isArabic).branchName;
  }

  return resolveBranchDisplay(branchId, pharmacies, isArabic).combinedLabel;
}
