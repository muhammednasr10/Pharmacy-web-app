import { supabase } from "../supabaseClient";
import type { PharmacyWallet, PharmacyWalletType } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { stampPharmacy } from "./scope";

export const WALLET_TYPE_OPTIONS: {
  value: PharmacyWalletType;
  ar: string;
  en: string;
}[] = [
  { value: "cash", ar: "كاش / صندوق", en: "Cash / drawer" },
  { value: "bank", ar: "بنكية", en: "Bank" },
  { value: "ewallet", ar: "محفظة إلكترونية", en: "E-wallet" },
];

export function getWalletTypeLabel(type: string, isArabic: boolean): string {
  const entry = WALLET_TYPE_OPTIONS.find((item) => item.value === type);
  if (!entry) return type || "—";
  return isArabic ? entry.ar : entry.en;
}

function normalizeWallet(row: PharmacyWallet): PharmacyWallet {
  return {
    ...row,
    id: Number(row.id) || Date.now(),
    pharmacyId: String(row.pharmacyId || ""),
    name: String(row.name || "").trim(),
    walletType: (["cash", "bank", "ewallet"].includes(String(row.walletType))
      ? row.walletType
      : "cash") as PharmacyWalletType,
    balance: Number(row.balance) || 0,
    notes: String(row.notes || ""),
    isActive: row.isActive !== false,
    isDefaultPos: Boolean(row.isDefaultPos),
  };
}

export async function getPharmacyWallets(pharmacyId: string): Promise<PharmacyWallet[]> {
  if (!pharmacyId) return [];
  const { data, error } = await supabase
    .from("pharmacy_wallets")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) =>
    normalizeWallet(toCamelCase<PharmacyWallet>(row as Record<string, unknown>)),
  );
}

export async function savePharmacyWallet(wallet: PharmacyWallet): Promise<void> {
  const payload = stampPharmacy(
    toSnakeCase({
      ...wallet,
      name: wallet.name.trim(),
      balance: Number(wallet.balance) || 0,
      notes: wallet.notes?.trim() || "",
      isActive: wallet.isActive !== false,
      updatedAt: new Date().toISOString(),
      createdAt: wallet.createdAt || new Date().toISOString(),
    }),
  );

  const { error } = await supabase.from("pharmacy_wallets").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePharmacyWallet(
  id: number,
  updates: Partial<
    Pick<
      PharmacyWallet,
      "name" | "walletType" | "balance" | "notes" | "isActive" | "isDefaultPos"
    >
  >,
): Promise<void> {
  const payload = stampPharmacy(
    toSnakeCase({
      ...updates,
      ...(updates.name != null ? { name: updates.name.trim() } : {}),
      ...(updates.notes != null ? { notes: updates.notes.trim() } : {}),
      ...(updates.balance != null ? { balance: Number(updates.balance) || 0 } : {}),
      ...(updates.isDefaultPos != null ? { isDefaultPos: Boolean(updates.isDefaultPos) } : {}),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { error } = await supabase.from("pharmacy_wallets").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

/** Mark one wallet as the POS default; clears the flag on other wallets in the same pharmacy. */
export async function setDefaultPosWallet(
  pharmacyId: string,
  walletId: number,
): Promise<void> {
  if (!pharmacyId || !walletId) {
    throw new Error("Missing pharmacy or wallet");
  }

  const { error: clearError } = await supabase
    .from("pharmacy_wallets")
    .update(
      stampPharmacy(
        toSnakeCase({
          isDefaultPos: false,
          updatedAt: new Date().toISOString(),
        }),
      ),
    )
    .eq("pharmacy_id", pharmacyId)
    .eq("is_default_pos", true);

  if (clearError) {
    throw new Error(clearError.message);
  }

  await updatePharmacyWallet(walletId, { isDefaultPos: true });
}

export async function creditPharmacyWalletBalance(
  walletId: number,
  amount: number,
): Promise<void> {
  const credit = Number(amount);
  if (!walletId || !Number.isFinite(credit) || credit === 0) return;

  const { data, error } = await supabase
    .from("pharmacy_wallets")
    .select("balance")
    .eq("id", walletId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const current = Number((data as { balance?: number } | null)?.balance) || 0;
  await updatePharmacyWallet(walletId, { balance: current + credit });
}

export async function deletePharmacyWallet(id: number): Promise<void> {
  const { error } = await supabase.from("pharmacy_wallets").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function transferBetweenWallets(input: {
  fromWalletId: number;
  toWalletId: number;
  amount: number;
}): Promise<void> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }
  if (input.fromWalletId === input.toWalletId) {
    throw new Error("Choose two different wallets");
  }

  const { data, error } = await supabase
    .from("pharmacy_wallets")
    .select("*")
    .in("id", [input.fromWalletId, input.toWalletId]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []).map((row) =>
    normalizeWallet(toCamelCase<PharmacyWallet>(row as Record<string, unknown>)),
  );
  const fromWallet = rows.find((item) => item.id === input.fromWalletId);
  const toWallet = rows.find((item) => item.id === input.toWalletId);

  if (!fromWallet || !toWallet) {
    throw new Error("Wallet not found");
  }
  if (fromWallet.isActive === false || toWallet.isActive === false) {
    throw new Error("Cannot transfer with an inactive wallet");
  }
  if (Number(fromWallet.balance) < amount) {
    throw new Error("Insufficient wallet balance");
  }

  const now = new Date().toISOString();
  const fromBalance = Number(fromWallet.balance) - amount;
  const toBalance = Number(toWallet.balance) + amount;

  const { error: fromError } = await supabase
    .from("pharmacy_wallets")
    .update(
      stampPharmacy(
        toSnakeCase({
          balance: fromBalance,
          updatedAt: now,
        }),
      ),
    )
    .eq("id", fromWallet.id);

  if (fromError) {
    throw new Error(fromError.message);
  }

  const { error: toError } = await supabase
    .from("pharmacy_wallets")
    .update(
      stampPharmacy(
        toSnakeCase({
          balance: toBalance,
          updatedAt: now,
        }),
      ),
    )
    .eq("id", toWallet.id);

  if (toError) {
    // Best-effort rollback of the debit if the credit fails.
    await supabase
      .from("pharmacy_wallets")
      .update(
        stampPharmacy(
          toSnakeCase({
            balance: fromWallet.balance,
            updatedAt: now,
          }),
        ),
      )
      .eq("id", fromWallet.id);
    throw new Error(toError.message);
  }
}
