import type { PaymentMethod } from "../types";
import { POS_DELIVERY_PAYMENT_VALUE } from "./posPaymentWallets";

export function isPosDeliverySale(
  paymentMethod: PaymentMethod | string | undefined,
  paymentOptionValue?: string | null,
): boolean {
  return paymentMethod === "delivery" || paymentOptionValue === POS_DELIVERY_PAYMENT_VALUE;
}
