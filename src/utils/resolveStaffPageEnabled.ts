import { parseSubscriptionTier } from "../config/subscriptionTiers";
import type { PharmacySettings } from "../types";
import { resolvePharmacyAddonFlags } from "./subscriptionLimitChange";

/** True when the pharmacy is subscribed to the Staff pages addon. */
export function resolveStaffPageEnabled(
  pharmacySettings: PharmacySettings | null | undefined,
): boolean {
  return resolvePharmacyAddonFlags(
    pharmacySettings,
    parseSubscriptionTier(
      pharmacySettings?.subscriptionTier || pharmacySettings?.subscriptionPlan,
    ),
  ).staffAddon;
}
