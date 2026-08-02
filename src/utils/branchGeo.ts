export function parseBranchGeoField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBranchGeoField(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}
