import { supabase } from "../supabaseClient";
import type { StockMovement } from "../../types";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter } from "./scope";
import { getRows, subscribeTable } from "./dbHelpers";

export async function getStockMovements(): Promise<StockMovement[]> {
  return getRows<StockMovement>("stock_movements", "created_at", false, 100, undefined, true);
}

export async function getStockMovementsForMedicine(
  medicineId: number,
  pharmacyId?: string,
): Promise<StockMovement[]> {
  let query = supabase
    .from("stock_movements")
    .select("*")
    .eq("medicine_id", medicineId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (pharmacyId) {
    query = query.eq("pharmacy_id", pharmacyId);
  } else {
    query = applyPharmacyFilter(query);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getStockMovementsForMedicine error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<StockMovement>(row));
}

export function subscribeStockMovements(callback: (movements: StockMovement[]) => void) {
  return subscribeTable<StockMovement>(
    "stock_movements",
    callback,
    "created_at",
    false,
    100,
    undefined,
    true,
  );
}
