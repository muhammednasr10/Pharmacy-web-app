import { supabase } from "../supabaseClient";
import type { CustomerPayment } from "../../types";
import { toSnakeCase } from "./mappers";
import { stampPharmacy } from "./scope";
import { getRows, subscribeTable } from "./dbHelpers";

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  return getRows<CustomerPayment>("customer_payments", "id", false, 100, undefined, true);
}

export function subscribeCustomerPayments(callback: (payments: CustomerPayment[]) => void) {
  return subscribeTable<CustomerPayment>(
    "customer_payments",
    callback,
    "id",
    false,
    100,
    undefined,
    true,
  );
}

export async function saveCustomerPayment(payment: CustomerPayment) {
  const payload = stampPharmacy(toSnakeCase(payment));
  const { error } = await supabase.from("customer_payments").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCustomerPayment(paymentNumber: string) {
  const { error } = await supabase
    .from("customer_payments")
    .delete()
    .eq("payment_number", paymentNumber);

  if (error) {
    throw new Error(error.message);
  }
}
