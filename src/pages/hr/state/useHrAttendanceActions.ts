import { useCallback } from "react";
import type {
  AttendanceRecord,
  AttendanceStatus,
  EarlyLeaveOutcome,
  ShiftId,
} from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  ATTENDANCE_SHIFT_ONLY_PRESET_NOTE,
  isoToTimeInput,
  isShiftOnlyPresetRecord,
  statusClearsTimes,
} from "../../../utils/hrFormatters";
import {
  isCheckInLate,
  resolveAllowedLateMinutes,
  resolveScheduleForShiftId,
  resolveWorkSchedule,
} from "../../../utils/workSchedule";
import type { AttendanceLogDraft, HrStaffRow } from "../types";

type PayrollConfig = pharmacyService.PayrollSettingsValues;

type Params = {
  isArabic: boolean;
  todayIso: string;
  payrollConfig: PayrollConfig;
  staffRows: HrStaffRow[];
  attendanceLogEdit: AttendanceLogDraft | null;
  setAttendanceLogEdit: React.Dispatch<React.SetStateAction<AttendanceLogDraft | null>>;
  setBusyAction: React.Dispatch<React.SetStateAction<string>>;
  invalidateAttendance: () => Promise<void>;
};

export function useHrAttendanceActions({
  isArabic,
  todayIso,
  payrollConfig,
  staffRows,
  attendanceLogEdit,
  setAttendanceLogEdit,
  setBusyAction,
  invalidateAttendance,
}: Params) {
  const handleCheckIn = useCallback(
    async (userId: string, userName: string, workDate = todayIso) => {
      setBusyAction(`in-${userId}`);
      try {
        const staff = staffRows.find((row) => row.attendanceKey === userId);
        const schedule = staff
          ? resolveWorkSchedule(staff, payrollConfig.workShifts, payrollConfig.defaultShiftId)
          : null;
        const graceMinutes = schedule
          ? resolveAllowedLateMinutes(schedule.shiftId, payrollConfig.workShifts)
          : undefined;
        await pharmacyService.recordCheckIn(userId, userName, workDate, {
          expectedSchedule: schedule ?? undefined,
          shiftId: schedule?.shiftId,
          graceMinutes,
        });
        await invalidateAttendance();
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        alert(
          code === "already_checked_in"
            ? isArabic
              ? "تم تسجيل الحضور مسبقاً"
              : "Already checked in"
            : isArabic
              ? "تعذر تسجيل الحضور"
              : "Could not check in",
        );
      } finally {
        setBusyAction("");
      }
    },
    [
      todayIso,
      staffRows,
      payrollConfig.workShifts,
      payrollConfig.defaultShiftId,
      setBusyAction,
      invalidateAttendance,
      isArabic,
    ],
  );

  const handleCheckOut = useCallback(
    async (userId: string, userName: string, workDate = todayIso) => {
      setBusyAction(`out-${userId}`);
      try {
        await pharmacyService.recordCheckOut(userId, userName, workDate);
        await invalidateAttendance();
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        alert(
          code === "check_in_required"
            ? isArabic
              ? "سجّل الحضور أولاً"
              : "Check in first"
            : code === "already_checked_out"
              ? isArabic
                ? "تم تسجيل الانصراف مسبقاً"
                : "Already checked out"
              : isArabic
                ? "تعذر تسجيل الانصراف"
                : "Could not check out",
        );
      } finally {
        setBusyAction("");
      }
    },
    [todayIso, setBusyAction, invalidateAttendance, isArabic],
  );

  const handleSetStatus = useCallback(
    async (userId: string, userName: string, status: AttendanceStatus, workDate = todayIso) => {
      setBusyAction(`status-${userId}`);
      try {
        await pharmacyService.setAttendanceStatus(userId, userName, workDate, status);
        await invalidateAttendance();
      } catch {
        alert(isArabic ? "تعذر تحديث الحالة" : "Could not update status");
      } finally {
        setBusyAction("");
      }
    },
    [todayIso, setBusyAction, invalidateAttendance, isArabic],
  );

  const beginAttendanceLogEdit = useCallback(
    (workDate: string, emp: HrStaffRow, record?: AttendanceRecord) => {
      const plannedSchedule = resolveWorkSchedule(
        emp,
        payrollConfig.workShifts,
        payrollConfig.defaultShiftId,
      );
      setAttendanceLogEdit({
        userId: emp.attendanceKey,
        userName: emp.name,
        workDate,
        status: record?.status ?? "",
        checkInTime: isoToTimeInput(record?.checkIn),
        checkOutTime: isoToTimeInput(record?.checkOut),
        actualShiftId: record?.shiftId || plannedSchedule.shiftId,
        recordId: record?.id,
      });
    },
    [payrollConfig.workShifts, payrollConfig.defaultShiftId, setAttendanceLogEdit],
  );

  const updateActualShiftOnly = useCallback(
    async (
      emp: HrStaffRow,
      workDate: string,
      record: AttendanceRecord | undefined,
      actualShiftId: ShiftId,
      plannedShiftId: ShiftId,
    ) => {
      if (!record && actualShiftId === plannedShiftId) return;

      setBusyAction(`shift-${emp.attendanceKey}-${workDate}`);
      try {
        if (!record) {
          await pharmacyService.upsertAttendanceRecord({
            userId: emp.attendanceKey,
            userName: emp.name,
            workDate,
            shiftId: actualShiftId,
            status: "absent",
            notes: ATTENDANCE_SHIFT_ONLY_PRESET_NOTE,
            checkIn: null,
            checkOut: null,
          });
        } else if (isShiftOnlyPresetRecord(record) && actualShiftId === plannedShiftId) {
          await pharmacyService.deleteAttendanceRecord(record.id);
        } else {
          await pharmacyService.upsertAttendanceRecord({
            id: record.id,
            userId: emp.attendanceKey,
            userName: emp.name,
            workDate,
            status: record.status,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            shiftId: actualShiftId,
            notes: record.notes,
          });
        }
        await invalidateAttendance();
      } catch {
        alert(isArabic ? "تعذر تحديث الشيفت الفعلي" : "Could not update actual shift");
      } finally {
        setBusyAction("");
      }
    },
    [setBusyAction, invalidateAttendance, isArabic],
  );

  const setEarlyLeaveOutcome = useCallback(
    async (
      emp: HrStaffRow,
      workDate: string,
      record: AttendanceRecord,
      outcome: EarlyLeaveOutcome,
    ) => {
      setBusyAction(`early-${emp.attendanceKey}-${workDate}`);
      try {
        await pharmacyService.upsertAttendanceRecord({
          id: record.id,
          userId: emp.attendanceKey,
          userName: emp.name,
          workDate,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          shiftId: record.shiftId,
          earlyLeaveOutcome: outcome,
        });
        await invalidateAttendance();
      } catch {
        alert(isArabic ? "تعذر حفظ قرار الانصراف المبكر" : "Could not save early leave decision");
      } finally {
        setBusyAction("");
      }
    },
    [setBusyAction, invalidateAttendance, isArabic],
  );

  const saveAttendanceLogEdit = useCallback(async () => {
    if (!attendanceLogEdit) return;
    const {
      userId,
      userName,
      workDate,
      status,
      checkInTime,
      checkOutTime,
      actualShiftId,
      recordId,
    } = attendanceLogEdit;
    setBusyAction(`attendance-log-${userId}-${workDate}`);
    try {
      if (!status) {
        if (recordId) {
          await pharmacyService.deleteAttendanceRecord(recordId);
        }
      } else {
        const clearsTimes = statusClearsTimes(status);
        const checkIn = clearsTimes
          ? null
          : pharmacyService.buildAttendanceCheckInIso(workDate, checkInTime);
        const checkOut = clearsTimes
          ? null
          : pharmacyService.buildAttendanceCheckOutIso(workDate, checkInTime, checkOutTime);
        const actualSchedule = resolveScheduleForShiftId(
          actualShiftId,
          payrollConfig.workShifts,
          payrollConfig.defaultShiftId,
        );
        let finalStatus = status;
        if (checkIn && (status === "present" || status === "late")) {
          const graceMinutes = resolveAllowedLateMinutes(
            actualSchedule.shiftId,
            payrollConfig.workShifts,
          );
          finalStatus = isCheckInLate(checkIn, actualSchedule, graceMinutes) ? "late" : "present";
        }
        await pharmacyService.upsertAttendanceRecord({
          id: recordId,
          userId,
          userName,
          workDate,
          status: finalStatus,
          checkIn,
          checkOut,
          shiftId: actualSchedule.shiftId,
          // Distinguish real leave/sick/absent from shift-only presets after reload.
          notes: "",
        });
      }
      await invalidateAttendance();
      setAttendanceLogEdit(null);
    } catch {
      alert(isArabic ? "تعذر حفظ سجل الحضور" : "Could not save attendance record");
    } finally {
      setBusyAction("");
    }
  }, [
    attendanceLogEdit,
    setBusyAction,
    payrollConfig.workShifts,
    payrollConfig.defaultShiftId,
    invalidateAttendance,
    setAttendanceLogEdit,
    isArabic,
  ]);

  return {
    handleCheckIn,
    handleCheckOut,
    handleSetStatus,
    beginAttendanceLogEdit,
    updateActualShiftOnly,
    setEarlyLeaveOutcome,
    saveAttendanceLogEdit,
  };
}
