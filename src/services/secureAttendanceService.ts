import { supabase } from "./supabaseClient";
import { getAppAccessToken } from "./appAuthSession";
import type { SecureAttendanceAction, SecureAttendanceResult } from "../utils/secureAttendanceQr";

function normalizeRpcResult(data: unknown): SecureAttendanceResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "invalid_response" };
  }
  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    action: row.action as SecureAttendanceAction | undefined,
    branchId: row.branch_id ? String(row.branch_id) : undefined,
    workDate: row.work_date ? String(row.work_date) : undefined,
    distanceM: row.distance_m != null ? Number(row.distance_m) : undefined,
    allowedM: row.allowed_m != null ? Number(row.allowed_m) : undefined,
    error: row.error ? String(row.error) : undefined,
  };
}

/** Fetch server-signed rotating QR for branch display (refreshed every 10s). */
export async function fetchDynamicAttendanceQr(pharmacyId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_dynamic_attendance_qr", {
    p_pharmacy_id: pharmacyId,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "string") {
    throw new Error("qr_generation_failed");
  }
  return data;
}

/** Validate QR + GPS and record check-in/out (Supabase RPC). */
export async function processSecureAttendance(input: {
  qrPayload: string;
  latitude: number;
  longitude: number;
  action: SecureAttendanceAction;
}): Promise<SecureAttendanceResult> {
  const { data, error } = await supabase.rpc("process_secure_attendance", {
    p_qr_payload: input.qrPayload,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_action: input.action,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return normalizeRpcResult(data);
}

/** Optional Edge Function wrapper (same contract as RPC). */
export async function processSecureAttendanceViaEdge(input: {
  qrPayload: string;
  latitude: number;
  longitude: number;
  action: SecureAttendanceAction;
}): Promise<SecureAttendanceResult> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!baseUrl) {
    return processSecureAttendance(input);
  }

  const token = getAppAccessToken();
  if (!token) {
    return { ok: false, error: "not_authorized" };
  }

  const response = await fetch(`${baseUrl}/functions/v1/process-secure-attendance`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      qr_payload: input.qrPayload,
      latitude: input.latitude,
      longitude: input.longitude,
      action: input.action,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || `http_${response.status}` };
  }

  const json = (await response.json()) as unknown;
  return normalizeRpcResult(json);
}

export function branchHasGeofence(
  branch?: { latitude?: number | null; longitude?: number | null } | null,
): boolean {
  return (
    branch?.latitude != null &&
    branch?.longitude != null &&
    Number.isFinite(branch.latitude) &&
    Number.isFinite(branch.longitude)
  );
}
