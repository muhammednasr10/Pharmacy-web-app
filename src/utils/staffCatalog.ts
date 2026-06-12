import { getDefaultLoginAccountDraft, parseLoginAccountRole } from "./roles";
import type { PharmacyLoginAccount } from "../types";

export function suggestLoginAccountDraft(
  accounts: PharmacyLoginAccount[],
  role: string,
): { email: string; password: string } {
  const normalizedRole = parseLoginAccountRole(role);
  const base = getDefaultLoginAccountDraft(normalizedRole);
  const sameRole = accounts.filter(
    (item) => parseLoginAccountRole(item.role) === normalizedRole,
  );
  if (sameRole.length === 0) return base;

  const slug = normalizedRole.replace(/^custom_/, "") || "user";
  let index = sameRole.length + 1;
  let email = `${slug}${index}@pharmacy.com`;
  const taken = new Set(sameRole.map((item) => item.email.trim().toLowerCase()));
  while (taken.has(email)) {
    index += 1;
    email = `${slug}${index}@pharmacy.com`;
  }
  return { email, password: base.password };
}

export function pickCatalogAccountForRole(
  accounts: PharmacyLoginAccount[],
  role: string,
): PharmacyLoginAccount | undefined {
  const normalizedRole = parseLoginAccountRole(role);
  const matches = accounts.filter((item) => parseLoginAccountRole(item.role) === normalizedRole);
  if (matches.length === 0) return undefined;

  const statusRank: Record<PharmacyLoginAccount["status"], number> = {
    approved: 0,
    pending: 1,
    rejected: 2,
  };

  return [...matches].sort((a, b) => {
    const byStatus = statusRank[a.status] - statusRank[b.status];
    if (byStatus !== 0) return byStatus;
    return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
  })[0];
}
