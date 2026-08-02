import { supabase, supabaseAnonKey, supabaseUrl } from "../supabaseClient";
import { loginWithAppAuth } from "../appAuthSession";
import { isSuperAdmin, normalizeAppUser, normalizeRole } from "../../utils/roles";
import type { AppUser, SystemUser } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { getCurrentAppUser } from "./scope";
import { getRows, subscribeTable } from "./dbHelpers";
import { assertOrganizationUserCapacity } from "./organizationAdminService";
import { syncLoginAccountStoredPassword } from "./loginAccountCatalogService";
import { deletePharmacyEmployeeCascade, linkUserToEmployee } from "./hrService";

export async function getAllSystemUsers(): Promise<SystemUser[]> {
  if (!isSuperAdmin(getCurrentAppUser())) {
    return [];
  }
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("email", { ascending: true });
  if (error) {
    console.error("getAllSystemUsers error:", error.message);
    return [];
  }
  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export async function getSystemUsers(pharmacyId: string): Promise<SystemUser[]> {
  if (!pharmacyId) return [];

  if (isSuperAdmin(getCurrentAppUser())) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("pharmacy_id", pharmacyId)
      .order("email", { ascending: true })
      .limit(500);
    if (error) {
      console.error("getSystemUsers error:", error.message);
      return [];
    }
    return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
  }

  const rows = await getRows<SystemUser>("users", "uid", false, 100, {
    column: "pharmacy_id",
    value: pharmacyId,
  });
  return rows.map((row) => normalizeAppUser(row));
}

export async function getSystemUsersForPharmacies(pharmacyIds: string[]): Promise<SystemUser[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getSystemUsers(ids[0]);

  if (isSuperAdmin(getCurrentAppUser())) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("pharmacy_id", ids)
      .order("email", { ascending: true })
      .limit(500);

    if (error) {
      console.error("getSystemUsersForPharmacies error:", error.message);
      return [];
    }

    return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("pharmacy_id", ids)
    .order("uid", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getSystemUsersForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export function subscribeUsers(pharmacyId: string, callback: (users: SystemUser[]) => void) {
  return subscribeTable<SystemUser>(
    "users",
    (rows) => callback(rows.map((row) => normalizeAppUser(row))),
    "uid",
    false,
    100,
    {
      column: "pharmacy_id",
      value: pharmacyId,
    },
  );
}

export async function updateSystemUser(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase(updates);
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function validateNewUserEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return "invalid_format";
  }
  return null;
}

export async function createSystemUser(params: {
  email: string;
  password: string;
  name: string;
  role: AppUser["role"];
  pharmacyId: string;
  employeeId?: string;
  username?: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const role = normalizeRole(params.role);

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  await assertOrganizationUserCapacity(params.pharmacyId);

  const { data: uid, error } = await supabase.rpc("create_app_user_with_password", {
    p_email: email,
    p_password: params.password,
    p_name: params.name.trim(),
    p_role: role,
    p_pharmacy_id: params.pharmacyId,
    p_employee_id: params.employeeId || null,
    p_username: params.username?.trim() || null,
  });

  if (error) {
    if (error.message.includes("email_address_invalid_format")) {
      throw new Error("email_address_invalid_format");
    }
    if (error.message.includes("password_too_short")) {
      throw new Error("password_too_short");
    }
    if (error.message.includes("user_limit_reached")) {
      throw new Error("user_limit_reached");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    if (error.message.includes("duplicate") || error.message.includes("already")) {
      throw new Error("email_already_registered");
    }
    throw new Error(error.message);
  }

  if (!uid) {
    throw new Error("create_user_failed");
  }

  const userId = String(uid);
  if (params.employeeId) {
    await linkUserToEmployee(userId, params.employeeId);
  }

  return userId;
}

export async function registerPublicUser(params: {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const pharmacyName = params.pharmacyName.trim();
  const password = params.password;

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  if (!name) {
    throw new Error("name_required");
  }

  if (pharmacyName.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  if (!password || password.length < 6) {
    throw new Error("password_too_short");
  }

  const { data, error } = await supabase.rpc("register_trial_app_user", {
    p_email: email,
    p_password: password,
    p_name: name,
    p_pharmacy_name: pharmacyName,
  });

  if (error) {
    if (error.message.includes("email_address_invalid_format")) {
      throw new Error("email_address_invalid_format");
    }
    if (error.message.includes("password_too_short")) {
      throw new Error("password_too_short");
    }
    if (error.message.includes("name_required")) {
      throw new Error("name_required");
    }
    if (error.message.includes("pharmacy_name_required")) {
      throw new Error("pharmacy_name_required");
    }
    if (error.message.includes("email_already_registered")) {
      throw new Error("email_already_registered");
    }
    if (error.message.includes("forbidden") || error.message.includes("not_authorized")) {
      throw new Error("trial_registration_not_configured");
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("register_failed");
  }

  const { error: loginError } = await loginWithAppAuth(supabaseUrl, supabaseAnonKey, email, password);
  if (loginError) {
    return { needsEmailConfirmation: true };
  }

  return { needsEmailConfirmation: false };
}

export async function setAppUserPassword(uid: string, password: string) {
  const { error } = await supabase.rpc("set_app_user_password", {
    p_uid: uid,
    p_password: password,
  });
  if (error) {
    if (error.message.includes("password_too_short")) {
      throw new Error("password_too_short");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    throw new Error(error.message);
  }
}

export async function adminSaveSystemUser(params: {
  uid?: string;
  email: string;
  password?: string;
  name: string;
  role: AppUser["role"];
  pharmacyId: string;
  isActive?: boolean;
  employeeId?: string;
}): Promise<string> {
  const password = params.password?.trim() || "";

  if (!params.uid) {
    if (!password) {
      throw new Error("password_required");
    }
    const uid = await createSystemUser({
      email: params.email,
      password,
      name: params.name,
      role: params.role,
      pharmacyId: params.pharmacyId,
      employeeId: params.employeeId,
    });
    await syncLoginAccountStoredPassword({
      pharmacyId: params.pharmacyId,
      email: params.email,
      password,
      role: params.role,
      employeeId: params.employeeId,
    });
    return uid;
  }

  await updateSystemUser(params.uid, {
    email: params.email.trim().toLowerCase(),
    name: params.name.trim(),
    role: params.role,
    pharmacyId: params.pharmacyId,
    isActive: params.isActive,
    employeeId: params.employeeId || undefined,
  });

  if (password) {
    await setAppUserPassword(params.uid, password);
    await syncLoginAccountStoredPassword({
      pharmacyId: params.pharmacyId,
      email: params.email,
      password,
      role: params.role,
      employeeId: params.employeeId,
    });
  }

  if (params.employeeId) {
    await linkUserToEmployee(params.uid, params.employeeId);
  }

  return params.uid;
}

/** @deprecated Password reset emails are not used — admins set passwords via setAppUserPassword */
export async function sendPasswordResetEmail(email: string) {
  void email;
  throw new Error("password_reset_disabled_use_admin");
}

export async function deleteSystemUser(uid: string) {
  const { error } = await supabase.from("users").delete().eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyUserCascade(
  uid: string,
  options?: { revokedBy?: string; actingUser?: AppUser | null },
): Promise<void> {
  const actor = options?.actingUser ?? getCurrentAppUser();
  if (!isSuperAdmin(actor)) {
    throw new Error("forbidden");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .maybeSingle();

  if (userError) {
    throw new Error(userError.message);
  }
  if (!userRow) return;

  const user = normalizeAppUser(toCamelCase<AppUser>(userRow));
  if (user.role === "super_admin") {
    throw new Error("cannot_delete_super_admin");
  }

  if (user.employeeId) {
    await deletePharmacyEmployeeCascade(user.employeeId, options);
    return;
  }

  const pharmacyId = user.pharmacyId;
  const email = user.email.trim().toLowerCase();
  const { data: accountRows, error: accountsError } = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("pharmacy_id", pharmacyId)
    .ilike("email", email);

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  const accountIds = (accountRows || []).map((row) => String(row.id)).filter(Boolean);

  try {
    await unlinkLoginAccountFromSystem(uid, accountIds[0], options?.revokedBy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "revoke_rpc_not_configured" ||
      message === "not_authorized" ||
      message.includes("not_authorized")
    ) {
      await forceDeleteAppUser(uid, accountIds, options?.revokedBy);
      return;
    }
    throw error;
  }

  for (const accountId of accountIds) {
    const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", accountId);
    if (error) {
      throw new Error(error.message);
    }
  }

  const { data: remainingUser } = await supabase
    .from("users")
    .select("uid")
    .eq("uid", uid)
    .maybeSingle();
  if (remainingUser?.uid) {
    await deleteSystemUser(uid);
  }
}

async function forceDeleteAppUser(
  uid: string,
  accountIds: string[],
  revokedBy?: string,
): Promise<void> {
  const { error: revokeRowError } = await supabase.from("user_session_revocations").upsert({
    uid,
    revoked_by: revokedBy || null,
    reason: "unlink",
    revoked_at: new Date().toISOString(),
  });
  if (revokeRowError) {
    console.warn("[Auth] session revocation row skipped:", revokeRowError.message);
  }

  await deleteSystemUser(uid);

  for (const accountId of accountIds) {
    const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", accountId);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function unlinkLoginAccountFromSystem(
  uid: string,
  accountId?: string,
  revokedBy?: string,
) {
  const { error } = await supabase.rpc("revoke_user_app_access", {
    p_uid: uid,
    p_account_id: accountId || null,
    p_revoked_by: revokedBy || null,
    p_reason: "unlink",
  });

  if (error) {
    if (
      error.message.includes("revoke_user_app_access") &&
      error.message.includes("does not exist")
    ) {
      throw new Error("revoke_rpc_not_configured");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    throw new Error(error.message);
  }
}
