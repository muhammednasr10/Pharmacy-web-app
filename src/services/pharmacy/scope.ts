import { ALL_BRANCHES_ID } from "../../constants/branches";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isSuperAdmin,
  normalizeAppUser,
} from "../../utils/roles";
import type { AppUser, Medicine } from "../../types";
import {
  getPharmacyCustomRoleByKey,
  setPharmacyCustomRoles,
} from "./customRoleCache";
import {
  getPharmacyRoleConfig,
  setPharmacyRoleConfigs,
} from "./roleConfigCache";
import { toSnakeCase } from "./mappers";

export {
  getPharmacyCustomRoleByKey,
  setPharmacyCustomRoles,
  getPharmacyRoleConfig,
  setPharmacyRoleConfigs,
};

// Active tenant scope for reads/writes. Super admin may set this to view a tenant.
let activePharmacyId: string | null = null;
let organizationBranchIds: string[] = [];
let currentAppUser: AppUser | null = null;

export function setActivePharmacy(pharmacyId: string | null) {
  activePharmacyId = pharmacyId;
}

export function getActivePharmacy() {
  return activePharmacyId;
}

export function setOrganizationBranchIds(branchIds: string[]) {
  organizationBranchIds = [...new Set(branchIds.filter(Boolean))];
}

export function getOrganizationBranchIds() {
  return organizationBranchIds;
}

export function setCurrentAppUser(user: AppUser | null) {
  currentAppUser = user ? normalizeAppUser(user) : null;
}

export function getCurrentAppUser() {
  return currentAppUser;
}

export { isSuperAdmin };

type PharmacyScopedQuery = {
  eq: (col: string, val: string) => unknown;
  in?: (col: string, vals: string[]) => unknown;
};

export function shouldQueryAllOrganizationBranches(appUser: AppUser | null): boolean {
  return (
    activePharmacyId === ALL_BRANCHES_ID &&
    organizationBranchIds.length > 0 &&
    (isOrgPharmacyAdmin(appUser) || isAccountant(appUser) || isSuperAdmin(appUser))
  );
}

export function applyPharmacyScopeFilter<T>(
  query: T,
  pharmacyIds?: string[],
  appUser: AppUser | null = currentAppUser,
): T {
  const scoped = query as PharmacyScopedQuery;
  const ids = [...new Set((pharmacyIds || []).filter(Boolean))];
  if (ids.length > 0) {
    if (ids.length === 1) {
      return scoped.eq("pharmacy_id", ids[0]) as T;
    }
    if (scoped.in) {
      return scoped.in("pharmacy_id", ids) as T;
    }
  }
  return applyPharmacyFilter(query, appUser);
}

export function applyPharmacyFilter<T>(
  query: T,
  appUser: AppUser | null = currentAppUser,
): T {
  const scoped = query as PharmacyScopedQuery;
  if (isSuperAdmin(appUser)) {
    if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
      return scoped.eq("pharmacy_id", activePharmacyId) as T;
    }
    if (activePharmacyId === ALL_BRANCHES_ID && organizationBranchIds.length > 0 && scoped.in) {
      return scoped.in("pharmacy_id", organizationBranchIds) as T;
    }
    const fallbackPharmacyId = appUser?.pharmacyId || "main";
    return scoped.eq("pharmacy_id", fallbackPharmacyId) as T;
  }

  if (shouldQueryAllOrganizationBranches(appUser)) {
    if (organizationBranchIds.length === 1) {
      return scoped.eq("pharmacy_id", organizationBranchIds[0]) as T;
    }
    if (scoped.in) {
      return scoped.in("pharmacy_id", organizationBranchIds) as T;
    }
  }

  const pharmacyId =
    activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID
      ? activePharmacyId
      : appUser?.pharmacyId;
  if (pharmacyId) {
    return scoped.eq("pharmacy_id", pharmacyId) as T;
  }
  return query;
}

export function resolveStampPharmacyId(): string {
  if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
    return activePharmacyId;
  }
  return currentAppUser?.pharmacyId || "main";
}

/** Pharmacy id used for read queries (inventory pagination, counts). */
export function resolveReadPharmacyId(appUser: AppUser | null = currentAppUser): string {
  if (shouldQueryAllOrganizationBranches(appUser) && organizationBranchIds.length === 1) {
    return organizationBranchIds[0];
  }

  if (isSuperAdmin(appUser)) {
    if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
      return activePharmacyId;
    }
    return appUser?.pharmacyId || "main";
  }

  if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
    return activePharmacyId;
  }

  return appUser?.pharmacyId || "main";
}

export function resolveHeldInvoicesPharmacyId(pharmacyId?: string): string | null {
  if (pharmacyId) return pharmacyId;
  if (activePharmacyId) return activePharmacyId;
  if (currentAppUser?.pharmacyId) return currentAppUser.pharmacyId;
  return "main";
}

export function stampPharmacy(payload: Record<string, any>): Record<string, any> {
  if (payload.pharmacy_id) {
    return { ...payload };
  }
  return { ...payload, pharmacy_id: resolveStampPharmacyId() };
}

export function prepareMedicinePayloadForPharmacy(
  medicine: Partial<Medicine>,
  pharmacyId: string,
): Record<string, any> {
  return {
    ...toSnakeCase({
      id: medicine.id,
      name_ar: medicine.name_ar,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      qty: medicine.qty,
      price: medicine.price,
      buyPrice: medicine.buyPrice,
      expiry: medicine.expiry,
    } as Partial<Medicine>),
    pharmacy_id: pharmacyId,
  };
}

export function prepareMedicinePayload(medicine: Partial<Medicine>): Record<string, any> {
  return stampPharmacy(
    toSnakeCase({
      id: medicine.id,
      name_ar: medicine.name_ar,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      qty: medicine.qty,
      price: medicine.price,
      buyPrice: medicine.buyPrice,
      expiry: medicine.expiry,
    } as Partial<Medicine>),
  );
}
