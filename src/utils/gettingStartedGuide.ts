const STORAGE_PREFIX = "pharmacy_getting_started_dismissed:";

export function gettingStartedDismissStorageKey(pharmacyId?: string | null): string {
  return `${STORAGE_PREFIX}${pharmacyId?.trim() || "default"}`;
}

export function isGettingStartedDismissed(pharmacyId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(gettingStartedDismissStorageKey(pharmacyId)) === "1";
  } catch {
    return false;
  }
}

export function setGettingStartedDismissed(
  pharmacyId: string | null | undefined,
  dismissed: boolean,
): void {
  if (typeof window === "undefined") return;
  const key = gettingStartedDismissStorageKey(pharmacyId);
  try {
    if (dismissed) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / private mode
  }
}
