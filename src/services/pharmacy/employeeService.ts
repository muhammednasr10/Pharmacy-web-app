import { supabase } from "../supabaseClient";
import type { AppUser, Employee, EmployeeProfile, PharmacyLoginAccount, ShiftId } from "../../types";
import { isSuperAdmin } from "../../utils/roles";
import {
  assertPharmacyGeneralManagerSlotAvailable,
  isPharmacyGeneralManagerRole,
} from "../../utils/pharmacyGeneralManager";
import { parseWorkBreaks } from "../../utils/workSchedule";
import { toCamelCase, toSnakeCase } from "./mappers";
import {
  applyPharmacyFilter,
  getCurrentAppUser,
  resolveStampPharmacyId,
  stampPharmacy,
} from "./scope";
import { getRows } from "./dbHelpers";
import { getPharmacySettings } from "./authService";
import {
  findLoginAccountForEmployee,
  syncPharmacyLoginAccountToUser,
} from "./employeeLinkService";

export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  return getRows<EmployeeProfile>("employee_profiles", "user_name", false, 500, undefined, true);
}

export async function upsertEmployeeProfile(
  profile: Partial<EmployeeProfile> & { userId: string; userName: string },
) {
  const id = profile.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...profile,
      id,
      baseSalary: Number(profile.baseSalary ?? 0),
      updatedAt: new Date().toISOString(),
    }),
  );
  const { error } = await supabase
    .from("employee_profiles")
    .upsert([payload], { onConflict: "pharmacy_id,user_id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getEmployees(): Promise<Employee[]> {
  return getRows<Employee>("employees", "employee_code", false, 500, undefined, true);
}

export async function getEmployeesForPharmacies(pharmacyIds: string[]): Promise<Employee[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getEmployees();
  if (ids.length === 1) {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("pharmacy_id", ids[0])
      .order("employee_code", { ascending: true })
      .limit(500);
    if (error) {
      console.error("getEmployeesForPharmacies error:", error.message);
      return [];
    }
    return (data || []).map((row) => toCamelCase<Employee>(row));
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .in("pharmacy_id", ids)
    .order("employee_code", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("getEmployeesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Employee>(row));
}

export async function suggestNextEmployeeCode(pharmacyId?: string): Promise<string> {
  const scopeId = pharmacyId || resolveStampPharmacyId();
  const employees = await getEmployees();
  const scoped = employees.filter((e) => e.pharmacyId === scopeId);
  let maxNum = 0;
  for (const emp of scoped) {
    const code = (emp.employeeCode || "").trim();
    const match = code.match(/(\d+)\s*$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  let query = applyPharmacyFilter(supabase.from("employees").select("*").eq("id", id));
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<Employee>(data);
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Employee> {
  const id = input.id || crypto.randomUUID();
  const pharmacyId = input.pharmacyId || resolveStampPharmacyId();
  let employeeCode = (input.employeeCode || "").trim();
  if (!employeeCode) {
    employeeCode = await suggestNextEmployeeCode(pharmacyId);
  }
  const payload = stampPharmacy(
    toSnakeCase({
      ...input,
      id,
      pharmacyId,
      employeeCode,
      salary: Number(input.salary ?? 0),
      commissionRate: Number(input.commissionRate ?? 0),
      requiredWorkHours: Number(input.requiredWorkHours ?? 8),
      assignedShiftId: (input.assignedShiftId as ShiftId) || "A",
      useCustomWorkSchedule: Boolean(input.useCustomWorkSchedule),
      workDayStart: input.useCustomWorkSchedule ? input.workDayStart || null : null,
      workDayEnd: input.useCustomWorkSchedule ? input.workDayEnd || null : null,
      workBreaks: input.useCustomWorkSchedule ? parseWorkBreaks(input.workBreaks) : null,
      isActive: input.isActive !== false,
      updatedAt: new Date().toISOString(),
    }),
  );
  const { data, error } = await supabase.from("employees").insert([payload]).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<Employee>(data);
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  if (updates.jobTitle !== undefined && isPharmacyGeneralManagerRole(updates.jobTitle)) {
    const { data: row, error: loadError } = await supabase
      .from("employees")
      .select("pharmacy_id")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      throw new Error(loadError.message);
    }
    if (!row?.pharmacy_id) {
      throw new Error("employee_branch_missing");
    }

    await assertPharmacyGeneralManagerSlotAvailable(String(row.pharmacy_id), updates.jobTitle, {
      employeeId: id,
    });
  }

  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { data, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", id)
    .select("id, job_title")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("employee_update_failed");
  }
}

async function resolveTransferEmployeeCode(
  employee: Employee,
  targetPharmacyId: string,
): Promise<string> {
  const code = (employee.employeeCode || "").trim();
  if (!code) {
    return suggestNextEmployeeCode(targetPharmacyId);
  }

  const { data: conflict } = await supabase
    .from("employees")
    .select("id")
    .eq("pharmacy_id", targetPharmacyId)
    .ilike("employee_code", code)
    .neq("id", employee.id)
    .maybeSingle();

  if (conflict?.id) {
    return suggestNextEmployeeCode(targetPharmacyId);
  }

  return code;
}

export type TransferEmployeeToBranchResult = {
  fromPharmacyId: string;
  toPharmacyId: string;
  employeeCode: string;
  loginEmail?: string;
  loginSynced: boolean;
};

/** Move employee (+ linked login catalog / Auth user) to another branch in the same org. */
export async function transferEmployeeToBranch(
  employeeId: string,
  targetPharmacyId: string,
): Promise<TransferEmployeeToBranchResult> {
  const trimmedTarget = targetPharmacyId.trim();
  if (!trimmedTarget) {
    throw new Error("branch_required");
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) {
    throw new Error(employeeError.message);
  }
  if (!employeeRow) {
    throw new Error("employee_not_found");
  }

  const employee = toCamelCase<Employee>(employeeRow);
  const fromPharmacyId = employee.pharmacyId;
  if (!fromPharmacyId) {
    throw new Error("employee_branch_missing");
  }
  if (fromPharmacyId === trimmedTarget) {
    throw new Error("employee_already_in_branch");
  }

  const loginAccount = await findLoginAccountForEmployee(employee);
  const isGeneralManager =
    isPharmacyGeneralManagerRole(employee.jobTitle) ||
    (loginAccount ? isPharmacyGeneralManagerRole(loginAccount.role) : false);

  if (isGeneralManager) {
    await assertPharmacyGeneralManagerSlotAvailable(trimmedTarget, "pharmacy_admin");
  }

  const targetPharmacy = await getPharmacySettings(trimmedTarget);
  if (!targetPharmacy) {
    throw new Error("branch_not_found");
  }

  const employeeCode = await resolveTransferEmployeeCode(employee, trimmedTarget);

  if (loginAccount) {
    const email = loginAccount.email.trim().toLowerCase();
    const { data: emailConflict } = await supabase
      .from("pharmacy_login_accounts")
      .select("id")
      .eq("pharmacy_id", trimmedTarget)
      .ilike("email", email)
      .neq("id", loginAccount.id)
      .maybeSingle();

    if (emailConflict?.id) {
      throw new Error("login_account_email_exists_on_branch");
    }
  }

  await updateEmployee(employeeId, {
    pharmacyId: trimmedTarget,
    employeeCode,
  });

  let loginEmail: string | undefined;
  let loginSynced = false;

  if (loginAccount) {
    loginEmail = loginAccount.email.trim().toLowerCase();
    const { error: accountError } = await supabase
      .from("pharmacy_login_accounts")
      .update({
        pharmacy_id: trimmedTarget,
        employee_id: employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loginAccount.id);

    if (accountError) {
      throw new Error(accountError.message);
    }

    try {
      await syncPharmacyLoginAccountToUser(
        {
          email: loginAccount.email,
          role: loginAccount.role,
          pharmacyId: trimmedTarget,
          employeeId,
        },
        { name: employee.name },
      );
      loginSynced = true;
    } catch (error) {
      if (!(error instanceof Error && error.message === "auth_user_not_found")) {
        throw error;
      }
    }
  } else {
    const { data: userRow } = await supabase
      .from("users")
      .select("uid, email")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (userRow?.uid) {
      loginEmail = String(userRow.email || "").trim().toLowerCase() || undefined;
      const { error: userError } = await supabase
        .from("users")
        .update({
          pharmacy_id: trimmedTarget,
          updated_at: new Date().toISOString(),
        })
        .eq("uid", userRow.uid);

      if (userError) {
        throw new Error(userError.message);
      }
      loginSynced = true;
    }
  }

  return {
    fromPharmacyId,
    toPharmacyId: trimmedTarget,
    employeeCode,
    loginEmail,
    loginSynced,
  };
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  await updateEmployee(id, { isActive });
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyEmployeeCascade(
  employeeId: string,
  options?: { revokedBy?: string; actingUser?: AppUser | null },
): Promise<void> {
  const actor = options?.actingUser ?? getCurrentAppUser();
  if (!isSuperAdmin(actor)) {
    throw new Error("forbidden");
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) {
    throw new Error(employeeError.message);
  }
  if (!employeeRow) return;

  const employee = toCamelCase<Employee>(employeeRow);
  const loginAccount = await findLoginAccountForEmployee(employee);

  const { data: linkedUsers, error: usersError } = await supabase
    .from("users")
    .select("uid")
    .eq("employee_id", employeeId);

  if (usersError) {
    throw new Error(usersError.message);
  }

  for (const row of linkedUsers || []) {
    const uid = String(row.uid || "").trim();
    if (!uid) continue;
    const { error: revokeError } = await supabase.rpc("revoke_user_app_access", {
      p_uid: uid,
      p_account_id: loginAccount?.id || null,
      p_revoked_by: options?.revokedBy || null,
      p_reason: "delete",
    });
    if (revokeError) {
      const { error: deleteUserError } = await supabase.from("users").delete().eq("uid", uid);
      if (deleteUserError) {
        throw new Error(deleteUserError.message);
      }
    }
  }

  const { data: accountRows, error: accountsError } = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("employee_id", employeeId);

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  const accountIds = new Set<string>(
    (accountRows || []).map((row) => String(row.id)).filter(Boolean),
  );
  if (loginAccount?.id) {
    accountIds.add(loginAccount.id);
  }

  for (const accountId of accountIds) {
    const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", accountId);
    if (error) {
      throw new Error(error.message);
    }
  }

  await deleteEmployee(employeeId);
}
