import { supabase } from "../supabaseClient";
import type { ActivityLog } from "../../types";
import { toCamelCase } from "./mappers";
import { getRows, subscribeTable } from "./dbHelpers";

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return getRows<ActivityLog>("activity_logs", "created_at", false, 300, undefined, true);
}

export async function getActivityLogsForPharmacies(
  pharmacyIds: string[],
  limit = 500,
): Promise<ActivityLog[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getActivityLogs();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .in("pharmacy_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getActivityLogsForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<ActivityLog>(row));
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  return subscribeTable<ActivityLog>(
    "activity_logs",
    callback,
    "created_at",
    false,
    300,
    undefined,
    true,
  );
}
