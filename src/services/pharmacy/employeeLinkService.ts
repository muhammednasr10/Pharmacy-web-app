import { supabase } from "../supabaseClient";
import type {
  AppUser,
  Employee,
  LoginAccountRequest,
  PharmacyLoginAccount,
  SystemUser,
  UserRole,
} from "../../types";
import { isPharmacyGeneralManagerRole } from "../../utils/pharmacyGeneralManager";
import { normalizeRole } from "../../utils/roles";
import { toCamelCase, toSnakeCase } from "./mappers";
import {
  getPharmacyLoginAccountRequests,
  getPharmacyLoginAccounts,
  getSystemUsers,
} from "./authService";
import { getEmployees } from "./employeeService";

export async function findLoginAccountForEmployee(
  employee: Employee,
): Promise<PharmacyLoginAccount | null> {
  const { data: byEmployee, error: byEmployeeError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("employee_id", employee.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmployeeError) {
    throw new Error(byEmployeeError.message);
  }
  if (byEmployee) {
    return toCamelCase<PharmacyLoginAccount>(byEmployee);
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("email")
    .eq("employee_id", employee.id)
    .maybeSingle();

  const email = String(userRow?.email || "")
    .trim()
    .toLowerCase();
  if (!email) return null;

  const { data: byEmail, error: byEmailError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("pharmacy_id", employee.pharmacyId)
    .ilike("email", email)
    .maybeSingle();

  if (byEmailError) {
    throw new Error(byEmailError.message);
  }

  return byEmail ? toCamelCase<PharmacyLoginAccount>(byEmail) : null;
}

export async function linkUserToEmployee(uid: string, employeeId: string | null) {
  if (employeeId) {
    const { data: userRow, error: fetchError } = await supabase
      .from("users")
      .select("role")
      .eq("uid", uid)
      .maybeSingle();
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    if (userRow && normalizeRole(String(userRow.role || "")) === "super_admin") {
      throw new Error("cannot_link_super_admin_to_employee");
    }
  }

  const payload: Record<string, unknown> = {
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function resolveLinkedEmployeeFromData(
  appUser: AppUser,
  employees: Employee[],
  accounts: SystemUser[],
  loginRequests: LoginAccountRequest[],
  catalogAccounts: PharmacyLoginAccount[] = [],
): Employee | null {
  if (appUser.employeeId) {
    const linked = employees.find((item) => item.id === appUser.employeeId && item.isActive);
    if (linked) return linked;
  }

  const myAccount = accounts.find((item) => item.uid === appUser.uid);
  if (myAccount?.employeeId) {
    const linked = employees.find((item) => item.id === myAccount.employeeId && item.isActive);
    if (linked) return linked;
  }

  const normalizedEmail = appUser.email.trim().toLowerCase();

  for (const catalog of catalogAccounts) {
    if (!catalog.isActive || catalog.status !== "approved" || !catalog.employeeId) continue;
    if (catalog.email !== normalizedEmail) continue;
    const linked = employees.find((item) => item.id === catalog.employeeId && item.isActive);
    if (linked) return linked;
  }

  const approvedRequests = loginRequests
    .filter((item) => item.status === "approved")
    .sort((a, b) =>
      String(b.reviewedAt || b.updatedAt || "").localeCompare(
        String(a.reviewedAt || a.updatedAt || ""),
      ),
    );

  for (const request of approvedRequests) {
    if (request.email.trim().toLowerCase() !== normalizedEmail) continue;
    if (!request.employeeId) continue;
    const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
    if (linked) return linked;
  }

  const identity = (appUser.username || appUser.name || "").trim();
  if (identity) {
    for (const request of approvedRequests) {
      if (request.username.trim() !== identity) continue;
      if (!request.employeeId) continue;
      const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
      if (linked) return linked;
    }
  }

  // General manager: link to the unique GM employee card on this branch (or same display name).
  if (isPharmacyGeneralManagerRole(appUser.role)) {
    const gmEmployees = employees.filter(
      (item) => item.isActive && isPharmacyGeneralManagerRole(item.jobTitle),
    );
    if (gmEmployees.length === 1) return gmEmployees[0];

    const normalizedName = (appUser.name || "").trim().toLowerCase();
    if (normalizedName) {
      const byName = employees.find(
        (item) => item.isActive && item.name.trim().toLowerCase() === normalizedName,
      );
      if (byName) return byName;
    }
  }

  return null;
}

export async function resolveLinkedEmployeeForAppUser(appUser: AppUser): Promise<Employee | null> {
  const [employees, accounts, loginRequests, catalogAccounts] = await Promise.all([
    getEmployees(),
    getSystemUsers(appUser.pharmacyId),
    getPharmacyLoginAccountRequests(appUser.pharmacyId),
    getPharmacyLoginAccounts(appUser.pharmacyId),
  ]);
  return resolveLinkedEmployeeFromData(
    appUser,
    employees,
    accounts,
    loginRequests,
    catalogAccounts,
  );
}

export async function ensureAppUserEmployeeLink(appUser: AppUser): Promise<AppUser> {
  if (appUser.employeeId) return appUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee) return appUser;

  try {
    await linkUserToEmployee(appUser.uid, employee.id);
    return { ...appUser, employeeId: employee.id };
  } catch (error) {
    console.warn("ensureAppUserEmployeeLink failed", error);
    return appUser;
  }
}

export async function linkLoginRequestToUserAccount(
  request: LoginAccountRequest,
): Promise<boolean> {
  try {
    await syncPharmacyLoginAccountToUser({
      email: request.email,
      role: request.role,
      pharmacyId: request.pharmacyId,
      employeeId: request.employeeId,
    });
    return true;
  } catch {
    return false;
  }
}

export type SyncLoginAccountResult = {
  uid: string;
  email: string;
  role: UserRole;
};

export async function syncPharmacyLoginAccountToUser(
  account: Pick<
    PharmacyLoginAccount,
    "email" | "role" | "pharmacyId" | "employeeId" | "password" | "pendingPassword"
  >,
  options?: { name?: string },
): Promise<SyncLoginAccountResult> {
  const email = account.email.trim().toLowerCase();
  const role = normalizeRole(account.role);
  const name = options?.name?.trim() || email.split("@")[0];
  const password = account.password || account.pendingPassword || null;

  const { data, error } = await supabase.rpc("sync_auth_user_for_login_account", {
    p_email: email,
    p_role: role,
    p_pharmacy_id: account.pharmacyId,
    p_employee_id: account.employeeId || null,
    p_name: name,
    p_password: password,
  });

  if (error) {
    if (error.message.includes("auth_user_not_found")) {
      throw new Error("auth_user_not_found");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("sync_failed");
  }

  return { uid: String(data), email, role };
}

export async function syncAllPharmacyLoginAccounts(pharmacyId: string) {
  const [accounts, employees] = await Promise.all([
    getPharmacyLoginAccounts(pharmacyId),
    getEmployees(),
  ]);
  const employeeById = new Map(employees.map((item) => [item.id, item]));

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const account of accounts) {
    if (account.status !== "approved") continue;
    try {
      const employee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
      await syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      if (account.linkRequestPending) {
        await supabase
          .from("pharmacy_login_accounts")
          .update({
            link_request_pending: false,
            link_requested_by: null,
            link_requested_by_name: null,
            link_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }
      results.push({ email: account.email, ok: true });
    } catch (err) {
      results.push({
        email: account.email,
        ok: false,
        error: err instanceof Error ? err.message : "sync_failed",
      });
    }
  }

  return results;
}

export async function linkExistingAuthUser(params: {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  username?: string;
  isActive?: boolean;
}) {
  const { error } = await supabase.from("users").upsert([
    {
      uid: params.uid,
      employee_id: params.employeeId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      username: params.username?.trim() || null,
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: params.isActive !== false,
      updated_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLoginAccount(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function recordLastLogin(uid: string) {
  const { error } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("uid", uid);
  if (error) {
    console.error("recordLastLogin error:", error.message);
  }
}
