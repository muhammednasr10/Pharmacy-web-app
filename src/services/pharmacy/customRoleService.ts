import type {
  AppUser,
  Page,
  PharmacyCustomRole,
  PharmacySettings,
  RolePermissionFlags,
  UserRole,
} from "../../types";
import { isOrgPharmacyAdmin, isSuperAdmin } from "../../utils/roles";
import {
  defaultPagesForCustomRoleTemplate,
  slugifyCustomRoleKey,
} from "../../utils/customRolePages";
import { normalizeRolePermissionFlags } from "../../utils/rolePermissions";
import { toCamelCase, toSnakeCase } from "./mappers";
import { supabase } from "../supabaseClient";
import { setPharmacyCustomRoles } from "./customRoleCache";
import { applyPharmacyScopeFilter, getCurrentAppUser } from "./scope";

function normalizeCustomRole(row: Record<string, unknown>): PharmacyCustomRole {
  const camel = toCamelCase<PharmacyCustomRole>(row);
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
    nameAr: String(camel.nameAr ?? row.name_ar ?? "").trim(),
    nameEn: String(camel.nameEn ?? row.name_en ?? "").trim(),
    baseRole: (camel.baseRole ?? row.base_role ?? "cashier") as PharmacyCustomRole["baseRole"],
    allowedPages: allowedPages as Page[],
    permissions: (camel.permissions ?? row.permissions ?? {}) as RolePermissionFlags,
    isActive: camel.isActive !== false && row.is_active !== false,
  };
}

export async function getPharmacyCustomRoles(pharmacyId: string): Promise<PharmacyCustomRole[]> {
  const { data, error } = await supabase
    .from("pharmacy_custom_roles")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizeCustomRole(row as Record<string, unknown>));
}

export async function getPharmacyCustomRolesForPharmacies(
  pharmacyIds: string[],
): Promise<PharmacyCustomRole[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];

  let query = supabase
    .from("pharmacy_custom_roles")
    .select("*")
    .eq("is_active", true)
    .order("pharmacy_id", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyPharmacyScopeFilter(query, ids);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizeCustomRole(row as Record<string, unknown>));
}

async function ensureUniqueRoleKey(pharmacyId: string, baseKey: string): Promise<string> {
  const { data, error } = await supabase
    .from("pharmacy_custom_roles")
    .select("role_key")
    .eq("pharmacy_id", pharmacyId)
    .like("role_key", `${baseKey}%`);

  if (error) {
    throw new Error(error.message);
  }

  const taken = new Set((data || []).map((row) => String(row.role_key)));
  if (!taken.has(baseKey)) return baseKey;

  let index = 2;
  while (taken.has(`${baseKey}_${index}`)) {
    index += 1;
  }
  return `${baseKey}_${index}`;
}

export async function createPharmacyCustomRole(input: {
  pharmacyId: string;
  nameAr: string;
  nameEn: string;
  baseRole: UserRole;
  allowedPages: Page[];
  permissions?: RolePermissionFlags;
}): Promise<PharmacyCustomRole> {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  if (!nameAr || !nameEn) {
    throw new Error("custom_role_name_required");
  }

  const pages =
    input.allowedPages.length > 0
      ? input.allowedPages
      : defaultPagesForCustomRoleTemplate(input.baseRole);
  if (pages.length === 0) {
    throw new Error("custom_role_pages_required");
  }

  const baseKey = slugifyCustomRoleKey(nameEn, nameAr);
  const roleKey = await ensureUniqueRoleKey(input.pharmacyId, baseKey);

  const payload = toSnakeCase({
    id: crypto.randomUUID(),
    pharmacyId: input.pharmacyId,
    roleKey,
    nameAr,
    nameEn,
    baseRole: input.baseRole,
    allowedPages: pages,
    permissions: normalizeRolePermissionFlags(input.baseRole, input.permissions || {}),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("pharmacy_custom_roles")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCustomRole(data as Record<string, unknown>);
}

export async function deletePharmacyCustomRole(id: string): Promise<void> {
  const { data: roleRow, error: loadError } = await supabase
    .from("pharmacy_custom_roles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !roleRow) {
    throw new Error("custom_role_not_found");
  }

  const role = normalizeCustomRole(roleRow as Record<string, unknown>);

  const [{ count: userCount }, { count: accountCount }] = await Promise.all([
    supabase
      .from("users")
      .select("uid", { count: "exact", head: true })
      .eq("pharmacy_id", role.pharmacyId)
      .eq("role", role.roleKey),
    supabase
      .from("pharmacy_login_accounts")
      .select("id", { count: "exact", head: true })
      .eq("pharmacy_id", role.pharmacyId)
      .eq("role", role.roleKey),
  ]);

  if ((userCount || 0) > 0 || (accountCount || 0) > 0) {
    throw new Error("custom_role_in_use");
  }

  const { error } = await supabase.from("pharmacy_custom_roles").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadPharmacyCustomRolesIntoScope(
  appUser: AppUser | null,
  branches: PharmacySettings[],
): Promise<PharmacyCustomRole[]> {
  if (!appUser) {
    setPharmacyCustomRoles([]);
    return [];
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

  const roles = await getPharmacyCustomRolesForPharmacies(pharmacyIds);
  setPharmacyCustomRoles(roles);
  return roles;
}
