import { supabase } from "../supabaseClient";
import type {
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
} from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { applyPharmacyScopeFilter, stampPharmacy } from "./scope";
import { listDaysBetween } from "./payrollCompute";
import { getAttendanceForDay, upsertAttendanceRecord } from "./attendanceService";

function buildEmployeeRequestNumber() {
  return `ER-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function getEmployeeRequests(options?: {
  userId?: string;
  employeeId?: string;
  status?: EmployeeRequestStatus;
  fromDate?: string;
  toDate?: string;
  pharmacyIds?: string[];
}): Promise<EmployeeRequest[]> {
  let query = applyPharmacyScopeFilter(
    supabase.from("employee_requests").select("*"),
    options?.pharmacyIds,
  ).order("created_at", { ascending: false });

  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.employeeId) query = query.eq("employee_id", options.employeeId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.fromDate) query = query.gte("work_date", options.fromDate);
  if (options?.toDate) query = query.lte("work_date", options.toDate);

  const { data, error } = await query;
  if (error) {
    console.error("getEmployeeRequests error:", error.message);
    return [];
  }
  return (data || []).map((row) => toCamelCase<EmployeeRequest>(row));
}

export async function createEmployeeRequest(input: {
  employeeId: string;
  userId?: string;
  employeeName: string;
  requestType: EmployeeRequestType;
  workDate: string;
  endDate?: string;
  requestedTime?: string;
  reason?: string;
}): Promise<EmployeeRequest> {
  const payload = stampPharmacy(
    toSnakeCase({
      requestNumber: buildEmployeeRequestNumber(),
      employeeId: input.employeeId,
      userId: input.userId || "",
      employeeName: input.employeeName,
      requestType: input.requestType,
      workDate: input.workDate,
      endDate: input.endDate || null,
      requestedTime: input.requestedTime || null,
      reason: input.reason || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("employee_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<EmployeeRequest>(data);
}

export async function reviewEmployeeRequest(
  id: number,
  status: Exclude<EmployeeRequestStatus, "pending">,
  reviewer: { uid: string; name: string },
  reviewNote?: string,
): Promise<EmployeeRequest> {
  // Load/update by id only — RLS enforces org/branch access (avoid active-branch filter).
  const { data: existing, error: loadError } = await supabase
    .from("employee_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "request_not_found");
  }

  const request = toCamelCase<EmployeeRequest>(existing);
  if (request.status !== "pending") {
    throw new Error("request_already_reviewed");
  }

  const payload = toSnakeCase({
    status,
    reviewedBy: reviewer.uid,
    reviewedByName: reviewer.name,
    reviewNote: reviewNote || "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("employee_requests")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = toCamelCase<EmployeeRequest>(data);

  if (status === "approved") {
    if (updated.requestType === "leave") {
      const end = updated.endDate || updated.workDate;
      const days = listDaysBetween(updated.workDate, end);
      const branchPharmacyId = updated.pharmacyId;
      for (const workDate of days) {
        await upsertAttendanceRecord({
          pharmacyId: branchPharmacyId,
          userId: updated.userId || updated.employeeId,
          userName: updated.employeeName,
          workDate,
          status: "leave",
          notes: updated.reason || (updated.requestNumber ? `إجازة ${updated.requestNumber}` : ""),
        });
      }
    } else if (updated.requestType === "permission") {
      const existingRecord = await getAttendanceForDay(
        updated.userId || updated.employeeId,
        updated.workDate,
      );
      const permissionNote = updated.requestedTime
        ? `إذن معتمد — انصراف ${updated.requestedTime}`
        : "إذن معتمد";
      await upsertAttendanceRecord({
        ...existingRecord,
        pharmacyId: updated.pharmacyId || existingRecord?.pharmacyId,
        userId: updated.userId || updated.employeeId,
        userName: updated.employeeName,
        workDate: updated.workDate,
        status: existingRecord?.status || "present",
        notes: [existingRecord?.notes, permissionNote].filter(Boolean).join(" | "),
      });
    }
  }

  return updated;
}
