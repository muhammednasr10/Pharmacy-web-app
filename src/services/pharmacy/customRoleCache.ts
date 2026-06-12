import type { PharmacyCustomRole } from "../../types";

let pharmacyCustomRoles: PharmacyCustomRole[] = [];

export function setPharmacyCustomRoles(roles: PharmacyCustomRole[]) {
  pharmacyCustomRoles = [...roles];
}

export function getPharmacyCustomRoles() {
  return pharmacyCustomRoles;
}

export function getPharmacyCustomRoleByKey(
  roleKey: string,
  pharmacyId?: string,
): PharmacyCustomRole | undefined {
  const key = roleKey.trim().toLowerCase();
  return pharmacyCustomRoles.find((role) => {
    if (role.roleKey !== key) return false;
    if (!pharmacyId) return true;
    return role.pharmacyId === pharmacyId;
  });
}
