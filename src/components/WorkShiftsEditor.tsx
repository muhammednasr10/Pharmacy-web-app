import { useMemo, useState } from "react";
import WorkScheduleEditor from "./WorkScheduleEditor";
import {
  computeWorkHoursFromSchedule,
  createNextShiftId,
  createPharmacyShift,
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
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftId>(
    () => shifts[0]?.id || defaultShiftId || "A",
  );

  const selectedShift = useMemo(
    () => shifts.find((shift) => shift.id === selectedShiftId) || shifts[0] || null,
    [shifts, selectedShiftId],
  );

  function updateShift(shiftId: ShiftId, patch: Partial<PharmacyShift>) {
    onShiftsChange(shifts.map((shift) => (shift.id === shiftId ? { ...shift, ...patch } : shift)));
  }

  function addShift() {
    if (disabled) return;
    const id = createNextShiftId(shifts);
    const next = createPharmacyShift({
      id,
      label: `Shift ${id}`,
      labelAr: `شيفت ${id}`,
      dayStart: "08:00",
      dayEnd: "17:00",
      breaks: [],
      allowedLateMinutes: 15,
    });
    onShiftsChange([...shifts, next]);
    setSelectedShiftId(id);
  }

  function deleteShift(shiftId: ShiftId) {
    if (disabled) return;
    if (shifts.length <= 1) {
      alert(isArabic ? "لازم يبقى شيفت واحد على الأقل" : "At least one shift is required");
      return;
    }
    const label = getShiftDisplayName(shiftId, shifts, isArabic);
    const confirmed = window.confirm(
      isArabic ? `حذف الشيفت «${label}»؟` : `Delete shift «${label}»?`,
    );
    if (!confirmed) return;

    const next = shifts.filter((shift) => shift.id !== shiftId);
    onShiftsChange(next);
    if (defaultShiftId === shiftId) {
      onDefaultShiftChange(next[0].id);
    }
    if (selectedShiftId === shiftId) {
      setSelectedShiftId(next[0].id);
    }
  }

  return (
    <div className="workShiftsEditor">
      <div className="workShiftsTableToolbar">
        {!disabled ? (
          <button type="button" className="completeBtn smallBtn" onClick={addShift}>
            {isArabic ? "+ إضافة شيفت" : "+ Add shift"}
          </button>
        ) : null}
        <span className="workShiftsTableCount">
          {shifts.length} {isArabic ? "شيفت" : shifts.length === 1 ? "shift" : "shifts"}
        </span>
      </div>

      <div className="tableWrap workShiftsTableWrap">
        <table className="workShiftsTable">
          <thead>
            <tr>
              <th>{isArabic ? "الاسم" : "Name"}</th>
              <th>{isArabic ? "من" : "From"}</th>
              <th>{isArabic ? "إلى" : "To"}</th>
              <th>{isArabic ? "التأخير" : "Late"}</th>
              <th>{isArabic ? "ساعات" : "Hours"}</th>
              <th>{isArabic ? "افتراضي" : "Default"}</th>
              {!disabled ? <th>{isArabic ? "إجراءات" : "Actions"}</th> : null}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => {
              const hours = computeWorkHoursFromSchedule({
                dayStart: shift.dayStart,
                dayEnd: shift.dayEnd,
                breaks: shift.breaks,
              });
              const isSelected = selectedShift?.id === shift.id;
              return (
                <tr
                  key={shift.id}
                  className={isSelected ? "is-selected" : undefined}
                  onClick={() => setSelectedShiftId(shift.id)}
                >
                  <td>
                    <div className="workShiftsNameFields">
                      <input
                        className="tableInput"
                        disabled={disabled}
                        value={isArabic ? shift.labelAr : shift.label}
                        onChange={(e) =>
                          updateShift(shift.id, isArabic ? { labelAr: e.target.value } : { label: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        aria-label={isArabic ? "اسم الشيفت" : "Shift name"}
                      />
                      <input
                        className="tableInput workShiftsAltName"
                        disabled={disabled}
                        dir={isArabic ? "ltr" : "rtl"}
                        value={isArabic ? shift.label : shift.labelAr}
                        onChange={(e) =>
                          updateShift(shift.id, isArabic ? { label: e.target.value } : { labelAr: e.target.value })
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder={isArabic ? "الاسم بالإنجليزية" : "Arabic name"}
                        aria-label={isArabic ? "الاسم بالإنجليزية" : "Arabic name"}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="time"
                      className="tableInput"
                      disabled={disabled}
                      value={shift.dayStart}
                      onChange={(e) => updateShift(shift.id, { dayStart: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      className="tableInput"
                      disabled={disabled}
                      value={shift.dayEnd}
                      onChange={(e) => updateShift(shift.id, { dayEnd: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      className="tableInput workShiftsLateInput"
                      disabled={disabled}
                      value={shift.allowedLateMinutes ?? 15}
                      onChange={(e) =>
                        updateShift(shift.id, {
                          allowedLateMinutes: Math.min(180, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={isArabic ? "حد التأخير بالدقيقة" : "Lateness minutes"}
                    />
                  </td>
                  <td>{hours}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="radio"
                      name="defaultShift"
                      checked={defaultShiftId === shift.id}
                      disabled={disabled}
                      onChange={() => onDefaultShiftChange(shift.id)}
                      aria-label={isArabic ? "شيفت افتراضي" : "Default shift"}
                    />
                  </td>
                  {!disabled ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="dangerBtn smallBtn"
                        disabled={shifts.length <= 1}
                        onClick={() => deleteShift(shift.id)}
                      >
                        {isArabic ? "حذف" : "Delete"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedShift ? (
        <div className="workShiftsPanel">
          <div className="workShiftsPanelHead">
            <strong>
              {isArabic ? "تفاصيل" : "Details"}:{" "}
              {getShiftDisplayName(selectedShift.id, shifts, isArabic)}
            </strong>
            <span className="workScheduleHint">
              {isArabic
                ? `بعد ${selectedShift.allowedLateMinutes ?? 15} دقيقة من بداية الشيفت (${selectedShift.dayStart}) يُسجَّل تأخير. نفس المدة قبل النهاية (${selectedShift.dayEnd}) كسماح.`
                : `After ${selectedShift.allowedLateMinutes ?? 15} min from start (${selectedShift.dayStart}) marks late. Same grace before end (${selectedShift.dayEnd}).`}
            </span>
          </div>
          <WorkScheduleEditor
            isArabic={isArabic}
            disabled={disabled}
            schedule={{
              dayStart: selectedShift.dayStart,
              dayEnd: selectedShift.dayEnd,
              breaks: selectedShift.breaks,
            }}
            onChange={(schedule) =>
              updateShift(selectedShift.id, {
                dayStart: schedule.dayStart,
                dayEnd: schedule.dayEnd,
                breaks: schedule.breaks,
              })
            }
            showComputedHours={false}
          />
        </div>
      ) : null}
    </div>
  );
}
