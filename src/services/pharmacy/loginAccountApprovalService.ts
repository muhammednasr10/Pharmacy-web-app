import { supabase } from "../supabaseClient";
import {
  assertPharmacyGeneralManagerSlotAvailable,
  isPharmacyGeneralManagerRole,
} from "../../utils/pharmacyGeneralManager";
import type { PharmacyLoginAccount } from "../../types";
import { toCamelCase } from "./mappers";
import { getEmployees, syncPharmacyLoginAccountToUser } from "./hrService";
import { normalizePharmacyLoginAccount } from "./loginAccountCatalogShared";
import { getPharmacyLoginAccountById } from "./loginAccountQueryService";

export async function superAdminApprovePharmacyLoginAccountCatalog(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status === "approved") {
    throw new Error("account_already_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }

  if (isPharmacyGeneralManagerRole(account.role)) {
    await assertPharmacyGeneralManagerSlotAvailable(account.pharmacyId, account.role, {
      accountId: id,
    });
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "rejected"])
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

export async function approvePharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || account.status !== "pending") {
    throw new Error("account_not_pending");
  }

  if (isPharmacyGeneralManagerRole(account.role)) {
    await assertPharmacyGeneralManagerSlotAvailable(account.pharmacyId, account.role, {
      accountId: id,
    });
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
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

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  await syncPharmacyLoginAccountToUser(approved);

  return approved;
}

export async function rejectPharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee_id: null,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}
