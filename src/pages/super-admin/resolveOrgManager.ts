import type { AppUser, PharmacySettings } from "../../types";
import { resolveOrganizationId } from "../../utils/branchLimits";

export type OrgManagerInfo = {
  name: string;
  phone: string;
  email: string;
};

/** Prefer org pharmacy_admin; fall back to any active org user with an email. */
export function resolveOrgManager(
  systemUsers: AppUser[],
  pharmacies: PharmacySettings[],
  pharmacy: PharmacySettings,
): OrgManagerInfo | null {
  const organizationId = resolveOrganizationId(pharmacy);
  const pharmacyIds = new Set(
    pharmacies
      .filter((row) => resolveOrganizationId(row) === organizationId)
      .map((row) => row.id),
  );

  const orgUsers = systemUsers.filter(
    (user) =>
      user.role !== "super_admin" &&
      user.isActive !== false &&
      user.pharmacyId &&
      pharmacyIds.has(user.pharmacyId),
  );

  const manager =
    orgUsers.find((user) => user.role === "pharmacy_admin") ||
    orgUsers.find((user) => user.role === "branch_manager") ||
    orgUsers[0] ||
    null;

  if (!manager) return null;

  const phoneFromUser =
    typeof (manager as AppUser & { phone?: string }).phone === "string"
      ? String((manager as AppUser & { phone?: string }).phone || "").trim()
      : "";

  return {
    name: manager.name?.trim() || manager.username || manager.email || "—",
    phone: phoneFromUser || pharmacy.phone?.trim() || "",
    email: manager.email?.trim() || manager.username || "",
  };
}
