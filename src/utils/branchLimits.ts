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
