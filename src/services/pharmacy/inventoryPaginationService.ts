import { supabase } from "../supabaseClient";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter, resolveReadPharmacyId } from "./scope";
import type { ActivityLog, Medicine, StockMovement } from "../../types";
import { formatDateInput } from "../../utils/date";

export const INVENTORY_PAGE_SIZE = 50;
export const MOVEMENTS_PAGE_SIZE = 40;
export const STOCK_COUNT_LOG_PAGE_SIZE = 20;

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type StockCatalogFilter = "all" | "low" | "expiring" | "expired";

export type MedicinesPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  stockFilter?: StockCatalogFilter;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  /** POS / sellable lists — only medicines with qty > 0 */
  inStockOnly?: boolean;
  /** When set, limits the query to these pharmacy branches (overrides active scope). */
  pharmacyIds?: string[];
};

export type StockMovementsPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  typeFilter?: string;
  fromDate?: string;
  toDate?: string;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/** PostgREST requires quoted ilike values for non-ASCII / wildcard patterns. */
function quoteIlikePattern(pattern: string): string {
  return `"${pattern.replace(/"/g, '""')}"`;
}

function applyMedicineSearch<T extends { or: (filters: string) => T }>(
  query: T,
  search?: string,
): T {
  const term = search?.trim();
  if (!term) return query;
  const pattern = quoteIlikePattern(`%${escapeIlike(term)}%`);
  return query.or(
    [
      `name_ar.ilike.${pattern}`,
      `name_en.ilike.${pattern}`,
      `barcode.ilike.${pattern}`,
      `active_ingredient.ilike.${pattern}`,
    ].join(","),
  );
}

type StockFilterQuery = {
  lte: (column: string, value: number | string) => StockFilterQuery;
  lt: (column: string, value: string) => StockFilterQuery;
  gte: (column: string, value: string) => StockFilterQuery;
};

function applyStockCatalogFilter<T extends StockFilterQuery>(
  query: T,
  stockFilter: StockCatalogFilter,
  lowStockThreshold: number,
  expiringSoonDays: number,
): T {
  if (stockFilter === "low") {
    return query.lte("qty", Math.max(0, lowStockThreshold)) as T;
  }

  const today = formatDateInput(new Date());
  if (stockFilter === "expired") {
    return query.lt("expiry", today) as T;
  }

  if (stockFilter === "expiring") {
    const limit = new Date();
    limit.setDate(limit.getDate() + Math.max(1, expiringSoonDays));
    return query.gte("expiry", today).lte("expiry", formatDateInput(limit)) as T;
  }

  return query;
}

async function countMedicinesForPage(
  pharmacyId: string,
  query: MedicinesPageQuery,
  stockFilter: StockCatalogFilter,
  lowStockThreshold: number,
  expiringSoonDays: number,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("count_pharmacy_medicines", {
    p_pharmacy_id: pharmacyId,
    p_search: query.search?.trim() || null,
    p_stock_filter: stockFilter,
    p_low_stock_threshold: lowStockThreshold,
    p_expiring_soon_days: expiringSoonDays,
    p_in_stock_only: query.inStockOnly ?? false,
  });

  if (error) {
    console.warn("count_pharmacy_medicines RPC error:", error.message);
    return null;
  }

  return Number(data ?? 0);
}

type FetchMedicinesPageRpcRow = Record<string, unknown>;

async function fetchMedicinesPageViaRpc(
  pharmacyId: string,
  query: MedicinesPageQuery,
  page: number,
  pageSize: number,
  stockFilter: StockCatalogFilter,
  lowStockThreshold: number,
  expiringSoonDays: number,
): Promise<PaginatedResult<Medicine> | null> {
  const { data, error } = await supabase.rpc("fetch_pharmacy_medicines_page", {
    p_pharmacy_id: pharmacyId,
    p_page: page,
    p_page_size: pageSize,
    p_search: query.search?.trim() || null,
    p_stock_filter: stockFilter,
    p_low_stock_threshold: lowStockThreshold,
    p_expiring_soon_days: expiringSoonDays,
    p_in_stock_only: query.inStockOnly ?? false,
  });

  if (error) {
    if (!error.message.includes("fetch_pharmacy_medicines_page")) {
      console.warn("fetch_pharmacy_medicines_page RPC error:", error.message);
    }
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const payload = data as { total?: unknown; rows?: unknown };
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row) => toCamelCase<Medicine>(row as FetchMedicinesPageRpcRow))
    : [];

  return {
    rows,
    total: Number(payload.total ?? rows.length),
    page,
    pageSize,
  };
}

export async function fetchMedicinesPage(
  query: MedicinesPageQuery = {},
): Promise<PaginatedResult<Medicine>> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, Math.min(query.pageSize || INVENTORY_PAGE_SIZE, 200));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const stockFilter = query.stockFilter || "all";
  const lowStockThreshold = query.lowStockThreshold ?? 10;
  const expiringSoonDays = query.expiringSoonDays ?? 90;
  const pharmacyId = resolveReadPharmacyId();
  const scopedPharmacyIds = [...new Set((query.pharmacyIds || []).filter(Boolean))];
  const rpcPharmacyId =
    scopedPharmacyIds.length === 1
      ? scopedPharmacyIds[0]
      : scopedPharmacyIds.length === 0
        ? pharmacyId
        : "";

  if (rpcPharmacyId) {
    const rpcResult = await fetchMedicinesPageViaRpc(
      rpcPharmacyId,
      query,
      page,
      pageSize,
      stockFilter,
      lowStockThreshold,
      expiringSoonDays,
    );
    if (rpcResult) return rpcResult;
  }

  let request = supabase.from("medicines").select("*");
  if (scopedPharmacyIds.length === 1) {
    request = request.eq("pharmacy_id", scopedPharmacyIds[0]);
  } else if (scopedPharmacyIds.length > 1) {
    request = request.in("pharmacy_id", scopedPharmacyIds);
  } else {
    request = applyPharmacyFilter(request as never) as typeof request;
  }
  request = applyMedicineSearch(request, query.search);
  request = applyStockCatalogFilter(request, stockFilter, lowStockThreshold, expiringSoonDays);

  if (query.inStockOnly) {
    request = request.gt("qty", 0);
  }

  const [{ data, error }, rpcTotal] = await Promise.all([
    request.order("id", { ascending: true }).range(from, to),
    scopedPharmacyIds.length === 1
      ? countMedicinesForPage(scopedPharmacyIds[0], query, stockFilter, lowStockThreshold, expiringSoonDays)
      : scopedPharmacyIds.length === 0
        ? countMedicinesForPage(pharmacyId, query, stockFilter, lowStockThreshold, expiringSoonDays)
        : Promise.resolve(null),
  ]);

  if (error) {
    console.error("fetchMedicinesPage error:", error.message);
    throw new Error(error.message);
  }

  let total = rpcTotal;
  if (total === null) {
    total = (data || []).length;
  }

  return {
    rows: (data || []).map((row) => toCamelCase<Medicine>(row)),
    total,
    page,
    pageSize,
  };
}

function applyMovementSearch<T extends { or: (filters: string) => T }>(
  query: T,
  search?: string,
): T {
  const term = search?.trim();
  if (!term) return query;
  const pattern = quoteIlikePattern(`%${escapeIlike(term)}%`);
  return query.or(
    [
      `medicine_name_ar.ilike.${pattern}`,
      `medicine_name_en.ilike.${pattern}`,
      `barcode.ilike.${pattern}`,
      `invoice_number.ilike.${pattern}`,
      `return_number.ilike.${pattern}`,
      `purchase_number.ilike.${pattern}`,
      `user_name.ilike.${pattern}`,
    ].join(","),
  );
}

export async function fetchStockMovementsPage(
  query: StockMovementsPageQuery = {},
): Promise<PaginatedResult<StockMovement>> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, Math.min(query.pageSize || MOVEMENTS_PAGE_SIZE, 200));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("stock_movements").select("*", { count: "exact" });
  request = applyPharmacyFilter(request);
  request = applyMovementSearch(request, query.search);

  if (query.typeFilter && query.typeFilter !== "all") {
    request = request.eq("type", query.typeFilter);
  }

  if (query.fromDate) {
    request = request.gte("created_at", `${query.fromDate}T00:00:00`);
  }

  if (query.toDate) {
    request = request.lte("created_at", `${query.toDate}T23:59:59`);
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("fetchStockMovementsPage error:", error.message);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data || []).map((row) => toCamelCase<StockMovement>(row)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export type StockCountLogsPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

function applyActivityLogSearch<T extends { or: (filters: string) => T }>(
  query: T,
  search?: string,
): T {
  const term = search?.trim();
  if (!term) return query;
  const pattern = quoteIlikePattern(`%${escapeIlike(term)}%`);
  return query.or(
    [`title.ilike.${pattern}`, `description.ilike.${pattern}`, `user_name.ilike.${pattern}`].join(
      ",",
    ),
  );
}

export async function fetchStockCountLogsPage(
  query: StockCountLogsPageQuery = {},
): Promise<PaginatedResult<ActivityLog>> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.max(1, Math.min(query.pageSize || STOCK_COUNT_LOG_PAGE_SIZE, 100));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("activity_logs").select("*", { count: "exact" }).eq("type", "stock_count");
  request = applyPharmacyFilter(request);
  request = applyActivityLogSearch(request, query.search);

  if (query.fromDate) {
    request = request.gte("created_at", `${query.fromDate}T00:00:00`);
  }

  if (query.toDate) {
    request = request.lte("created_at", `${query.toDate}T23:59:59`);
  }

  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("fetchStockCountLogsPage error:", error.message);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data || []).map((row) => toCamelCase<ActivityLog>(row)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function fetchStockCountSessionMovements(createdAt: string): Promise<StockMovement[]> {
  const anchor = new Date(createdAt);
  if (Number.isNaN(anchor.getTime())) return [];

  const start = new Date(anchor);
  start.setMinutes(start.getMinutes() - 10);
  const end = new Date(anchor);
  end.setSeconds(end.getSeconds() + 30);

  let request = supabase
    .from("stock_movements")
    .select("*")
    .eq("type", "stock_count")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());
  request = applyPharmacyFilter(request);

  const { data, error } = await request.order("medicine_name_ar", { ascending: true });

  if (error) {
    console.error("fetchStockCountSessionMovements error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<StockMovement>(row));
}

export async function lookupInventoryMedicineById(
  medicineId: number | string,
): Promise<Medicine | null> {
  const id = String(medicineId ?? "").trim();
  if (!id || id === "0") return null;

  let request = supabase.from("medicines").select("*").eq("id", id).limit(1);
  request = applyPharmacyFilter(request);

  const { data, error } = await request.maybeSingle();

  if (error) {
    console.error("lookupInventoryMedicineById error:", error.message);
    return null;
  }

  return data ? toCamelCase<Medicine>(data) : null;
}

/** Resolve a return line to a warehouse row without loading the full catalog. */
export async function lookupInventoryMedicineForReturn(
  medicineId: number | string,
  barcode?: string,
): Promise<Medicine | null> {
  const byId = await lookupInventoryMedicineById(medicineId);
  if (byId) return byId;

  const code = String(barcode ?? "").trim();
  if (!code) return null;
  return lookupInventoryMedicineByBarcode(code);
}

export async function lookupInventoryMedicineByBarcode(barcode: string): Promise<Medicine | null> {
  const code = String(barcode ?? "").trim();
  if (!code) return null;

  let request = supabase.from("medicines").select("*").eq("barcode", code).limit(1);
  request = applyPharmacyFilter(request);

  const { data, error } = await request.maybeSingle();

  if (error) {
    console.error("lookupInventoryMedicineByBarcode error:", error.message);
    return null;
  }

  return data ? toCamelCase<Medicine>(data) : null;
}

export async function searchInventoryMedicines(
  search: string,
  limit = 8,
  inStockOnly = false,
): Promise<Medicine[]> {
  const term = search.trim();
  if (!term) return [];

  let request = supabase.from("medicines").select("*").limit(Math.max(1, Math.min(limit, 50)));
  request = applyPharmacyFilter(request);
  request = applyMedicineSearch(request, term);

  if (inStockOnly) {
    request = request.gt("qty", 0);
  }

  const { data, error } = await request.order("name_ar", { ascending: true });

  if (error) {
    console.error("searchInventoryMedicines error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Medicine>(row));
}
