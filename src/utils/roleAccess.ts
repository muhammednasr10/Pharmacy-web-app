import type { BuiltinUserRole, Page } from "../types";
import { getPharmacyCustomRoleByKey } from "../services/pharmacy/customRoleCache";
import { getPharmacyRoleConfig } from "../services/pharmacy/roleConfigCache";
import { getPlatformRoleDefault } from "../services/pharmacy/platformRoleDefaultsCache";
import {
  defaultPagesForBuiltinRole,
  defaultPermissionsByRole,
  normalizeRolePermissionFlags,
  type RolePermissionFlags,
} from "./rolePermissions";

const BUILTIN_ROLES = new Set<string>([
  "super_admin",
  "pharmacy_admin",
  "branch_manager",
  "cashier",
  "inventory",
  "accountant",
]);

export function isCustomRoleKey(role: string): boolean {
  return role.trim().toLowerCase().startsWith("custom_");
}

function isBuiltinRoleKey(role: string): role is BuiltinUserRole {
  return BUILTIN_ROLES.has(role);
}

const SQL_MIGRATIONS_PAGE: Page = "sqlMigrations";

/** تبويب حالة SQL اتشال من الواجهة — يُستبعد من كل الأدوار */
export function finalizeAllowedPagesForRole(_roleKey: string, pages: Page[]): Page[] {
  return pages.filter((page) => page !== SQL_MIGRATIONS_PAGE);
}

function finishRoleAccess(
  roleKey: string,
  access: { allowedPages: Page[]; permissions: RolePermissionFlags; isCustomized: boolean },
) {
  return {
    ...access,
    allowedPages: finalizeAllowedPagesForRole(roleKey, access.allowedPages),
  };
}

export function getEffectiveRoleAccess(
  roleKey: string,
  pharmacyId: string,
): { allowedPages: Page[]; permissions: RolePermissionFlags; isCustomized: boolean } {
  const role = roleKey.trim().toLowerCase();

  if (role === "super_admin") {
    return finishRoleAccess(roleKey, {
      allowedPages: defaultPagesForBuiltinRole("super_admin"),
      permissions: { ...defaultPermissionsByRole.super_admin },
      isCustomized: false,
    });
  }

  if (isCustomRoleKey(role)) {
    const custom = getPharmacyCustomRoleByKey(role, pharmacyId);
    if (custom) {
      const permissions = normalizeRolePermissionFlags(
        custom.baseRole,
        custom.permissions || {},
      );
      return finishRoleAccess(roleKey, {
        allowedPages: custom.allowedPages?.length
          ? custom.allowedPages
          : defaultPagesForBuiltinRole(custom.baseRole),
        permissions,
        isCustomized: true,
      });
    }
    const platformCustom = getPlatformRoleDefault(role);
    if (platformCustom) {
      return finishRoleAccess(roleKey, {
        allowedPages: platformCustom.allowedPages?.length
          ? platformCustom.allowedPages
          : defaultPagesForBuiltinRole(platformCustom.baseRole),
        permissions: normalizeRolePermissionFlags(
          platformCustom.baseRole,
          platformCustom.permissions || {},
        ),
        isCustomized: false,
      });
    }
    return finishRoleAccess(roleKey, {
      allowedPages: defaultPagesForBuiltinRole("cashier"),
      permissions: { ...defaultPermissionsByRole.cashier },
      isCustomized: false,
    });
  }

  if (isBuiltinRoleKey(role)) {
    const config = getPharmacyRoleConfig(role, pharmacyId);
    if (config) {
      return finishRoleAccess(roleKey, {
        allowedPages:
          config.allowedPages?.length > 0
            ? config.allowedPages
            : defaultPagesForBuiltinRole(role),
        permissions: normalizeRolePermissionFlags(role, config.permissions),
        isCustomized: true,
      });
    }
    const platformBuiltin = getPlatformRoleDefault(role);
    if (platformBuiltin) {
      return finishRoleAccess(roleKey, {
        allowedPages: platformBuiltin.allowedPages?.length
          ? platformBuiltin.allowedPages
          : defaultPagesForBuiltinRole(role),
        permissions: normalizeRolePermissionFlags(role, platformBuiltin.permissions),
        isCustomized: false,
      });
    }
    return finishRoleAccess(roleKey, {
      allowedPages: defaultPagesForBuiltinRole(role),
      permissions: { ...defaultPermissionsByRole[role] },
      isCustomized: false,
    });
  }

  return finishRoleAccess(roleKey, {
    allowedPages: defaultPagesForBuiltinRole("cashier"),
    permissions: { ...defaultPermissionsByRole.cashier },
    isCustomized: false,
  });
}

export function roleHasConfiguredPermission(
  roleKey: string,
  pharmacyId: string,
  permission: keyof RolePermissionFlags,
): boolean {
  const access = getEffectiveRoleAccess(roleKey, pharmacyId);
  return Boolean(access.permissions[permission]);
}
