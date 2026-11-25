import type { PharmacySupplier } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { getRows, subscribeTable } from "./dbHelpers";
import { stampPharmacy } from "./scope";
import { supabase } from "../supabaseClient";

function isMissingTableError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function getPharmacySuppliers(): Promise<PharmacySupplier[]> {
  try {
    return await getRows<PharmacySupplier>("pharmacy_suppliers", "updated_at", true, 500, undefined, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingTableError(message)) return [];
    throw error;
  }
}

export function subscribePharmacySuppliers(callback: (suppliers: PharmacySupplier[]) => void) {
  return subscribeTable<PharmacySupplier>(
    "pharmacy_suppliers",
    callback,
    "updated_at",
    true,
    500,
    undefined,
    true,
  );
}

export async function savePharmacySupplier(supplier: PharmacySupplier): Promise<PharmacySupplier> {
  const now = new Date().toISOString();
  const payload = stampPharmacy(
    toSnakeCase({
      ...supplier,
      isActive: supplier.isActive !== false,
      updatedAt: now,
      createdAt: supplier.createdAt || now,
    }),
  );
  const { data, error } = await supabase.from("pharmacy_suppliers").upsert(payload).select("*").single();
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
  return toCamelCase<PharmacySupplier>(data);
}

export async function deletePharmacySupplier(id: number): Promise<void> {
  const { error } = await supabase.from("pharmacy_suppliers").delete().eq("id", id);
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
}
