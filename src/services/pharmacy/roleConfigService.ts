import type { AppUser, Page, PharmacyRoleConfig, PharmacySettings } from "../../types";
import type { RolePermissionFlags } from "../../utils/rolePermissions";
import { isOrgPharmacyAdmin, isSuperAdmin } from "../../utils/roles";
import { toCamelCase, toSnakeCase } from "./mappers";
import { supabase } from "../supabaseClient";
import { setPharmacyRoleConfigs } from "./roleConfigCache";
import { applyPharmacyScopeFilter, getCurrentAppUser } from "./scope";
import { setPharmacyCustomRoles } from "./customRoleCache";
import { getPharmacyCustomRolesForPharmacies } from "./customRoleService";

function normalizeRoleConfig(row: Record<string, unknown>): PharmacyRoleConfig {
  const camel = toCamelCase<PharmacyRoleConfig>(row);
  const allowedPages = Array.isArray(camel.allowedPages)
    ? camel.allowedPages
    : Array.isArray(row.allowed_pages)
      ? row.allowed_pages
      : [];
  return {
    ...camel,
    id: String(camel.id ?? row.id ?? ""),
    pharmacyId: String(camel.pharmacyId ?? row.pharmacy_id ?? ""),
    roleKey: String(camel.roleKey ?? row.role_key ?? "")
      .trim()
      .toLowerCase(),
    allowedPages: allowedPages as Page[],
    permissions: (camel.permissions ?? row.permissions ?? {}) as RolePermissionFlags,
  };
}

export async function getPharmacyRoleConfigs(pharmacyId: string): Promise<PharmacyRoleConfig[]> {
  const { data, error } = await supabase
    .from("pharmacy_role_configs")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("role_key", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => normalizeRoleConfig(row as Record<string, unknown>));
}

export async function getPharmacyRoleConfigsForPharmacies(
  pharmacyIds: string[],
): Promise<PharmacyRoleConfig[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];

  let query = supabase
    .from("pharmacy_role_configs")
    .select("*")
    .order("pharmacy_id", { ascending: true })
    .order("role_key", { ascending: true });

  query = applyPharmacyScopeFilter(query, ids);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => normalizeRoleConfig(row as Record<string, unknown>));
}

export async function upsertPharmacyRoleConfig(input: {
  pharmacyId: string;
  roleKey: string;
  allowedPages: Page[];
  permissions: RolePermissionFlags;
}): Promise<PharmacyRoleConfig> {
  const roleKey = input.roleKey.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("pharmacy_role_configs")
    .select("id")
    .eq("pharmacy_id", input.pharmacyId)
    .eq("role_key", roleKey)
    .maybeSingle();

  const payload = toSnakeCase({
    id: existing?.id || crypto.randomUUID(),
    pharmacyId: input.pharmacyId,
    roleKey,
    allowedPages: input.allowedPages,
    permissions: input.permissions,
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("pharmacy_role_configs")
    .upsert(payload, { onConflict: "pharmacy_id,role_key" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeRoleConfig(data as Record<string, unknown>);
}

export async function deletePharmacyRoleConfig(
  pharmacyId: string,
  roleKey: string,
): Promise<void> {
  const { error } = await supabase
    .from("pharmacy_role_configs")
    .delete()
    .eq("pharmacy_id", pharmacyId)
    .eq("role_key", roleKey.trim().toLowerCase());

  if (error) throw new Error(error.message);
}

export async function updatePharmacyCustomRoleAccess(
  id: string,
  input: { allowedPages: Page[]; permissions: RolePermissionFlags },
): Promise<void> {
  const { error } = await supabase
    .from("pharmacy_custom_roles")
    .update(
      toSnakeCase({
        allowedPages: input.allowedPages,
        permissions: input.permissions,
        updatedAt: new Date().toISOString(),
      }),
    )
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function loadPharmacyRoleAccessIntoScope(
  appUser: AppUser | null,
  branches: PharmacySettings[],
): Promise<void> {
  if (!appUser) {
    setPharmacyRoleConfigs([]);
    return;
  }

  let pharmacyIds: string[] = [];
  if (isSuperAdmin(appUser)) {
    const active = getCurrentAppUser()?.pharmacyId || appUser.pharmacyId;
    pharmacyIds = branches.length > 0 ? branches.map((b) => b.id) : active ? [active] : [];
  } else if (isOrgPharmacyAdmin(appUser)) {
    pharmacyIds = branches.length > 0 ? branches.map((b) => b.id) : [appUser.pharmacyId];
  } else {
    pharmacyIds = [appUser.pharmacyId];
  }

  const [configs, customRoles] = await Promise.all([
    getPharmacyRoleConfigsForPharmacies(pharmacyIds),
    getPharmacyCustomRolesForPharmacies(pharmacyIds),
  ]);

  setPharmacyRoleConfigs(configs);
  setPharmacyCustomRoles(customRoles);
}
