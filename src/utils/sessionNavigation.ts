export const ACTIVE_PAGE_STORAGE_KEY = "pharmacy_active_page";

export function clearSessionNavigationState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
}
