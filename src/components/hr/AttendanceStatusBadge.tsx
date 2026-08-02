import type { AttendanceStatus, EarlyLeaveOutcome } from "../types";
import { statusLabel } from "../../utils/hrFormatters";

type AttendanceStatusBadgeProps = {
  status: AttendanceStatus | string | undefined;
  isArabic: boolean;
  timing?: { isLate: boolean; isEarlyLeave: boolean };
  earlyLeave?: {
    rawEarlyLeave: boolean;
    effectiveOutcome: EarlyLeaveOutcome;
    canToggle?: boolean;
    resolving?: boolean;
    onToggle?: (outcome: EarlyLeaveOutcome) => void;
  };
};

export default function AttendanceStatusBadge({
  status,
  isArabic,
  timing,
  earlyLeave,
}: AttendanceStatusBadgeProps) {
  if (!status) {
    return (
      <span className="hrAttendanceStatus hrAttendanceStatusEmpty">
        {isArabic ? "لم يسجل" : "Not recorded"}
      </span>
    );
  }

  const hasEarlyLeaveUi = Boolean(earlyLeave?.rawEarlyLeave);
  const isWorkAttendance =
    status === "present" || status === "late" || (timing && timing.isLate) || hasEarlyLeaveUi;

  if (isWorkAttendance && (status === "present" || status === "late" || timing || hasEarlyLeaveUi)) {
    const earlyLeaveIsPermission = earlyLeave?.effectiveOutcome !== "deduction";
    const earlyLeaveLabel = earlyLeaveIsPermission
      ? isArabic
        ? "إذن"
        : "Permission"
      : isArabic
        ? "خصم"
        : "Deduction";
    const earlyLeaveClass = earlyLeaveIsPermission
      ? "hrAttendanceFlagPermission"
      : "hrAttendanceFlagDeduction";
    const toggleTitle = earlyLeave?.canToggle
      ? earlyLeaveIsPermission
        ? isArabic
          ? "اضغط للتحويل إلى خصم"
          : "Click to mark as deduction"
        : isArabic
          ? "اضغط للتحويل إلى إذن"
          : "Click to mark as permission"
      : undefined;

    return (
      <span className="hrAttendanceStatusWrap">
        <span className="hrAttendanceStatus hrAttendanceStatus-present">
          {isArabic ? "حاضر" : "Present"}
        </span>
        {timing?.isLate && (
          <span className="hrAttendanceFlag hrAttendanceFlagLate">
            {isArabic ? "تأخير" : "Late"}
          </span>
        )}
        {hasEarlyLeaveUi &&
          (earlyLeave?.canToggle ? (
            <button
              type="button"
              className={`hrAttendanceFlag ${earlyLeaveClass} hrAttendanceFlagClickable`}
              title={toggleTitle}
              disabled={earlyLeave.resolving}
              onClick={() =>
                earlyLeave.onToggle?.(earlyLeaveIsPermission ? "deduction" : "permission")
              }
            >
              {earlyLeaveLabel}
            </button>
          ) : (
            <span className={`hrAttendanceFlag ${earlyLeaveClass}`}>{earlyLeaveLabel}</span>
          ))}
      </span>
    );
  }

  return (
    <span className={`hrAttendanceStatus hrAttendanceStatus-${status}`}>
      {statusLabel(status, isArabic)}
    </span>
  );
}
