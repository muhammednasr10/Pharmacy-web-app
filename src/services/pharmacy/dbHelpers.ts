import { supabase } from "../supabaseClient";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter } from "./scope";

export async function getRows<T>(
  table: string,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown },
  pharmacyScoped = false,
): Promise<T[]> {
  let query = supabase.from(table).select("*");

  if (pharmacyScoped) {
    query = applyPharmacyFilter(query);
  }

  if (filter) {
    query = query.eq(filter.column, filter.value as string);
  }

  if (limit) {
    query = query.limit(limit);
  }

  query = query.order(orderBy, { ascending: !desc });

  const { data, error } = await query;

  if (error) {
    console.error(`Supabase getRows ${table} error:`, error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<T>(row));
}

let realtimeChannelSeq = 0;

export function subscribeTable<T>(
  table: string,
  callback: (rows: T[]) => void,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown },
  pharmacyScoped = false,
) {
  const channelName = `realtime-${table}-${++realtimeChannelSeq}`;
  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      void getRows<T>(table, orderBy, desc, limit, filter, pharmacyScoped).then(callback);
    });

  void channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
