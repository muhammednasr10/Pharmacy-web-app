import type { PaymentMethod, PharmacyWallet, PharmacyWalletType } from "../types";

export function walletTypeToPaymentMethod(type: PharmacyWalletType | string): PaymentMethod {
  if (type === "bank") return "visa";
  if (type === "ewallet") return "wallet";
  return "cash";
}

export function pickDefaultPosWallet(wallets: PharmacyWallet[]): PharmacyWallet | null {
  const active = wallets.filter((item) => item.isActive !== false);
  if (!active.length) return null;
  return active.find((item) => item.isDefaultPos) || active[0] || null;
}

export function buildPosWalletPaymentOptions(
  wallets: PharmacyWallet[],
  isArabic: boolean,
): { value: string; label: string }[] {
  return wallets
    .filter((item) => item.isActive !== false)
    .map((wallet) => ({
      value: String(wallet.id),
      label: isArabic
        ? `${wallet.name}${wallet.isDefaultPos ? " (افتراضي)" : ""}`
        : `${wallet.name}${wallet.isDefaultPos ? " (default)" : ""}`,
    }));
}
