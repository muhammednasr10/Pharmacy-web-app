import { supabase } from "../supabaseClient";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter } from "./scope";

const DEFAULT_PAGE_SIZE = 1000;

type GetAllRowsOptions = {
  filter?: { column: string; value: unknown };
  inFilter?: { column: string; values: unknown[] };
  pharmacyScoped?: boolean;
};

export async function getAllRows<T>(
  table: string,
  orderBy = "id",
  desc = false,
  pageSize = DEFAULT_PAGE_SIZE,
  options?: GetAllRowsOptions,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select("*");

    if (options?.pharmacyScoped) {
      query = applyPharmacyFilter(query);
    }

    if (options?.filter) {
      query = query.eq(options.filter.column, options.filter.value as string);
    }

    if (options?.inFilter && options.inFilter.values.length > 0) {
      query = query.in(options.inFilter.column, options.inFilter.values);
    }

    query = query.order(orderBy, { ascending: !desc }).range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      console.error(`Supabase getAllRows ${table} error:`, error.message);
      break;
    }

    const batch = (data || []).map((row) => toCamelCase<T>(row));
    all.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

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

export async function createIdAllocator(table: string) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    console.error(`createIdAllocator ${table}:`, error.message);
  }

  let cursor = Number(data?.[0]?.id) || 0;
  return () => {
    cursor += 1 + Math.floor(Math.random() * 17);
    return cursor;
  };
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
