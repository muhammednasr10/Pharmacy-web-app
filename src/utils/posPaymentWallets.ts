import type { PaymentMethod, PharmacyWallet, PharmacyWalletType } from "../types";

/** Synthetic POS option when payment methods come from investment wallets. */
export const POS_DELIVERY_PAYMENT_VALUE = "__pos_delivery__";

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
  const walletOptions = wallets
    .filter((item) => item.isActive !== false)
    .map((wallet) => ({
      value: String(wallet.id),
      label: isArabic
        ? `${wallet.name}${wallet.isDefaultPos ? " (افتراضي)" : ""}`
        : `${wallet.name}${wallet.isDefaultPos ? " (default)" : ""}`,
    }));
  return [
    ...walletOptions,
    {
      value: POS_DELIVERY_PAYMENT_VALUE,
      label: isArabic ? "دليفري" : "Delivery",
    },
  ];
}
