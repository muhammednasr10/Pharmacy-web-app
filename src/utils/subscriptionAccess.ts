import type { AppUser } from "../types";
import { isSuperAdmin } from "./roles";

/** Expired subscription: view existing data only (not super admin). */
export function isSubscriptionWriteBlocked(
  appUser: AppUser | null | undefined,
  isSubscriptionExpired: boolean,
): boolean {
  return isSubscriptionExpired && !isSuperAdmin(appUser);
}
