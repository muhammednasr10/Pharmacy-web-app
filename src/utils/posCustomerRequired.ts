import type { PaymentMethod } from "../types";

export function needsPosCustomerData(
  paymentMethod: PaymentMethod | string | undefined,
  useCustomOptions: boolean,
): boolean {
  if (useCustomOptions) return paymentMethod === "delivery";
  return paymentMethod === "credit" || paymentMethod === "delivery";
}

export function hasPosCustomerData(
  customerName: string,
  customerPhone = "",
  customerAddress = "",
): boolean {
  return Boolean(customerName.trim() || customerPhone.trim() || customerAddress.trim());
}
