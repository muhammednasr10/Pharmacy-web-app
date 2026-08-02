import { supabase } from "../supabaseClient";
import { isSuperAdmin, normalizeRole } from "../../utils/roles";
import {
  assertPharmacyGeneralManagerSlotAvailable,
  isPharmacyGeneralManagerRole,
} from "../../utils/pharmacyGeneralManager";
import type { AppUser, LoginAccountRequest, PharmacyLoginAccount, UserRole } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { getCurrentAppUser, stampPharmacy } from "./scope";
import { assertOrganizationUserCapacity } from "./organizationAdminService";
import { syncPharmacyLoginAccountToUser } from "./hrService";
import { normalizePharmacyLoginAccount } from "./loginAccountCatalogShared";
import { getPharmacyLoginAccountById } from "./loginAccountQueryService";

/** @internal Used by systemUserService.adminSaveSystemUser */
export async function syncLoginAccountStoredPassword(params: {
  pharmacyId: string;
  email: string;
  password: string;
  role: AppUser["role"];
  employeeId?: string;
}): Promise<void> {
  const email = params.email.trim().toLowerCase();
  const password = params.password.trim();
  if (!password) return;

  const { data: existing, error: lookupError } = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("pharmacy_id", params.pharmacyId)
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    console.warn("syncLoginAccountStoredPassword lookup:", lookupError.message);
    return;
  }

  if (existing?.id) {
    await updatePharmacyLoginAccount(String(existing.id), { password });
    return;
  }

  const payload = stampPharmacy(
    toSnakeCase({
      id: crypto.randomUUID(),
      pharmacyId: params.pharmacyId,
      email,
      password,
      role: normalizeRole(params.role),
      employeeId: params.employeeId || null,
      isActive: true,
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { error: insertError } = await supabase.from("pharmacy_login_accounts").insert([payload]);
  if (insertError) {
    console.warn("syncLoginAccountStoredPassword insert:", insertError.message);
  }
}

export async function createPharmacyLoginAccount(input: {
  pharmacyId: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  status?: PharmacyLoginAccount["status"];
  requestedBy?: string;
  requestedByName?: string;
}): Promise<PharmacyLoginAccount> {
  const status = input.status ?? (isSuperAdmin(getCurrentAppUser()) ? "approved" : "pending");
  const normalizedRole = normalizeRole(input.role);

  await assertPharmacyGeneralManagerSlotAvailable(input.pharmacyId, normalizedRole);

  if (status === "approved") {
    await assertOrganizationUserCapacity(input.pharmacyId);
  }

  const payload = stampPharmacy(
    toSnakeCase({
      id: crypto.randomUUID(),
      pharmacyId: input.pharmacyId,
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: normalizedRole,
      employeeId: input.employeeId || null,
      isActive: true,
      status,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function updatePharmacyLoginAccount(
  id: string,
  updates: Partial<
    Pick<PharmacyLoginAccount, "email" | "password" | "role" | "employeeId" | "isActive" | "status">
  >,
) {
  const existingAccount = await getPharmacyLoginAccountById(id);
  if (!existingAccount) {
    throw new Error("login_account_not_found");
  }

  const nextRole = updates.role ? normalizeRole(updates.role) : undefined;
  if (nextRole && isPharmacyGeneralManagerRole(nextRole)) {
    await assertPharmacyGeneralManagerSlotAvailable(existingAccount.pharmacyId, nextRole, {
      accountId: id,
    });
  }

  const payload = toSnakeCase({
    ...updates,
    email: updates.email?.trim().toLowerCase(),
    role: updates.role ? normalizeRole(updates.role) : undefined,
    updatedAt: new Date().toISOString(),
  });
  if (updates.role === undefined) {
    delete payload.role;
  }

  const { error } = await supabase.from("pharmacy_login_accounts").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyLoginAccount(id: string) {
  const { data: account, error: loadError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    throw new Error(loadError.message);
  }
  if (!account) return;

  const catalogAccount = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(account));
  const email = catalogAccount.email.trim().toLowerCase();
  const pharmacyId = catalogAccount.pharmacyId;
  const role = catalogAccount.role;

  const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (catalogAccount.employeeId && role) {
    const { data: employeeRow } = await supabase
      .from("employees")
      .select("job_title")
      .eq("id", catalogAccount.employeeId)
      .maybeSingle();

    if (employeeRow && String(employeeRow.job_title) === role) {
      const { error: employeeError } = await supabase
        .from("employees")
        .update({ job_title: "", updated_at: new Date().toISOString() })
        .eq("id", catalogAccount.employeeId);
      if (employeeError) {
        throw new Error(employeeError.message);
      }
    }
  }

  if (email && pharmacyId) {
    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("uid")
      .eq("pharmacy_id", pharmacyId)
      .ilike("email", email);

    if (usersError) {
      throw new Error(usersError.message);
    }

    for (const row of userRows || []) {
      if (row.uid) {
        const { error: userDeleteError } = await supabase.from("users").delete().eq("uid", String(row.uid));
        if (userDeleteError) {
          throw new Error(userDeleteError.message);
        }
      }
    }
  }
}

export async function assignPharmacyLoginAccountToEmployee(
  accountId: string | null,
  employeeId: string | null,
  pharmacyId: string,
) {
  if (employeeId) {
    await supabase
      .from("pharmacy_login_accounts")
      .update({ employee_id: null, updated_at: new Date().toISOString() })
      .eq("employee_id", employeeId);
  }

  if (!accountId) return;

  const { data: account, error: loadError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (loadError || !account) {
    throw new Error("login_account_not_found");
  }

  const catalogAccount = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(account));
  if (catalogAccount.status !== "approved") {
    throw new Error("login_account_not_approved");
  }

  if (employeeId && isPharmacyGeneralManagerRole(catalogAccount.role)) {
    await assertPharmacyGeneralManagerSlotAvailable(pharmacyId.trim(), catalogAccount.role, {
      accountId: accountId,
      employeeId,
    });
  }

  const targetPharmacyId = pharmacyId.trim();
  if (employeeId && catalogAccount.pharmacyId !== targetPharmacyId) {
    const email = catalogAccount.email.trim().toLowerCase();
    const { data: emailConflict } = await supabase
      .from("pharmacy_login_accounts")
      .select("id")
      .eq("pharmacy_id", targetPharmacyId)
      .ilike("email", email)
      .neq("id", accountId)
      .maybeSingle();

    if (emailConflict?.id) {
      throw new Error("login_account_email_exists_on_branch");
    }
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      employee_id: employeeId,
      pharmacy_id: employeeId ? targetPharmacyId : catalogAccount.pharmacyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  const syncedAccount = {
    ...catalogAccount,
    pharmacyId: employeeId ? targetPharmacyId : catalogAccount.pharmacyId,
    employeeId: employeeId || undefined,
  };

  if (employeeId) {
    const { data: employeeRow } = await supabase
      .from("employees")
      .select("name")
      .eq("id", employeeId)
      .maybeSingle();
    const employeeName = employeeRow ? String((employeeRow as { name?: string }).name || "") : "";
    await syncPharmacyLoginAccountToUser(syncedAccount, { name: employeeName || undefined });
  } else {
    await syncPharmacyLoginAccountToUser(syncedAccount);
  }
}

export async function createPharmacyLoginAccountFromRequest(
  request: LoginAccountRequest,
  password?: string,
): Promise<PharmacyLoginAccount> {
  const existing = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("pharmacy_id", request.pharmacyId)
    .eq("email", request.email.trim().toLowerCase())
    .maybeSingle();

  if (existing.data?.id) {
    const { data } = await supabase
      .from("pharmacy_login_accounts")
      .select("*")
      .eq("id", existing.data.id)
      .single();
    return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
  }

  return createPharmacyLoginAccount({
    pharmacyId: request.pharmacyId,
    email: request.email,
    password: password || request.password || "",
    role: request.role,
    employeeId: request.employeeId,
  });
}
