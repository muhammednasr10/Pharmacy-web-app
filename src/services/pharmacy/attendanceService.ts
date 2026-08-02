import { supabase } from "../supabaseClient";
import type { AttendanceRecord, AttendanceStatus, ShiftId } from "../../types";
import {
  DEFAULT_ALLOWED_LATE_MINUTES,
  isCheckInLate,
  type WorkSchedule,
} from "../../utils/workSchedule";
import { toCamelCase, toSnakeCase } from "./mappers";
import { applyPharmacyFilter, applyPharmacyScopeFilter, stampPharmacy } from "./scope";

export async function getAttendanceRecords(
  fromDate: string,
  toDate: string,
  pharmacyIds?: string[],
): Promise<AttendanceRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("attendance_records").select("*"), pharmacyIds)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("getAttendanceRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<AttendanceRecord>(row));
}

export async function upsertAttendanceRecord(
  record: Partial<AttendanceRecord> & { userId: string; userName: string; workDate: string },
) {
  const id = record.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      status: record.status || "present",
      updatedAt: new Date().toISOString(),
    }),
  );
  const { error } = await supabase
    .from("attendance_records")
    .upsert([payload], { onConflict: "pharmacy_id,user_id,work_date" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAttendanceRecord(id: number) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getAttendanceForDay(
  userId: string,
  workDate: string,
): Promise<AttendanceRecord | null> {
  let query = applyPharmacyFilter(
    supabase.from("attendance_records").select("*").eq("user_id", userId).eq("work_date", workDate),
  );
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<AttendanceRecord>(data);
}

export async function recordCheckIn(
  userId: string,
  userName: string,
  workDate?: string,
  options?: {
    expectedSchedule?: WorkSchedule;
    shiftId?: ShiftId;
    graceMinutes?: number;
    pharmacyId?: string;
  },
) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (existing?.checkIn) {
    throw new Error("already_checked_in");
  }

  const checkIn = new Date().toISOString();
  let status: AttendanceStatus =
    existing?.status && existing.status !== "absent" ? existing.status : "present";

  if (
    options?.expectedSchedule &&
    isCheckInLate(
      checkIn,
      options.expectedSchedule,
      options.graceMinutes ?? DEFAULT_ALLOWED_LATE_MINUTES,
    )
  ) {
    status = "late";
  }

  await upsertAttendanceRecord({
    ...existing,
    pharmacyId: options?.pharmacyId ?? existing?.pharmacyId,
    userId,
    userName,
    workDate: date,
    checkIn,
    status,
    shiftId: options?.shiftId ?? existing?.shiftId,
  });
}

export async function recordCheckOut(
  userId: string,
  userName: string,
  workDate?: string,
  options?: { pharmacyId?: string },
) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (!existing?.checkIn) {
    throw new Error("check_in_required");
  }
  if (existing.checkOut) {
    throw new Error("already_checked_out");
  }
  await upsertAttendanceRecord({
    ...existing,
    pharmacyId: options?.pharmacyId ?? existing?.pharmacyId,
    userId,
    userName,
    workDate: date,
    checkOut: new Date().toISOString(),
  });
}

export async function setAttendanceStatus(
  userId: string,
  userName: string,
  workDate: string,
  status: AttendanceStatus,
  notes?: string,
) {
  const existing = await getAttendanceForDay(userId, workDate);
  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate,
    status,
    notes: notes ?? existing?.notes,
    checkIn:
      status === "absent" || status === "leave" || status === "sick"
        ? undefined
        : existing?.checkIn,
    checkOut:
      status === "absent" || status === "leave" || status === "sick"
        ? undefined
        : existing?.checkOut,
  });
}
