import { supabase } from "../supabaseClient";
import type { PharmacyLoginAccount } from "../../types";
import { toCamelCase } from "./mappers";
import { normalizePharmacyLoginAccount } from "./loginAccountCatalogShared";

export function subscribePharmacyLoginCatalog(
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel("realtime-pharmacy-login-catalog")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pharmacy_login_accounts" },
      onChange,
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, onChange);

  void channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function getPharmacyLoginAccounts(
  pharmacyId: string,
): Promise<PharmacyLoginAccount[]> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("email", { ascending: true });

  if (error) {
    console.error("getPharmacyLoginAccounts error:", error.message);
    return [];
  }

  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

export async function getPharmacyLoginAccountsForPharmacies(
  pharmacyIds: string[],
): Promise<PharmacyLoginAccount[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getPharmacyLoginAccounts(ids[0]);

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .in("pharmacy_id", ids)
    .order("pharmacy_id", { ascending: true })
    .order("email", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getPharmacyLoginAccountsForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

/** Plaintext password kept in pharmacy_login_accounts for super-admin recovery (not from password_hash). */
export function resolveLoginAccountStoredPassword(
  accounts: PharmacyLoginAccount[],
  pharmacyId: string,
  email: string,
): string {
  const normalizedEmail = email.trim().toLowerCase();
  const account = accounts.find(
    (item) =>
      item.pharmacyId === pharmacyId &&
      item.email.trim().toLowerCase() === normalizedEmail,
  );
  if (!account) return "";
  return account.pendingPassword?.trim() || account.password?.trim() || "";
}

export async function getAllPharmacyLoginAccounts(options?: {
  status?: PharmacyLoginAccount["status"];
  pendingApproval?: boolean;
}): Promise<PharmacyLoginAccount[]> {
  let query = supabase.from("pharmacy_login_accounts").select("*").order("created_at", {
    ascending: false,
  });
  if (options?.pendingApproval) {
    query = query.or("status.eq.pending,edit_pending.eq.true,link_request_pending.eq.true");
  } else if (options?.status) {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getAllPharmacyLoginAccounts error:", error.message);
    return [];
  }
  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

export async function getPharmacyLoginAccountById(
  id: string,
): Promise<PharmacyLoginAccount | null> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}
