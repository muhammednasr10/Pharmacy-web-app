import type { SubscriptionTier } from "../config/subscriptionTiers";
import { subscriptionTierOrder } from "../config/subscriptionTiers";
import type { AppUser, PharmacySettings, SubscriptionRequest } from "../types";
import { resolveOrganizationId, resolveSubscriptionTier } from "./branchLimits";
import { isTierUpgradePlan } from "./subscriptionFeatures";

export type SaasAdminStats = {
  totalPharmacies: number;
  activePharmacies: number;
  suspendedPharmacies: number;
  totalOrganizations: number;
  totalBranches: number;
  totalUsers: number;
  activeUsers: number;
  pendingSubscriptionRequests: number;
  pendingLoginAccountRequests: number;
  approvedRevenueTotal: number;
  approvedRevenueLast30Days: number;
  pendingRevenueTotal: number;
  tierCounts: Record<SubscriptionTier, number>;
  activeTierCounts: Record<SubscriptionTier, number>;
  expiringWithin7Days: number;
  expiredSubscriptions: number;
  recentApprovedRequests: SubscriptionRequest[];
};

function emptyTierCounts(): Record<SubscriptionTier, number> {
  return { basic: 0, professional: 0, premium: 0 };
}

function parseSubscriptionEnd(pharmacy: PharmacySettings): Date | null {
  const raw = pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt;
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : `${raw}T23:59:59`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPharmacyExpired(pharmacy: PharmacySettings, now = new Date()) {
  const end = parseSubscriptionEnd(pharmacy);
  if (!end) return false;
  return end.getTime() < now.getTime();
}

function isPharmacyExpiringSoon(pharmacy: PharmacySettings, now = new Date(), days = 7) {
  const end = parseSubscriptionEnd(pharmacy);
  if (!end) return false;
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return end >= now && end <= limit;
}

export function buildSaasAdminStats(params: {
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  subscriptionRequests: SubscriptionRequest[];
  pendingLoginAccountRequests: number;
  isPharmacyActive: (pharmacy: PharmacySettings) => boolean;
}): SaasAdminStats {
  const {
    pharmacies,
    systemUsers,
    subscriptionRequests,
    pendingLoginAccountRequests,
    isPharmacyActive,
  } = params;

  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const activePharmacies = pharmacies.filter(isPharmacyActive).length;
  const suspendedPharmacies = pharmacies.length - activePharmacies;
  const activeUsers = systemUsers.filter((user) => user.isActive !== false).length;

  const organizationIds = new Set(pharmacies.map((pharmacy) => resolveOrganizationId(pharmacy)));
  const tierCounts = emptyTierCounts();
  const activeTierCounts = emptyTierCounts();

  organizationIds.forEach((organizationId) => {
    const orgPharmacies = pharmacies.filter(
      (pharmacy) => resolveOrganizationId(pharmacy) === organizationId,
    );
    const representative = orgPharmacies[0];
    if (!representative) return;

    const tier = resolveSubscriptionTier(representative);
    tierCounts[tier] += 1;

    if (orgPharmacies.some(isPharmacyActive)) {
      activeTierCounts[tier] += 1;
    }
  });

  const approved = subscriptionRequests.filter((request) => request.status === "approved");
  const pending = subscriptionRequests.filter((request) => request.status === "pending");

  const approvedRevenueTotal = approved.reduce(
    (sum, request) => sum + Number(request.amount || 0),
    0,
  );
  const approvedRevenueLast30Days = approved.reduce((sum, request) => {
    const stamp = new Date(request.reviewedAt || request.createdAt || 0);
    if (Number.isNaN(stamp.getTime()) || stamp < monthAgo) return sum;
    return sum + Number(request.amount || 0);
  }, 0);
  const pendingRevenueTotal = pending.reduce(
    (sum, request) => sum + Number(request.amount || 0),
    0,
  );

  const recentApprovedRequests = [...approved]
    .sort((a, b) => {
      const aTime = new Date(a.reviewedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.reviewedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  return {
    totalPharmacies: pharmacies.length,
    activePharmacies,
    suspendedPharmacies,
    totalOrganizations: organizationIds.size,
    totalBranches: pharmacies.length,
    totalUsers: systemUsers.length,
    activeUsers,
    pendingSubscriptionRequests: pending.length,
    pendingLoginAccountRequests,
    approvedRevenueTotal,
    approvedRevenueLast30Days,
    pendingRevenueTotal,
    tierCounts,
    activeTierCounts,
    expiringWithin7Days: pharmacies.filter((pharmacy) => isPharmacyExpiringSoon(pharmacy, now))
      .length,
    expiredSubscriptions: pharmacies.filter((pharmacy) => isPharmacyExpired(pharmacy, now)).length,
    recentApprovedRequests,
  };
}

export function formatSaasMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;
}

export function getRequestTypeSummary(request: SubscriptionRequest, isArabic: boolean) {
  if (isTierUpgradePlan(request.plan)) {
    return isArabic ? "ترقية باقة" : "Package upgrade";
  }
  return isArabic ? "تجديد اشتراك" : "Renewal";
}

export { subscriptionTierOrder };
