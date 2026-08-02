import { supabase } from "../supabaseClient";
import type { PharmacyCost } from "../../types";
import { toSnakeCase } from "./mappers";
import { stampPharmacy } from "./scope";
import { getRows, subscribeTable } from "./dbHelpers";

function normalizePharmacyCost(row: PharmacyCost): PharmacyCost {
  const id = Number(row.id) || Date.now();
  const costNumber = String(row.costNumber ?? "").trim();

  return {
    ...row,
    id,
    costNumber: costNumber || `COST-${id}`,
    title: String(row.title ?? "").trim(),
    category: String(row.category ?? "other"),
    amount: Number(row.amount) || 0,
    paymentMethod: String(row.paymentMethod ?? "cash"),
    notes: String(row.notes ?? ""),
  };
}

export async function getPharmacyCosts(): Promise<PharmacyCost[]> {
  const rows = await getRows<PharmacyCost>(
    "pharmacy_costs",
    "created_at",
    false,
    500,
    undefined,
    true,
  );
  return rows.map(normalizePharmacyCost);
}

export function subscribePharmacyCosts(callback: (costs: PharmacyCost[]) => void) {
  return subscribeTable<PharmacyCost>(
    "pharmacy_costs",
    (rows) => callback(rows.map(normalizePharmacyCost)),
    "created_at",
    false,
    500,
    undefined,
    true,
  );
}

export async function savePharmacyCost(cost: PharmacyCost) {
  const payload = stampPharmacy(toSnakeCase(cost));
  const { error } = await supabase.from("pharmacy_costs").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePharmacyCost(id: number, updates: Partial<PharmacyCost>) {
  const payload = stampPharmacy(toSnakeCase(updates));
  const { error } = await supabase.from("pharmacy_costs").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyCost(id: number) {
  const { error } = await supabase.from("pharmacy_costs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
