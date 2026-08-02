import { supabase } from "../supabaseClient";
import { normalizeRole } from "../../utils/roles";
import {
  assertPharmacyGeneralManagerSlotAvailable,
  isPharmacyGeneralManagerRole,
} from "../../utils/pharmacyGeneralManager";
import type { PharmacyLoginAccount, UserRole } from "../../types";
import { toCamelCase } from "./mappers";
import { getEmployees, syncPharmacyLoginAccountToUser } from "./hrService";
import { normalizePharmacyLoginAccount } from "./loginAccountCatalogShared";
import { getPharmacyLoginAccountById } from "./loginAccountQueryService";

export async function submitPharmacyLoginAccountEditRequest(
  id: string,
  changes: { email: string; password: string; role: UserRole },
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

  const pendingRole = normalizeRole(changes.role);
  if (isPharmacyGeneralManagerRole(pendingRole)) {
    await assertPharmacyGeneralManagerSlotAvailable(account.pharmacyId, pendingRole, {
      accountId: id,
    });
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: changes.email.trim().toLowerCase(),
      pending_password: changes.password,
      pending_role: normalizeRole(changes.role),
      edit_pending: true,
      edit_requested_by: requestedBy || null,
      edit_requested_by_name: requestedByName || null,
      edit_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.editPending) {
    throw new Error("account_edit_not_pending");
  }

  const email = (account.pendingEmail || account.email).trim().toLowerCase();
  const password = account.pendingPassword ?? account.password ?? "";
  const role = account.pendingRole ? normalizeRole(account.pendingRole) : account.role;

  if (isPharmacyGeneralManagerRole(role)) {
    await assertPharmacyGeneralManagerSlotAvailable(account.pharmacyId, role, {
      accountId: id,
    });
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      email,
      password,
      role,
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  const employees = await getEmployees();
  const employee = approved.employeeId
    ? employees.find((item) => item.id === approved.employeeId)
    : undefined;
  await syncPharmacyLoginAccountToUser(approved, { name: employee?.name });

  return approved;
}

export async function rejectPharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("edit_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}
