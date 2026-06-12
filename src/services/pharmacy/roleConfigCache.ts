import type { Page, PharmacyRoleConfig } from "../../types";
import type { RolePermissionFlags } from "../../utils/rolePermissions";

let pharmacyRoleConfigs: PharmacyRoleConfig[] = [];

export function setPharmacyRoleConfigs(configs: PharmacyRoleConfig[]) {
  pharmacyRoleConfigs = [...configs];
}

export function getPharmacyRoleConfigs() {
  return pharmacyRoleConfigs;
}

export function getPharmacyRoleConfig(
  roleKey: string,
  pharmacyId: string,
): PharmacyRoleConfig | undefined {
  const key = roleKey.trim().toLowerCase();
  return pharmacyRoleConfigs.find(
    (item) => item.roleKey === key && item.pharmacyId === pharmacyId,
  );
}

export type EffectiveRoleAccess = {
  allowedPages: Page[];
  permissions: RolePermissionFlags;
  isCustomized: boolean;
};
