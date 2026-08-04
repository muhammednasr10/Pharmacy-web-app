import { supabase } from "../supabaseClient";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
} from "../../config/subscriptionTiers";
import type { PharmacySettings } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { canTrustOfflinePharmacyAccess, isBrowserOffline } from "../../utils/offlineAuth";
import {
  createManagedRealtimeChannel,
  disposeManagedRealtimeChannel,
} from "./dbHelpers";

const BLOCKED_PHARMACY_STATUSES = new Set(["suspended", "cancelled", "inactive"]);

export async function getCurrentPharmacy(pharmacyId: string): Promise<PharmacySettings | null> {
  return getPharmacySettings(pharmacyId);
}

/** Login access — expired subscription still allowed (read-only mode in the app). */
export async function isPharmacyAccessAllowed(pharmacyId: string): Promise<boolean> {
  if (isBrowserOffline()) {
    return canTrustOfflinePharmacyAccess(pharmacyId);
  }

  const pharmacy = await getPharmacySettings(pharmacyId);
  if (!pharmacy) return false;
  if (pharmacy.isActive === false) return false;
  const status = (pharmacy.subscriptionStatus || "active").toLowerCase();
  if (BLOCKED_PHARMACY_STATUSES.has(status)) return false;
  return true;
}

export async function getPharmacySettings(pharmacyId: string): Promise<PharmacySettings | null> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error) {
    console.error("getPharmacySettings error:", error.message);
    return null;
  }

  return data ? toCamelCase<PharmacySettings>(data) : null;
}

export async function updatePharmacySettings(
  pharmacyId: string,
  updates: Partial<PharmacySettings>,
) {
  const payload = toSnakeCase(updates);
  delete payload.id;

  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);

  if (error) {
    throw new Error(error.message);
  }
}

async function attachOrganizationBranchLimits(
  pharmacies: PharmacySettings[],
): Promise<PharmacySettings[]> {
  const organizationIds = [
    ...new Set(pharmacies.map((pharmacy) => pharmacy.organizationId).filter(Boolean)),
  ] as string[];

  if (organizationIds.length === 0) {
    return pharmacies.map((pharmacy) => ({
      ...pharmacy,
      maxBranches: pharmacy.maxBranches ?? 1,
      maxUsers: pharmacy.maxUsers ?? getSubscriptionTier(pharmacy.subscriptionTier).maxUsers,
    }));
  }

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, max_branches, max_users")
    .in("id", organizationIds);

  if (error) {
    console.error("attachOrganizationBranchLimits error:", error.message);
    return pharmacies;
  }

  const maxBranchesByOrg = new Map<string, number>();
  const maxUsersByOrg = new Map<string, number>();
  for (const row of organizations || []) {
    const orgId = String(row.id);
    maxBranchesByOrg.set(orgId, Number(row.max_branches) || 1);
    maxUsersByOrg.set(orgId, Number(row.max_users) || 0);
  }

  return pharmacies.map((pharmacy) => {
    const tierConfig = getSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan);
    const fromPharmacyBranches = Number(pharmacy.maxBranches);
    const fromOrgBranches = pharmacy.organizationId
      ? maxBranchesByOrg.get(pharmacy.organizationId)
      : undefined;
    const resolvedBranches =
      Number.isFinite(fromPharmacyBranches) && fromPharmacyBranches > 0
        ? fromPharmacyBranches
        : (fromOrgBranches ?? tierConfig.maxBranches);

    const fromPharmacyUsers = Number(pharmacy.maxUsers);
    const fromOrgUsers = pharmacy.organizationId ? maxUsersByOrg.get(pharmacy.organizationId) : undefined;
    const resolvedUsers =
      Number.isFinite(fromPharmacyUsers) && fromPharmacyUsers > 0
        ? fromPharmacyUsers
        : (fromOrgUsers && fromOrgUsers > 0 ? fromOrgUsers : tierConfig.maxUsers);

    const subscriptionTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    );
    return {
      ...pharmacy,
      subscriptionTier,
      maxBranches: resolvedBranches,
      maxUsers: resolvedUsers,
    };
  });
}

export async function getPharmacies(): Promise<PharmacySettings[]> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("getPharmacies error:", error.message);
    return [];
  }

  const pharmacies = (data || []).map((row) => toCamelCase<PharmacySettings>(row));
  return attachOrganizationBranchLimits(pharmacies);
}

export function subscribePharmacies(callback: (rows: PharmacySettings[]) => void) {
  const channelName = "realtime-pharmacies-all";
  const channel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "pharmacies" },
    () => {
      void getPharmacies().then(callback);
    },
  );

  void channel.subscribe();

  return () => {
    disposeManagedRealtimeChannel(channel);
  };
}
