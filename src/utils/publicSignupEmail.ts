import { PUBLIC_SIGNUP_EMAIL_DOMAIN } from "../config/brand";

/** Local-part only (before @) for the register email field. */
export function signupEmailLocalPart(email: string): string {
  const raw = email.trim().toLowerCase();
  if (!raw) return "";
  const at = raw.indexOf("@");
  return at === -1 ? raw : raw.slice(0, at);
}

/**
 * Build a public signup email ending with @victory.com.
 * Strips any other domain the user typed.
 */
export function normalizePublicSignupEmail(input: string): string {
  const local = signupEmailLocalPart(input)
    .replace(/[^a-z0-9._+-]/gi, "")
    .replace(/^\.+|\.+$/g, "");
  if (!local) return "";
  return `${local.toLowerCase()}@${PUBLIC_SIGNUP_EMAIL_DOMAIN}`;
}

export function isPublicSignupEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${PUBLIC_SIGNUP_EMAIL_DOMAIN}`) && normalized.indexOf("@") > 0;
}
