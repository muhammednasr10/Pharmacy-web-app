export const ACTIVE_PAGE_STORAGE_KEY = "pharmacy_active_page";
/** Prevents remount/hard-nav from re-applying last-page restore in the same tab. */
export const NAV_RESTORED_ONCE_KEY = "pharmacy_nav_restored_once";

export function clearSessionNavigationState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
  sessionStorage.removeItem(NAV_RESTORED_ONCE_KEY);
}
