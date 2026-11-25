import type { CrmCustomerProfile } from "../types";

export function paymentBreakdownEntries(
  profile: CrmCustomerProfile,
): Array<{ method: string; count: number }> {
  return Object.entries(profile.invoicesByPaymentMethod || {})
    .map(([method, count]) => ({ method, count: Number(count) || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
