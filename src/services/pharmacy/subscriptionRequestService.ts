import { supabase } from "../supabaseClient";
import { notifySuperAdminOfSubscriptionRequest } from "../../utils/superAdminNotify";
import type { SubscriptionRequest, SubscriptionRequestStatus } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { buildSubscriptionRequestNumber } from "./authServiceShared";
import { createManagedRealtimeChannel, disposeManagedRealtimeChannel } from "./dbHelpers";

export async function getAllSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getAllSubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export async function getPharmacySubscriptionRequests(
  pharmacyId: string,
): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getPharmacySubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export function subscribeSubscriptionRequests(callback: (rows: SubscriptionRequest[]) => void) {
  const channelName = "realtime-subscription-requests";
  const channel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "subscription_requests" },
    () => {
      void getAllSubscriptionRequests().then(callback);
    },
  );

  void channel.subscribe();

  return () => {
    disposeManagedRealtimeChannel(channel);
  };
}

export async function createSubscriptionRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  plan: string;
  days: number;
  amount: number;
  currency?: string;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<SubscriptionRequest> {
  const payload = toSnakeCase({
    requestNumber: buildSubscriptionRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    plan: input.plan,
    days: input.days,
    amount: input.amount,
    currency: input.currency || "EGP",
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("subscription_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<SubscriptionRequest>(data);
  void notifySuperAdminOfSubscriptionRequest(created).catch((notifyError) => {
    console.error("notifySuperAdminOfSubscriptionRequest:", notifyError);
  });

  return created;
}

export async function updateSubscriptionRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
  },
) {
  const payload = toSnakeCase({
    status: updates.status,
    reviewedBy: updates.reviewedBy,
    reviewedByName: updates.reviewedByName,
    reviewNote: updates.reviewNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("subscription_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}
