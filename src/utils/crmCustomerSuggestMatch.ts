import type { CrmCustomer } from "../types";
import { normalizeCustomerPhone } from "./crmProfiles";

export function matchesCrmCustomerPhone(customer: CrmCustomer, query: string): boolean {
  const q = normalizeCustomerPhone(query);
  if (q.length < 2) return false;
  return normalizeCustomerPhone(customer.phone).includes(q);
}

export function matchesCrmCustomerName(customer: CrmCustomer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return false;
  return (customer.name || "").toLowerCase().includes(q);
}
