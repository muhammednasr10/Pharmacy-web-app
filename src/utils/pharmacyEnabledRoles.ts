import type { PharmacyCustomRole, PharmacySettings, PlatformRoleDefault } from "../types";
import { EDITABLE_BUILTIN_ROLES } from "./rolePermissions";
import { getRoleLabel, isOrgPharmacyAdmin, isSuperAdmin } from "./roles";
import type { AppUser } from "../types";

/** Always on — cannot be disabled by the pharmacy manager. */
export const LOCKED_PHARMACY_ROLE_KEYS = ["pharmacy_admin"] as const;

export type PharmacyRoleToggleRow = {
  roleKey: string;
  label: string;
  kind: "builtin" | "custom";
  locked: boolean;
  /** Custom role row id when already present on the pharmacy. */
  customRoleId?: string;
  /** Platform default template (for customs not yet created on this pharmacy). */
  platformDefault?: PlatformRoleDefault;
  summary?: string;
};

export function normalizeEnabledRoleKeys(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const keys = value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  return keys.length > 0 ? [...new Set(keys)] : null;
}

export function listSelectableBuiltinRoleKeys(appUser: AppUser | null | undefined): string[] {
  return EDITABLE_BUILTIN_ROLES.filter((roleKey) =>
    isOrgPharmacyAdmin(appUser) && !isSuperAdmin(appUser) ? roleKey !== "pharmacy_admin" : true,
  );
}

export function buildAvailablePharmacyRoleKeys(params: {
  appUser: AppUser | null | undefined;
  pharmacyId: string;
  customRoles: PharmacyCustomRole[];
  platformDefaults?: PlatformRoleDefault[];
}): string[] {
  const builtins = [
    ...LOCKED_PHARMACY_ROLE_KEYS,
    ...listSelectableBuiltinRoleKeys(params.appUser),
  ];
  const customKeys = params.customRoles
    .filter((role) => role.pharmacyId === params.pharmacyId && role.isActive !== false)
    .map((role) => role.roleKey);
  const platformCustomKeys = (params.platformDefaults || [])
    .filter((row) => row.kind === "custom" && row.isActive !== false)
    .map((row) => row.roleKey);
  return [...new Set([...builtins, ...customKeys, ...platformCustomKeys])];
}

export function resolvePharmacyEnabledRoleKeys(params: {
  settings?: Pick<PharmacySettings, "enabledRoleKeys"> | null;
  availableRoleKeys: string[];
}): string[] {
  const available = [...new Set(params.availableRoleKeys.map((key) => key.trim().toLowerCase()))].filter(
    Boolean,
  );
  const stored = normalizeEnabledRoleKeys(params.settings?.enabledRoleKeys);
  const locked = LOCKED_PHARMACY_ROLE_KEYS.map((key) => key);
  if (!stored) {
    return [...new Set([...locked, ...available])];
  }
  const enabled = stored.filter((key) => available.includes(key) || locked.includes(key as (typeof LOCKED_PHARMACY_ROLE_KEYS)[number]));
  return [...new Set([...locked, ...enabled])];
}

export function isPharmacyRoleEnabled(
  roleKey: string,
  enabledRoleKeys: string[] | null | undefined,
  availableRoleKeys: string[],
): boolean {
  const key = roleKey.trim().toLowerCase();
  if ((LOCKED_PHARMACY_ROLE_KEYS as readonly string[]).includes(key)) return true;
  const resolved = resolvePharmacyEnabledRoleKeys({
    settings: { enabledRoleKeys: enabledRoleKeys ?? null },
    availableRoleKeys,
  });
  return resolved.includes(key);
}

export function buildPharmacyRoleToggleRows(params: {
  isArabic: boolean;
  appUser: AppUser | null | undefined;
  pharmacyId: string;
  customRoles: PharmacyCustomRole[];
  platformDefaults?: PlatformRoleDefault[];
}): PharmacyRoleToggleRow[] {
  const rows: PharmacyRoleToggleRow[] = [];

  for (const roleKey of LOCKED_PHARMACY_ROLE_KEYS) {
    rows.push({
      roleKey,
      label: getRoleLabel(roleKey, params.isArabic),
      kind: "builtin",
      locked: true,
    });
  }

  for (const roleKey of listSelectableBuiltinRoleKeys(params.appUser)) {
    rows.push({
      roleKey,
      label: getRoleLabel(roleKey, params.isArabic),
      kind: "builtin",
      locked: false,
    });
  }

  const pharmacyCustoms = params.customRoles.filter(
    (role) => role.pharmacyId === params.pharmacyId && role.isActive !== false,
  );
  const seenCustom = new Set(pharmacyCustoms.map((role) => role.roleKey));

  for (const role of pharmacyCustoms) {
    rows.push({
      roleKey: role.roleKey,
      label: params.isArabic ? role.nameAr : role.nameEn,
      kind: "custom",
      locked: false,
      customRoleId: role.id,
    });
  }

  for (const platform of params.platformDefaults || []) {
    if (platform.kind !== "custom" || platform.isActive === false) continue;
    if (seenCustom.has(platform.roleKey)) continue;
    rows.push({
      roleKey: platform.roleKey,
      label: params.isArabic ? platform.nameAr : platform.nameEn,
      kind: "custom",
      locked: false,
      platformDefault: platform,
    });
  }

  return rows;
}

export function withToggledPharmacyRoleKey(params: {
  currentEnabled: string[];
  availableRoleKeys: string[];
  roleKey: string;
  enabled: boolean;
}): string[] {
  const key = params.roleKey.trim().toLowerCase();
  if ((LOCKED_PHARMACY_ROLE_KEYS as readonly string[]).includes(key)) {
    return resolvePharmacyEnabledRoleKeys({
      settings: { enabledRoleKeys: params.currentEnabled },
      availableRoleKeys: params.availableRoleKeys,
    });
  }
  const next = new Set(
    resolvePharmacyEnabledRoleKeys({
      settings: { enabledRoleKeys: params.currentEnabled },
      availableRoleKeys: params.availableRoleKeys,
    }),
  );
  if (params.enabled) next.add(key);
  else next.delete(key);
  for (const locked of LOCKED_PHARMACY_ROLE_KEYS) next.add(locked);
  return [...next];
}
