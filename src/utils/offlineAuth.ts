import { getStoredLoginProfile } from "../services/appAuthSession";
import { normalizeAppUser } from "./roles";
import type { AppUser } from "../types";

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function appUserFromStoredProfile(uid?: string): AppUser | null {
  const cached = getStoredLoginProfile();
  if (!cached) return null;
  if (uid && cached.uid !== uid) return null;
  if (cached.isActive === false) return null;

  return normalizeAppUser({
    uid: cached.uid,
    email: cached.email,
    name: cached.name,
    role: cached.role as AppUser["role"],
    pharmacyId: cached.pharmacyId,
    isActive: cached.isActive,
  });
}

export function canTrustOfflinePharmacyAccess(pharmacyId: string): boolean {
  const cached = getStoredLoginProfile();
  if (!cached || cached.isActive === false) return false;
  if (!pharmacyId) return true;
  return cached.pharmacyId === pharmacyId;
}
