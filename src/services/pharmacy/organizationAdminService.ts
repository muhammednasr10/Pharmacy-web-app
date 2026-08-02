import { supabase } from "../supabaseClient";
import { isSuperAdmin } from "../../utils/roles";
import { isTrialSubscriptionStatus } from "../../config/subscription";
import { formatDateInput } from "../../utils/date";
import {
  getSubscriptionTier,
  type SubscriptionTier,
} from "../../config/subscriptionTiers";
import type { AppUser } from "../../types";
import { getCurrentAppUser } from "./scope";
import { getPharmacies } from "./pharmacySettingsService";

export async function updateOrganizationMaxBranches(
  organizationId: string,
  maxBranches: number,
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const normalized = Math.max(1, Math.floor(Number(maxBranches)));
  const { error: rpcError } = await supabase.rpc("set_organization_max_branches", {
    target_organization_id: organizationId,
    new_max_branches: normalized,
  });

  if (!rpcError) {
    return;
  }

  const rpcMessage = rpcError.message || "";
  const rpcMissing =
    rpcMessage.includes("set_organization_max_branches") &&
    (rpcMessage.includes("does not exist") || rpcMessage.includes("Could not find"));

  if (!rpcMissing && !rpcMessage.includes("forbidden")) {
    throw new Error(rpcMessage);
  }

  const { data: updatedPharmacies, error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({ max_branches: normalized })
    .eq("organization_id", organizationId)
    .select("id");

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("max_branches") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  if (!updatedPharmacies || updatedPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  await supabase
    .from("organizations")
    .update({ max_branches: normalized })
    .eq("id", organizationId);
}

export async function updateOrganizationMaxUsers(
  organizationId: string,
  maxUsers: number,
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const normalized = Math.max(1, Math.floor(Number(maxUsers)));
  const { error: rpcError } = await supabase.rpc("set_organization_max_users", {
    target_organization_id: organizationId,
    new_max_users: normalized,
  });

  if (!rpcError) {
    return;
  }

  const rpcMessage = rpcError.message || "";
  const rpcMissing =
    rpcMessage.includes("set_organization_max_users") &&
    (rpcMessage.includes("does not exist") || rpcMessage.includes("Could not find"));

  if (!rpcMissing && !rpcMessage.includes("forbidden")) {
    throw new Error(rpcMessage);
  }

  const { data: updatedPharmacies, error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({ max_users: normalized })
    .eq("organization_id", organizationId)
    .select("id");

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("max_users") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  if (!updatedPharmacies || updatedPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  await supabase.from("organizations").update({ max_users: normalized }).eq("id", organizationId);
}

export async function assertOrganizationUserCapacity(
  pharmacyId: string,
  excludeUid?: string,
): Promise<void> {
  const { error } = await supabase.rpc("assert_organization_user_capacity", {
    p_pharmacy_id: pharmacyId,
    p_uid: excludeUid || null,
  });

  if (!error) {
    return;
  }

  if (error.message.includes("user_limit_reached")) {
    throw new Error("user_limit_reached");
  }

  if (
    error.message.includes("assert_organization_user_capacity") &&
    (error.message.includes("does not exist") || error.message.includes("Could not find"))
  ) {
    const pharmacies = await getPharmacies();
    const pharmacy = pharmacies.find((item) => item.id === pharmacyId);
    if (!pharmacy) {
      throw new Error("organization_not_found");
    }
    const organizationId = pharmacy.organizationId || `org-${pharmacyId}`;
    const orgPharmacyIds = pharmacies
      .filter((item) => (item.organizationId || `org-${item.id}`) === organizationId)
      .map((item) => item.id);
    let countQuery = supabase
      .from("users")
      .select("uid", { count: "exact", head: true })
      .in("pharmacy_id", orgPharmacyIds)
      .eq("is_active", true)
      .neq("role", "super_admin");
    if (excludeUid) {
      countQuery = countQuery.neq("uid", excludeUid);
    }
    const { count, error: countError } = await countQuery;
    if (countError) {
      throw new Error(countError.message);
    }
    const maxUsers =
      Number(pharmacy.maxUsers) > 0
        ? Number(pharmacy.maxUsers)
        : getSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan).maxUsers;
    if ((count || 0) >= maxUsers) {
      throw new Error("user_limit_reached");
    }
    return;
  }

  throw new Error(error.message);
}

export async function updateOrganizationSubscriptionTier(
  organizationId: string,
  tier: SubscriptionTier,
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const tierConfig = getSubscriptionTier(tier);
  const maxBranches = tierConfig.maxBranches;
  const maxUsers = tierConfig.maxUsers;

  const { data: orgPharmacies, error: fetchError } = await supabase
    .from("pharmacies")
    .select("id")
    .eq("organization_id", organizationId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!orgPharmacies || orgPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  if (orgPharmacies.length > maxBranches) {
    throw new Error("below_current_branches");
  }

  const pharmacyIds = orgPharmacies.map((row) => String(row.id));
  const { count: activeUserCount, error: userCountError } = await supabase
    .from("users")
    .select("uid", { count: "exact", head: true })
    .in("pharmacy_id", pharmacyIds)
    .eq("is_active", true)
    .neq("role", "super_admin");

  if (userCountError) {
    throw new Error(userCountError.message);
  }

  if ((activeUserCount || 0) > maxUsers) {
    throw new Error("below_current_users");
  }

  const { error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
      max_users: maxUsers,
    })
    .eq("organization_id", organizationId);

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("subscription_tier") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  await supabase
    .from("organizations")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
      max_users: maxUsers,
    })
    .eq("id", organizationId);
}

export async function syncSubscriptionTierLimitsToOrganizations(
  tier: SubscriptionTier,
  limits: { maxBranches: number; maxUsers: number },
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<{ updatedOrganizations: number }> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const maxBranches = Math.max(1, Math.floor(limits.maxBranches));
  const maxUsers = Math.max(1, Math.floor(limits.maxUsers));

  const { data: tierPharmacies, error: fetchError } = await supabase
    .from("pharmacies")
    .select("id, organization_id")
    .eq("subscription_tier", tier);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!tierPharmacies?.length) {
    return { updatedOrganizations: 0 };
  }

  const orgBranchCounts = new Map<string, number>();
  for (const row of tierPharmacies) {
    const organizationId = row.organization_id ? String(row.organization_id) : `org-${String(row.id)}`;
    orgBranchCounts.set(organizationId, (orgBranchCounts.get(organizationId) || 0) + 1);
  }

  for (const [organizationId, usedBranches] of orgBranchCounts) {
    if (usedBranches > maxBranches) {
      throw new Error(`tier_sync_below_current_branches:${organizationId}:${usedBranches}`);
    }

    const pharmacyIds = tierPharmacies
      .filter((row) => {
        const rowOrgId = row.organization_id ? String(row.organization_id) : `org-${String(row.id)}`;
        return rowOrgId === organizationId;
      })
      .map((row) => String(row.id));

    const { count: activeUserCount, error: userCountError } = await supabase
      .from("users")
      .select("uid", { count: "exact", head: true })
      .in("pharmacy_id", pharmacyIds)
      .eq("is_active", true)
      .neq("role", "super_admin");

    if (userCountError) {
      throw new Error(userCountError.message);
    }

    if ((activeUserCount || 0) > maxUsers) {
      throw new Error(`tier_sync_below_current_users:${organizationId}:${activeUserCount || 0}`);
    }
  }

  const { error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({
      max_branches: maxBranches,
      max_users: maxUsers,
    })
    .eq("subscription_tier", tier);

  if (pharmacyError) {
    throw new Error(pharmacyError.message);
  }

  const realOrganizationIds = [...orgBranchCounts.keys()].filter((id) => !id.startsWith("org-"));
  if (realOrganizationIds.length > 0) {
    const { error: organizationError } = await supabase
      .from("organizations")
      .update({
        max_branches: maxBranches,
        max_users: maxUsers,
      })
      .in("id", realOrganizationIds);

    if (organizationError) {
      throw new Error(organizationError.message);
    }
  }

  return { updatedOrganizations: orgBranchCounts.size };
}

export async function updateOrganizationFreeTrial(
  organizationId: string,
  params: { enabled: boolean; endDate: string },
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const endDate = params.endDate.trim();
  if (params.enabled) {
    if (!endDate) {
      throw new Error("trial_end_date_required");
    }
    const end = new Date(`${endDate}T23:59:59`);
    if (Number.isNaN(end.getTime())) {
      throw new Error("invalid_end_date");
    }
    const today = formatDateInput(new Date());
    if (endDate < today) {
      throw new Error("trial_end_date_past");
    }
  }

  const { data: orgPharmacies, error: fetchError } = await supabase
    .from("pharmacies")
    .select("subscription_status")
    .eq("organization_id", organizationId)
    .limit(1);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!orgPharmacies || orgPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  const wasTrial = isTrialSubscriptionStatus(String(orgPharmacies[0].subscription_status || ""));

  const updates: Record<string, unknown> = {
    is_active: true,
  };

  if (params.enabled) {
    updates.subscription_status = "trial";
    updates.subscription_plan = "trial";
    updates.subscription_end_date = endDate;
    if (!wasTrial) {
      updates.subscription_started_at = formatDateInput(new Date());
    }
  } else {
    updates.subscription_status = "active";
  }

  const { error } = await supabase
    .from("pharmacies")
    .update(updates)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }
}
