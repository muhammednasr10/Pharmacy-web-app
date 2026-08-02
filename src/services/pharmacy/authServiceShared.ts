import { supabase } from "../supabaseClient";
import type { PharmacySettings } from "../../types";

export function isSubscriptionEndDatePassed(endDate?: string | null) {
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
}

export function buildSubscriptionRequestNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${stamp}-${random}`;
}

export function buildLoginAccountRequestNumber() {
  return `ACC-${Date.now()}`;
}

export async function resolveOrganizationIdForScope(pharmacyId: string): Promise<string> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("organization_id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error || !data?.organization_id) {
    return `org-${pharmacyId}`;
  }
  return String(data.organization_id);
}

export function resolveOrgIdFromPharmacy(pharmacy: PharmacySettings): string {
  return pharmacy.organizationId || `org-${pharmacy.id}`;
}

export function isMissingRpcError(message: string, rpcName: string) {
  const msg = message.toLowerCase();
  return (
    msg.includes("could not find the function") ||
    (msg.includes("schema cache") && msg.includes(rpcName.toLowerCase()))
  );
}
