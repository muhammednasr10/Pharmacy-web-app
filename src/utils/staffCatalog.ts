import { getDefaultLoginAccountDraft, parseLoginAccountRole } from "./roles";
import type { PharmacyLoginAccount } from "../types";

function normalizeEmailKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildTakenEmailSet(
  accounts: PharmacyLoginAccount[],
  extraTakenEmails: Iterable<string> = [],
): Set<string> {
  const taken = new Set<string>();
  for (const item of accounts) {
    const email = normalizeEmailKey(item.email || "");
    if (email) taken.add(email);
  }
  for (const raw of extraTakenEmails) {
    const email = normalizeEmailKey(raw || "");
    if (email) taken.add(email);
  }
  return taken;
}

/** Random readable password — different every call so each new draft is unique. */
export function generateUniqueLoginPassword(length = 10): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function suggestUniqueLoginEmail(
  role: string,
  accounts: PharmacyLoginAccount[],
  extraTakenEmails: Iterable<string> = [],
): string {
  const normalizedRole = parseLoginAccountRole(role);
  const base = getDefaultLoginAccountDraft(normalizedRole);
  const taken = buildTakenEmailSet(accounts, extraTakenEmails);
  const preferred = normalizeEmailKey(base.email);
  if (preferred && !taken.has(preferred)) return preferred;

  const localPart = (preferred.split("@")[0] || normalizedRole.replace(/^custom_/, "") || "user")
    .replace(/[^a-z0-9._-]/gi, "")
    .toLowerCase() || "user";
  const domain = preferred.includes("@") ? preferred.slice(preferred.indexOf("@")) : "@pharmacy.com";

  let index = 2;
  let email = `${localPart}${index}${domain}`;
  while (taken.has(email)) {
    index += 1;
    email = `${localPart}${index}${domain}`;
  }
  return email;
}

export function suggestLoginAccountDraft(
  accounts: PharmacyLoginAccount[],
  role: string,
  extraTakenEmails: Iterable<string> = [],
): { email: string; password: string } {
  return {
    email: suggestUniqueLoginEmail(role, accounts, extraTakenEmails),
    password: generateUniqueLoginPassword(),
  };
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
