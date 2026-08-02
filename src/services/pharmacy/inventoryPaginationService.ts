import { supabase } from "../supabaseClient";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter } from "./scope";
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

function applyMedicineSearch<T extends { or: (filters: string) => T }>(
  query: T,
  search?: string,
): T {
  const term = search?.trim();
  if (!term) return query;
  const pattern = `%${escapeIlike(term)}%`;
  return query.or(
    [
      `name_ar.ilike.${pattern}`,
      `name_en.ilike.${pattern}`,
      `barcode.ilike.${pattern}`,
      `active_ingredient.ilike.${pattern}`,
    ].join(","),
  );
}

function applyStockCatalogFilter(
  query: ReturnType<typeof supabase.from>,
  stockFilter: StockCatalogFilter,
  lowStockThreshold: number,
  expiringSoonDays: number,
) {
  if (stockFilter === "low") {
    return query.lte("qty", Math.max(0, lowStockThreshold));
  }

  const today = formatDateInput(new Date());
  if (stockFilter === "expired") {
    return query.lt("expiry", today);
  }

  if (stockFilter === "expiring") {
    const limit = new Date();
    limit.setDate(limit.getDate() + Math.max(1, expiringSoonDays));
    return query.gte("expiry", today).lte("expiry", formatDateInput(limit));
  }

  return query;
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

  let request = supabase.from("medicines").select("*", { count: "exact" });
  request = applyPharmacyFilter(request);
  request = applyMedicineSearch(request, query.search);
  request = applyStockCatalogFilter(request, stockFilter, lowStockThreshold, expiringSoonDays);

  if (query.inStockOnly) {
    request = request.gt("qty", 0);
  }

  const { data, error, count } = await request.order("id", { ascending: true }).range(from, to);

  if (error) {
    console.error("fetchMedicinesPage error:", error.message);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data || []).map((row) => toCamelCase<Medicine>(row)),
    total: count ?? 0,
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
  const pattern = `%${escapeIlike(term)}%`;
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
  const pattern = `%${escapeIlike(term)}%`;
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
