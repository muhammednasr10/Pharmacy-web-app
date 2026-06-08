import { useState } from "react";
import WorkScheduleEditor from "./WorkScheduleEditor";
import {
  SHIFT_IDS,
  getShiftDisplayName,
  type PharmacyShift,
  type ShiftId,
} from "../utils/workSchedule";

type WorkShiftsEditorProps = {
  isArabic: boolean;
  shifts: PharmacyShift[];
  defaultShiftId: ShiftId;
  disabled?: boolean;
  onShiftsChange: (shifts: PharmacyShift[]) => void;
  onDefaultShiftChange: (shiftId: ShiftId) => void;
};

export default function WorkShiftsEditor({
  isArabic,
  shifts,
  defaultShiftId,
  disabled = false,
  onShiftsChange,
  onDefaultShiftChange,
}: WorkShiftsEditorProps) {
  const [activeShiftId, setActiveShiftId] = useState<ShiftId>(SHIFT_IDS[0]);

  function updateShift(shiftId: ShiftId, patch: Partial<PharmacyShift>) {
    onShiftsChange(
      shifts.map((shift) => (shift.id === shiftId ? { ...shift, ...patch } : shift))
    );
  }

  const activeShift = shifts.find((shift) => shift.id === activeShiftId) || shifts[0];

  return (
    <div className="workShiftsEditor">
      <div className="workShiftsTabs" role="tablist">
        {SHIFT_IDS.map((shiftId) => (
          <button
            key={shiftId}
            type="button"
            role="tab"
            aria-selected={activeShiftId === shiftId}
            className={`workShiftsTab ${activeShiftId === shiftId ? "active" : ""}`}
            onClick={() => setActiveShiftId(shiftId)}
          >
            {getShiftDisplayName(shiftId, shifts, isArabic)}
          </button>
        ))}
      </div>

      {activeShift && (
        <div className="workShiftsPanel">
          <label className="workShiftDefaultPick">
            <input
              type="radio"
              name="defaultShift"
              checked={defaultShiftId === activeShift.id}
              disabled={disabled}
              onChange={() => onDefaultShiftChange(activeShift.id)}
            />
            {isArabic ? "الشيفت الافتراضي للموظفين الجدد" : "Default shift for new employees"}
          </label>

          <WorkScheduleEditor
            isArabic={isArabic}
            disabled={disabled}
            schedule={{
              dayStart: activeShift.dayStart,
              dayEnd: activeShift.dayEnd,
              breaks: activeShift.breaks,
            }}
            onChange={(schedule) =>
              updateShift(activeShift.id, {
                dayStart: schedule.dayStart,
                dayEnd: schedule.dayEnd,
                breaks: schedule.breaks,
              })
            }
          />

          <label className="workShiftLateGraceField">
            {isArabic ? "حد التأخير المسموح (دقيقة)" : "Allowed lateness (minutes)"}
            <input
              type="number"
              min={0}
              max={180}
              step={1}
              className="searchInput"
              disabled={disabled}
              value={activeShift.allowedLateMinutes ?? 15}
              onChange={(e) =>
                updateShift(activeShift.id, {
                  allowedLateMinutes: Math.min(180, Math.max(0, Number(e.target.value) || 0)),
                })
              }
            />
            <span className="workScheduleHint">
              {isArabic
                ? `بعد ${activeShift.allowedLateMinutes ?? 15} دقيقة من بداية الشيفت (${activeShift.dayStart}) يُسجَّل «تأخير». نفس المدة تُستخدم كسماح قبل نهاية الشيفت (${activeShift.dayEnd}) حتى لا يُحسب «إذن».`
                : `Check-in after ${activeShift.allowedLateMinutes ?? 15} min from shift start (${activeShift.dayStart}) marks late. Same grace applies before shift end (${activeShift.dayEnd}) for early leave.`}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
