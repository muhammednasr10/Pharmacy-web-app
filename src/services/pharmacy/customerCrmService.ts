import type { CrmCustomer, CustomerActivity } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { getRows, subscribeTable } from "./dbHelpers";
import { stampPharmacy } from "./scope";
import { supabase } from "../supabaseClient";

function isMissingTableError(message: string) {
  return message.includes("does not exist") || message.includes("schema cache");
}

export async function getCrmCustomers(): Promise<CrmCustomer[]> {
  try {
    return await getRows<CrmCustomer>("customers", "updated_at", true, 500, undefined, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingTableError(message)) return [];
    throw error;
  }
}

export function subscribeCrmCustomers(callback: (customers: CrmCustomer[]) => void) {
  return subscribeTable<CrmCustomer>("customers", callback, "updated_at", true, 500, undefined, true);
}

export async function getCustomerActivities(): Promise<CustomerActivity[]> {
  try {
    return await getRows<CustomerActivity>(
      "customer_activities",
      "created_at",
      true,
      500,
      undefined,
      true,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingTableError(message)) return [];
    throw error;
  }
}

export function subscribeCustomerActivities(callback: (activities: CustomerActivity[]) => void) {
  return subscribeTable<CustomerActivity>(
    "customer_activities",
    callback,
    "created_at",
    true,
    500,
    undefined,
    true,
  );
}

export async function saveCrmCustomer(customer: CrmCustomer): Promise<CrmCustomer> {
  const now = new Date().toISOString();
  const payload = stampPharmacy(
    toSnakeCase({
      ...customer,
      tags: customer.tags || [],
      isActive: customer.isActive !== false,
      updatedAt: now,
      createdAt: customer.createdAt || now,
    }),
  );
  const { data, error } = await supabase.from("customers").upsert(payload).select("*").single();
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
  return toCamelCase<CrmCustomer>(data);
}

export async function deleteCrmCustomer(id: number): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
}

export async function saveCustomerActivity(activity: CustomerActivity): Promise<CustomerActivity> {
  const now = new Date().toISOString();
  const payload = stampPharmacy(
    toSnakeCase({
      ...activity,
      status: activity.status || "open",
      updatedAt: now,
      createdAt: activity.createdAt || now,
    }),
  );
  const { data, error } = await supabase
    .from("customer_activities")
    .upsert(payload)
    .select("*")
    .single();
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
  return toCamelCase<CustomerActivity>(data);
}

export async function updateCustomerActivityStatus(
  id: number,
  status: CustomerActivity["status"],
): Promise<void> {
  const { error } = await supabase
    .from("customer_activities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
}

export async function deleteCustomerActivity(id: number): Promise<void> {
  const { error } = await supabase.from("customer_activities").delete().eq("id", id);
  if (error) {
    if (isMissingTableError(error.message)) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }
}
