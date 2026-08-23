/** Default brand logo served from /public — not bundled in JS. */
export const DEFAULT_APP_LOGO_URL = "/victory-logo.png";

export function isInlineLogoSource(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("blob:");
}

/** UI + PDF logo source: inline upload, static path, or default PNG. */
export function resolveAppLogoUrl(logoBase64?: string | null): string {
  const trimmed = logoBase64?.trim();
  if (
    trimmed &&
    (isInlineLogoSource(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("http"))
  ) {
    return trimmed;
  }
  return DEFAULT_APP_LOGO_URL;
}
