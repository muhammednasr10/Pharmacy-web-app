import { supabase } from "../supabaseClient";
import { normalizeRole } from "../../utils/roles";
import type { LoginAccountRequest, SubscriptionRequestStatus, UserRole } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { buildLoginAccountRequestNumber } from "./authServiceShared";

export async function getAllLoginAccountRequests(options?: {
  includePendingPasswords?: boolean;
}): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllLoginAccountRequests error:", error.message, error.code);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    if (!options?.includePendingPasswords || req.status !== "pending") {
      delete req.password;
    }
    return req;
  });
}

export async function getPharmacyLoginAccountRequests(
  pharmacyId: string,
): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPharmacyLoginAccountRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    delete req.password;
    return req;
  });
}

export async function getLoginAccountRequestById(id: number): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCamelCase<LoginAccountRequest>(data);
}

export async function getPendingLoginAccountRequestForEmployee(
  employeeId: string,
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export async function getPendingLoginAccountRequestForEmail(
  pharmacyId: string,
  email: string,
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export function subscribeLoginAccountRequests(
  callback: (rows: LoginAccountRequest[]) => void,
  options?: { includePendingPasswords?: boolean },
) {
  const channel = supabase
    .channel("realtime-login-account-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "login_account_requests" },
      () => {
        void getAllLoginAccountRequests(options).then(callback);
      },
    );

  void channel.subscribe();
  return () => {
    void channel.unsubscribe();
  };
}

export async function createLoginAccountRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  employeeId?: string;
  employeeName?: string;
  email: string;
  username?: string;
  password: string;
  role: UserRole;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<LoginAccountRequest> {
  const email = input.email.trim().toLowerCase();
  const existingEmail = await getPendingLoginAccountRequestForEmail(input.pharmacyId, email);
  if (existingEmail) {
    throw new Error("pending_login_request_exists");
  }
  if (input.employeeId) {
    const existingEmployee = await getPendingLoginAccountRequestForEmployee(input.employeeId);
    if (existingEmployee) {
      throw new Error("pending_login_request_exists");
    }
  }

  const payload = toSnakeCase({
    requestNumber: buildLoginAccountRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    employeeId: input.employeeId || null,
    employeeName: input.employeeName || null,
    email,
    username: (input.username || email.split("@")[0] || email).trim(),
    password: input.password,
    role: normalizeRole(input.role),
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("login_account_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<LoginAccountRequest>(data);
  delete created.password;
  return created;
}

export async function updateLoginAccountRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
    clearPassword?: boolean;
  },
) {
  const payload: Record<string, unknown> = {
    status: updates.status,
    reviewed_by: updates.reviewedBy,
    reviewed_by_name: updates.reviewedByName,
    review_note: updates.reviewNote,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (updates.clearPassword) {
    // Column may still be NOT NULL on older DBs — empty string satisfies the constraint.
    payload.password = "";
  }

  const { error } = await supabase
    .from("login_account_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}
