const STORAGE_PREFIX = "pharmacy_offline_recent_barcodes:";
const MAX_RECENT = 80;

function storageKey(pharmacyId: string) {
  return `${STORAGE_PREFIX}${pharmacyId}`;
}

export function readRecentBarcodes(pharmacyId: string): string[] {
  if (!pharmacyId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(pharmacyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value || "").trim()).filter(Boolean).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentBarcodes(pharmacyId: string, barcodes: string[]) {
  if (!pharmacyId || typeof localStorage === "undefined") return;
  const incoming = barcodes.map((code) => String(code || "").trim()).filter(Boolean);
  if (incoming.length === 0) return;
  const merged = [...incoming, ...readRecentBarcodes(pharmacyId)];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const code of merged) {
    if (seen.has(code)) continue;
    seen.add(code);
    unique.push(code);
    if (unique.length >= MAX_RECENT) break;
  }
  localStorage.setItem(storageKey(pharmacyId), JSON.stringify(unique));
}
