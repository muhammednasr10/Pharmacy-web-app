import { supabase } from "../supabaseClient";
import type { PharmacyLoginAccount } from "../../types";
import { toCamelCase } from "./mappers";
import { getEmployees, syncPharmacyLoginAccountToUser } from "./hrService";
import { normalizePharmacyLoginAccount } from "./loginAccountCatalogShared";
import { getPharmacyLoginAccountById } from "./loginAccountQueryService";

export async function submitPharmacyLoginAccountLinkRequest(
  id: string,
  requestedBy?: string,
  requestedByName?: string,
) {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }
  if (account.linkRequestPending) {
    throw new Error("link_request_already_pending");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: true,
      link_requested_by: requestedBy || null,
      link_requested_by_name: requestedByName || null,
      link_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.linkRequestPending) {
    throw new Error("link_request_not_pending");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }

  const employees = await getEmployees();
  const employee = account.employeeId
    ? employees.find((item) => item.id === account.employeeId)
    : undefined;

  await syncPharmacyLoginAccountToUser(account, { name: employee?.name });

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function rejectPharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("link_request_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}
