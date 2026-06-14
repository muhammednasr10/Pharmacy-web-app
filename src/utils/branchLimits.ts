import { getSubscriptionTier, parseSubscriptionTier } from "../config/subscriptionTiers";
import type { PharmacySettings } from "../types";

export const DEFAULT_MAX_BRANCHES = 1;

export function resolveOrganizationId(pharmacy: PharmacySettings): string {
  return pharmacy.organizationId || `org-${pharmacy.id}`;
}

export function resolveMaxBranches(pharmacy: PharmacySettings): number {
  const value = Number(pharmacy.maxBranches);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return getSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan).maxBranches;
}

export function resolveSubscriptionTier(pharmacy: PharmacySettings) {
  return parseSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan);
}

export function countOrganizationBranches(
  pharmacies: PharmacySettings[],
  organizationId: string,
): number {
  return pharmacies.filter((pharmacy) => resolveOrganizationId(pharmacy) === organizationId).length;
}

export function canAddOrganizationBranch(
  pharmacies: PharmacySettings[],
  organizationId: string,
  maxBranches: number,
): boolean {
  return countOrganizationBranches(pharmacies, organizationId) < Math.max(1, maxBranches);
}

export function getOrganizationBranchUsage(
  pharmacies: PharmacySettings[],
  pharmacy: PharmacySettings,
) {
  const organizationId = resolveOrganizationId(pharmacy);
  const used = countOrganizationBranches(pharmacies, organizationId);
  const max = resolveMaxBranches(pharmacy);
  return { organizationId, used, max, canAdd: used < max };
}

export type SaasOrganizationGroup = {
  organizationId: string;
  primary: PharmacySettings;
  branches: PharmacySettings[];
  childBranches: PharmacySettings[];
};

export function resolveOrganizationPrimaryPharmacy(
  branches: PharmacySettings[],
  organizationId: string,
): PharmacySettings {
  if (organizationId.startsWith("org-")) {
    const slug = organizationId.slice(4);
    const match = branches.find((pharmacy) => pharmacy.id === slug);
    if (match) return match;
  }
  return [...branches].sort((a, b) => a.id.localeCompare(b.id))[0];
}

export function groupPharmaciesByOrganization(
  pharmacies: PharmacySettings[],
): SaasOrganizationGroup[] {
  const byOrg = new Map<string, PharmacySettings[]>();
  for (const pharmacy of pharmacies) {
    const organizationId = resolveOrganizationId(pharmacy);
    const list = byOrg.get(organizationId) ?? [];
    list.push(pharmacy);
    byOrg.set(organizationId, list);
  }

  const groups: SaasOrganizationGroup[] = [];
  for (const [organizationId, branches] of byOrg) {
    const primary = resolveOrganizationPrimaryPharmacy(branches, organizationId);
    const childBranches = branches
      .filter((pharmacy) => pharmacy.id !== primary.id)
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    groups.push({
      organizationId,
      primary,
      branches: [primary, ...childBranches],
      childBranches,
    });
  }

  return groups.sort((a, b) => {
    const nameA = a.primary.name || a.primary.name_en || a.primary.id;
    const nameB = b.primary.name || b.primary.name_en || b.primary.id;
    return nameA.localeCompare(nameB);
  });
}
