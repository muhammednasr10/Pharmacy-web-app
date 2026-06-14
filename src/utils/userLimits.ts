import { getSubscriptionTier, parseSubscriptionTier } from "../config/subscriptionTiers";
import type { AppUser, PharmacySettings } from "../types";
import { resolveOrganizationId } from "./branchLimits";

export const DEFAULT_MAX_USERS = 5;

export function resolveMaxUsers(pharmacy: PharmacySettings): number {
  const value = Number(pharmacy.maxUsers);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return getSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan).maxUsers;
}

export function countOrganizationUsers(
  users: Array<Pick<AppUser, "pharmacyId" | "isActive" | "role">>,
  pharmacies: PharmacySettings[],
  organizationId: string,
): number {
  const pharmacyIds = new Set(
    pharmacies
      .filter((pharmacy) => resolveOrganizationId(pharmacy) === organizationId)
      .map((pharmacy) => pharmacy.id),
  );

  return users.filter(
    (user) =>
      user.role !== "super_admin" &&
      user.isActive !== false &&
      user.pharmacyId &&
      pharmacyIds.has(user.pharmacyId),
  ).length;
}

export function canAddOrganizationUser(
  users: Array<Pick<AppUser, "pharmacyId" | "isActive" | "role" | "uid">>,
  pharmacies: PharmacySettings[],
  pharmacy: PharmacySettings,
  options?: { excludeUid?: string },
): boolean {
  const organizationId = resolveOrganizationId(pharmacy);
  const max = resolveMaxUsers(pharmacy);
  const used = countOrganizationUsers(
    users.filter((user) => user.uid !== options?.excludeUid),
    pharmacies,
    organizationId,
  );
  return used < Math.max(1, max);
}

export function getOrganizationUserUsage(
  users: Array<Pick<AppUser, "pharmacyId" | "isActive" | "role" | "uid">>,
  pharmacies: PharmacySettings[],
  pharmacy: PharmacySettings,
) {
  const organizationId = resolveOrganizationId(pharmacy);
  const used = countOrganizationUsers(users, pharmacies, organizationId);
  const max = resolveMaxUsers(pharmacy);
  return { organizationId, used, max, canAdd: used < max };
}

export function resolveSubscriptionTier(pharmacy: PharmacySettings) {
  return parseSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan);
}
