import { supabase } from "../supabaseClient";
import type { PharmacySignupRequest, SubscriptionRequestStatus } from "../../types";
import { toCamelCase } from "./mappers";

export type PharmacySignupStatusLookup = {
  status: SubscriptionRequestStatus;
  requestNumber?: string;
  pharmacyName?: string;
  reviewNote?: string;
  reviewedAt?: string;
};

export async function getPharmacySignupStatusByEmail(
  email: string,
): Promise<PharmacySignupStatusLookup | null> {
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return null;

  const { data, error } = await supabase.rpc("get_pharmacy_signup_status_by_email", {
    p_email: trimmed,
  });

  if (error) {
    if (
      /could not find the function|schema cache|PGRST202/i.test(error.message)
    ) {
      return null;
    }
    console.error("getPharmacySignupStatusByEmail error:", error.message);
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const status = String(row.status || "");
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return null;
  }

  return {
    status,
    requestNumber: row.request_number ? String(row.request_number) : undefined,
    pharmacyName: row.pharmacy_name ? String(row.pharmacy_name) : undefined,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
  };
}

export async function getPendingPharmacySignupRequests(): Promise<PharmacySignupRequest[]> {
  const { data, error } = await supabase
    .from("pharmacy_signup_requests")
    .select(
      "id, request_number, pharmacy_name, admin_name, email, phone, address, status, pharmacy_id, reviewed_by, reviewed_by_name, review_note, created_at, updated_at, reviewed_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getPendingPharmacySignupRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PharmacySignupRequest>(row));
}

export async function approvePharmacySignupRequest(
  requestId: string,
  options?: { reviewNote?: string; subscriptionTier?: string },
): Promise<void> {
  const { error } = await supabase.rpc("approve_pharmacy_signup_request", {
    p_request_id: requestId,
    p_review_note: options?.reviewNote || null,
    p_subscription_tier: options?.subscriptionTier || "professional",
  });

  if (error) {
    if (error.message.includes("forbidden")) throw new Error("forbidden");
    if (error.message.includes("signup_request_not_found")) throw new Error("signup_request_not_found");
    if (error.message.includes("signup_request_not_pending")) throw new Error("signup_request_not_pending");
    if (error.message.includes("email_already_registered")) throw new Error("email_already_registered");
    if (error.message.includes("invalid_subscription_tier")) throw new Error("invalid_subscription_tier");
    throw new Error(error.message);
  }
}

export async function rejectPharmacySignupRequest(
  requestId: string,
  reviewNote?: string,
): Promise<void> {
  const { error } = await supabase.rpc("reject_pharmacy_signup_request", {
    p_request_id: requestId,
    p_review_note: reviewNote || null,
  });

  if (error) {
    if (error.message.includes("forbidden")) throw new Error("forbidden");
    if (error.message.includes("signup_request_not_found")) throw new Error("signup_request_not_found");
    if (error.message.includes("signup_request_not_pending")) throw new Error("signup_request_not_pending");
    throw new Error(error.message);
  }
}
