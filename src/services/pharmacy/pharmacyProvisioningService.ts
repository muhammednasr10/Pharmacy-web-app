import { supabase } from "../supabaseClient";
import { TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
} from "../../config/subscriptionTiers";
import type {
  CreatePharmacyInput,
  CreatePharmacyUserInput,
  PharmacySettings,
  UserRole,
} from "../../types";
import { extractCopyableBranchSettings } from "../../utils/copyBranchSettings";
import { toSnakeCase } from "./mappers";
import { resolveStampPharmacyId } from "./scope";
import {
  isMissingRpcError,
  resolveOrganizationIdForScope,
  resolveOrgIdFromPharmacy,
} from "./authServiceShared";
import { getAppUserByUid } from "./appUserService";
import {
  getPharmacies,
  getPharmacySettings,
  updatePharmacySettings,
} from "./pharmacySettingsService";
import { assertOrganizationUserCapacity } from "./organizationAdminService";
import { createSystemUser } from "./systemUserService";

export type TrialProvisionResult = {
  pharmacyId: string;
  organizationId: string;
  subscriptionEndDate: string;
  trialDays: number;
};

export async function provisionTrialPharmacy(pharmacyName: string): Promise<TrialProvisionResult> {
  const name = pharmacyName.trim();
  if (name.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  const { data, error } = await supabase.rpc("provision_trial_pharmacy", {
    p_pharmacy_name: name,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data || {}) as Record<string, unknown>;
  return {
    pharmacyId: String(row.pharmacy_id || ""),
    organizationId: String(row.organization_id || ""),
    subscriptionEndDate: String(row.subscription_end_date || ""),
    trialDays: Number(row.trial_days) || TRIAL_SUBSCRIPTION_DAYS,
  };
}

export async function ensureTrialPharmacyFromAuth(authUser: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const meta = authUser.user_metadata || {};
  if (meta.signup_type !== "trial_pharmacy") {
    return false;
  }
  const pharmacyName = String(meta.pharmacy_name || "").trim();
  if (!pharmacyName) return false;

  const existing = await getAppUserByUid(authUser.id);
  if (existing?.pharmacyId && existing.pharmacyId !== "main") {
    return false;
  }

  await provisionTrialPharmacy(pharmacyName);
  return true;
}

export async function createPharmacy(data: CreatePharmacyInput) {
  const organizationId = data.organizationId || `org-${data.id}`;
  const orgName = data.name || data.id;
  const subscriptionTier = parseSubscriptionTier(data.subscriptionTier);
  const tierConfig = getSubscriptionTier(subscriptionTier);
  const maxBranches = Math.max(1, Math.floor(Number(data.maxBranches) || tierConfig.maxBranches));
  const maxUsers = Math.max(1, Math.floor(Number(data.maxUsers) || tierConfig.maxUsers));
  const isNewTenant = !data.organizationId || data.organizationId === `org-${data.id}`;

  if (isNewTenant) {
    const { error: rpcError } = await supabase.rpc("create_saas_pharmacy", {
      p_id: data.id,
      p_name: data.name,
      p_name_en: data.name_en || data.name,
      p_phone: data.phone || "",
      p_address: data.address || "",
      p_subscription_tier: subscriptionTier,
      p_subscription_plan: data.subscriptionPlan || "monthly",
      p_subscription_status: data.subscriptionStatus || "active",
      p_max_branches: maxBranches,
      p_max_users: maxUsers,
    });
    if (!rpcError) {
      return;
    }

    const rpcMissing =
      rpcError.code === "PGRST202" ||
      /create_saas_pharmacy|could not find the function/i.test(rpcError.message);
    if (!rpcMissing) {
      throw new Error(rpcError.message);
    }
  }

  const { error: orgError } = await supabase.from("organizations").upsert(
    {
      id: organizationId,
      name: orgName,
      max_branches: maxBranches,
      max_users: maxUsers,
      subscription_tier: subscriptionTier,
    },
    { onConflict: "id" },
  );
  if (orgError) {
    throw new Error(orgError.message);
  }

  const payload = toSnakeCase({
    id: data.id,
    name: data.name,
    name_en: data.name_en || data.name,
    phone: data.phone || "",
    address: data.address || "",
    currency: data.currency || "ج.م",
    isActive: true,
    organizationId,
    maxBranches,
    maxUsers,
    subscriptionTier,
    subscriptionPlan: data.subscriptionPlan || "monthly",
    subscriptionStatus: data.subscriptionStatus || "active",
  });
  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}



export async function createPharmacyBranchForAnchor(
  anchorPharmacyId: string,
  branch: Partial<PharmacySettings> & { id: string; name: string },
) {
  const pharmacies = await getPharmacies();
  const organizationId = await resolveOrganizationIdForScope(anchorPharmacyId);
  const orgPharmacies = pharmacies.filter(
    (row) => resolveOrgIdFromPharmacy(row) === organizationId,
  );
  const anchor =
    orgPharmacies.find((row) => row.id === anchorPharmacyId) || orgPharmacies[0];
  if (!anchor) {
    throw new Error("anchor_not_found");
  }

  const branchCount = orgPharmacies.length;
  const maxBranches = Math.max(1, Number(anchor.maxBranches) || 1);
  if (branchCount >= maxBranches) {
    throw new Error("branch_limit_reached");
  }

  const subscriptionTier = parseSubscriptionTier(
    anchor.subscriptionTier || anchor.subscriptionPlan,
  );

  return createPharmacy({
    id: branch.id,
    name: branch.name,
    name_en: branch.name_en || branch.name,
    phone: branch.phone,
    address: branch.address,
    currency: branch.currency || anchor.currency || "ج.م",
    organizationId,
    subscriptionTier,
    maxBranches: anchor.maxBranches,
    maxUsers: anchor.maxUsers,
    subscriptionPlan: anchor.subscriptionPlan || "monthly",
    subscriptionStatus: anchor.subscriptionStatus || "active",
  });
}

/** @deprecated use createPharmacy — kept for branch UI compatibility */
export async function createPharmacyBranch(branch: Partial<PharmacySettings> & { id: string }) {
  const scopeId = resolveStampPharmacyId();
  return createPharmacyBranchForAnchor(scopeId, {
    ...branch,
    name: branch.name || branch.id,
  });
}

export async function copyPharmacySettingsFromBranch(
  sourceBranchId: string,
  targetBranchId: string,
) {
  if (!sourceBranchId || sourceBranchId === targetBranchId) return;

  const source = await getPharmacySettings(sourceBranchId);
  if (!source) {
    throw new Error("source_branch_not_found");
  }

  await updatePharmacySettings(targetBranchId, extractCopyableBranchSettings(source));
}

export async function updatePharmacyStatus(
  pharmacyId: string,
  status: { isActive?: boolean; subscriptionStatus?: string; subscriptionPlan?: string },
) {
  const payload = toSnakeCase({ id: pharmacyId, ...status });
  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function linkPharmacyUser(params: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
}) {
  await assertOrganizationUserCapacity(params.pharmacyId, params.uid);

  const { error } = await supabase.from("users").insert([
    {
      uid: params.uid,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createPharmacyUser(params: CreatePharmacyUserInput): Promise<string> {
  if (params.uid) {
    await linkPharmacyUser({
      uid: params.uid,
      name: params.name,
      email: params.email,
      role: params.role,
      pharmacyId: params.pharmacyId,
    });
    return params.uid;
  }
  if (!params.password) {
    throw new Error("password_required");
  }
  return createSystemUser({
    email: params.email,
    password: params.password,
    name: params.name,
    role: params.role,
    pharmacyId: params.pharmacyId,
  });
}


export async function deletePharmacy(id: string) {
  const { error: rpcError } = await supabase.rpc("delete_pharmacy_cascade", {
    p_pharmacy_id: id,
  });
  if (!rpcError) return;

  if (!isMissingRpcError(rpcError.message, "delete_pharmacy_cascade")) {
    throw new Error(rpcError.message);
  }

  const { error } = await supabase.from("pharmacies").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteOrganization(organizationId: string) {
  const { error: rpcError } = await supabase.rpc("delete_organization_cascade", {
    p_organization_id: organizationId,
  });
  if (!rpcError) return;

  if (!isMissingRpcError(rpcError.message, "delete_organization_cascade")) {
    throw new Error(rpcError.message);
  }

  throw new Error("delete_organization_cascade_missing");
}
