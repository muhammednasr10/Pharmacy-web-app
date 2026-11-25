import type { BuiltinUserRole, Page, PlatformRoleDefault, UserRole } from "../../types";
import {
  defaultPagesForBuiltinRole,
  defaultPermissionsByRole,
  EDITABLE_BUILTIN_ROLES,
  normalizeRolePermissionFlags,
  type RolePermissionFlags,
} from "../../utils/rolePermissions";
import { defaultPagesForCustomRoleTemplate, slugifyCustomRoleKey } from "../../utils/customRolePages";
import { getRoleLabel } from "../../utils/roles";
import { toCamelCase, toSnakeCase } from "./mappers";
import { supabase } from "../supabaseClient";
import {
  getPlatformRoleDefaults as readPlatformRoleDefaultsCache,
  setPlatformRoleDefaults,
} from "./platformRoleDefaultsCache";
import { upsertPharmacyRoleConfig } from "./roleConfigService";
import { createPharmacyCustomRole } from "./customRoleService";

function normalizePlatformRoleDefault(row: Record<string, unknown>): PlatformRoleDefault {
  const camel = toCamelCase<PlatformRoleDefault>(row);
  const allowedPages = Array.isArray(camel.allowedPages)
    ? camel.allowedPages
    : Array.isArray(row.allowed_pages)
      ? row.allowed_pages
      : [];
  return {
    ...camel,
    id: String(camel.id ?? row.id ?? ""),
    roleKey: String(camel.roleKey ?? row.role_key ?? "")
      .trim()
      .toLowerCase(),
    kind: (camel.kind ?? row.kind) === "custom" ? "custom" : "builtin",
    nameAr: String(camel.nameAr ?? row.name_ar ?? "").trim(),
    nameEn: String(camel.nameEn ?? row.name_en ?? "").trim(),
    baseRole: (camel.baseRole ?? row.base_role ?? "cashier") as BuiltinUserRole,
    allowedPages: allowedPages as Page[],
    permissions: (camel.permissions ?? row.permissions ?? {}) as RolePermissionFlags,
    sortOrder: Number(camel.sortOrder ?? row.sort_order ?? 0) || 0,
    isActive: camel.isActive !== false && row.is_active !== false,
  };
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("platform_role_defaults") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function buildCodeBuiltinDefaults(): Omit<
  PlatformRoleDefault,
  "id" | "createdAt" | "updatedAt"
>[] {
  return EDITABLE_BUILTIN_ROLES.map((roleKey, index) => ({
    roleKey,
    kind: "builtin" as const,
    nameAr: getRoleLabel(roleKey, true),
    nameEn: getRoleLabel(roleKey, false),
    baseRole: roleKey,
    allowedPages: defaultPagesForBuiltinRole(roleKey),
    permissions: { ...defaultPermissionsByRole[roleKey] },
    sortOrder: index + 1,
    isActive: true,
  }));
}

function buildCodeDeliveryDefault(): Omit<PlatformRoleDefault, "id" | "createdAt" | "updatedAt"> {
  return {
    roleKey: "custom_delivery",
    kind: "custom",
    nameAr: "دليفرى",
    nameEn: "Delivery",
    baseRole: "cashier",
    allowedPages: defaultPagesForCustomRoleTemplate("cashier"),
    permissions: {},
    sortOrder: 100,
    isActive: true,
  };
}

export function getCachedPlatformRoleDefaults(): PlatformRoleDefault[] {
  return readPlatformRoleDefaultsCache();
}

export async function listPlatformRoleDefaults(options?: {
  ensureSeeded?: boolean;
}): Promise<PlatformRoleDefault[]> {
  const { data, error } = await supabase
    .from("platform_role_defaults")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("role_key", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      const fallback = [
        ...buildCodeBuiltinDefaults(),
        buildCodeDeliveryDefault(),
      ].map((row, index) => ({
        ...row,
        id: `code:${row.roleKey}`,
        sortOrder: row.sortOrder || index + 1,
      }));
      setPlatformRoleDefaults(fallback);
      return fallback;
    }
    throw new Error(error.message);
  }

  let rows = (data || []).map((row) => normalizePlatformRoleDefault(row as Record<string, unknown>));

  if ((options?.ensureSeeded !== false) && rows.length === 0) {
    rows = await seedPlatformRoleDefaultsFromCode();
  }

  setPlatformRoleDefaults(rows);
  return rows;
}

export async function seedPlatformRoleDefaultsFromCode(): Promise<PlatformRoleDefault[]> {
  const drafts = [...buildCodeBuiltinDefaults(), buildCodeDeliveryDefault()];
  const payload = drafts.map((row) =>
    toSnakeCase({
      id: crypto.randomUUID(),
      roleKey: row.roleKey,
      kind: row.kind,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      baseRole: row.baseRole,
      allowedPages: row.allowedPages,
      permissions: row.permissions,
      sortOrder: row.sortOrder,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("platform_role_defaults")
    .upsert(payload, { onConflict: "role_key" })
    .select("*");

  if (error) {
    if (isMissingTableError(error)) {
      const fallback = drafts.map((row) => ({ ...row, id: `code:${row.roleKey}` }));
      setPlatformRoleDefaults(fallback);
      return fallback;
    }
    throw new Error(error.message);
  }

  const rows = (data || []).map((row) => normalizePlatformRoleDefault(row as Record<string, unknown>));
  setPlatformRoleDefaults(rows);
  return rows;
}

export async function upsertPlatformRoleDefault(input: {
  id?: string;
  roleKey: string;
  kind: "builtin" | "custom";
  nameAr: string;
  nameEn: string;
  baseRole: BuiltinUserRole | UserRole;
  allowedPages: Page[];
  permissions: RolePermissionFlags;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<PlatformRoleDefault> {
  const roleKey = input.roleKey.trim().toLowerCase();
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  if (!roleKey || !nameAr || !nameEn) {
    throw new Error("platform_role_name_required");
  }
  if (!input.allowedPages.length) {
    throw new Error("platform_role_pages_required");
  }

  const baseRole = (input.baseRole || "cashier") as BuiltinUserRole;
  const payload = toSnakeCase({
    id: input.id || crypto.randomUUID(),
    roleKey,
    kind: input.kind,
    nameAr,
    nameEn,
    baseRole,
    allowedPages: input.allowedPages,
    permissions: normalizeRolePermissionFlags(baseRole, input.permissions || {}),
    sortOrder: input.sortOrder ?? (input.kind === "custom" ? 100 : 0),
    isActive: input.isActive !== false,
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("platform_role_defaults")
    .upsert(payload, { onConflict: "role_key" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const row = normalizePlatformRoleDefault(data as Record<string, unknown>);
  const next = [
    ...readPlatformRoleDefaultsCache().filter((item) => item.roleKey !== row.roleKey),
    row,
  ].sort((a, b) => a.sortOrder - b.sortOrder || a.roleKey.localeCompare(b.roleKey));
  setPlatformRoleDefaults(next);
  return row;
}

export async function createPlatformCustomRoleDefault(input: {
  nameAr: string;
  nameEn: string;
  baseRole: UserRole;
  allowedPages: Page[];
  permissions?: RolePermissionFlags;
}): Promise<PlatformRoleDefault> {
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  if (!nameAr || !nameEn) throw new Error("platform_role_name_required");

  const pages =
    input.allowedPages.length > 0
      ? input.allowedPages
      : defaultPagesForCustomRoleTemplate(input.baseRole);
  if (!pages.length) throw new Error("platform_role_pages_required");

  const existing = await listPlatformRoleDefaults({ ensureSeeded: true });
  const baseKey = slugifyCustomRoleKey(nameEn, nameAr);
  const taken = new Set(existing.map((row) => row.roleKey));
  let roleKey = baseKey;
  let index = 2;
  while (taken.has(roleKey)) {
    roleKey = `${baseKey}_${index}`;
    index += 1;
  }

  const maxSort = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0);
  return upsertPlatformRoleDefault({
    roleKey,
    kind: "custom",
    nameAr,
    nameEn,
    baseRole: input.baseRole as BuiltinUserRole,
    allowedPages: pages,
    permissions: input.permissions || {},
    sortOrder: maxSort + 1,
    isActive: true,
  });
}

export async function deletePlatformRoleDefault(roleKey: string): Promise<void> {
  const key = roleKey.trim().toLowerCase();
  if (!key.startsWith("custom_")) {
    throw new Error("platform_builtin_role_locked");
  }

  const { error } = await supabase.from("platform_role_defaults").delete().eq("role_key", key);
  if (error) throw new Error(error.message);

  setPlatformRoleDefaults(readPlatformRoleDefaultsCache().filter((row) => row.roleKey !== key));
}

/** Copy platform defaults into a newly created pharmacy. */
export async function seedPlatformRoleDefaultsToPharmacy(pharmacyId: string): Promise<void> {
  if (!pharmacyId) return;

  let defaults: PlatformRoleDefault[] = [];
  try {
    defaults = await listPlatformRoleDefaults({ ensureSeeded: true });
  } catch (error) {
    console.error("[platformRoleDefaults] list failed during seed", error);
    return;
  }

  const active = defaults.filter((row) => row.isActive !== false);
  for (const row of active) {
    try {
      if (row.kind === "builtin") {
        await upsertPharmacyRoleConfig({
          pharmacyId,
          roleKey: row.roleKey,
          allowedPages: row.allowedPages,
          permissions: row.permissions,
          labelAr: row.nameAr,
          labelEn: row.nameEn,
        });
      } else {
        await createPharmacyCustomRole({
          pharmacyId,
          nameAr: row.nameAr,
          nameEn: row.nameEn,
          baseRole: row.baseRole,
          allowedPages: row.allowedPages,
          permissions: row.permissions,
          isActive: true,
          roleKey: row.roleKey,
        });
      }
    } catch (error) {
      console.error(`[platformRoleDefaults] seed ${row.roleKey} failed`, error);
    }
  }
}
