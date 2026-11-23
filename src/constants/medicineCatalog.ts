/** Above this count, inventory requires a search/filter before listing rows */
export const LARGE_MEDICINE_CATALOG = 500;

/** Rows rendered per inventory / reorder table page */
export const MEDICINE_TABLE_PAGE_SIZE = 50;

/** Debounce full medicine refetch after realtime DB changes (ms) */
export const MEDICINES_REALTIME_REFETCH_MS = 2500;

/** Debounce offline POS medicine snapshot writes (ms) */
export const OFFLINE_MEDICINES_CACHE_MS = 4000;

/** Max medicines kept in IndexedDB for offline POS on large catalogs */
export const OFFLINE_POS_MEDICINES_CACHE_MAX = 2500;

/** In-stock pages to prefetch into the offline POS cache while online */
export const OFFLINE_POS_STOCK_SEED_PAGES = 40;
