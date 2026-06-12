import {
  computeWorkHoursFromSchedule,
  emptyWorkBreak,
  type WorkBreak,
  type WorkSchedule,
} from "../utils/workSchedule";

type WorkScheduleEditorProps = {
  isArabic: boolean;
  schedule: WorkSchedule;
  disabled?: boolean;
  onChange: (schedule: WorkSchedule) => void;
  showComputedHours?: boolean;
};

export default function WorkScheduleEditor({
  isArabic,
  schedule,
  disabled = false,
  onChange,
  showComputedHours = true,
}: WorkScheduleEditorProps) {
  const computedHours = computeWorkHoursFromSchedule(schedule);

  function updateBreak(index: number, patch: Partial<WorkBreak>) {
    const breaks = schedule.breaks.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange({ ...schedule, breaks });
  }

  function removeBreak(index: number) {
    onChange({ ...schedule, breaks: schedule.breaks.filter((_, i) => i !== index) });
  }

  function addBreak() {
    onChange({ ...schedule, breaks: [...schedule.breaks, emptyWorkBreak()] });
  }

  return (
    <div className="workScheduleEditor">
      <div className="workScheduleTimes">
        <label>
          {isArabic ? "بداية اليوم" : "Day start"}
          <input
            type="time"
            className="tableInput"
            value={schedule.dayStart}
            disabled={disabled}
            onChange={(e) => onChange({ ...schedule, dayStart: e.target.value })}
          />
        </label>
        <label>
          {isArabic ? "نهاية اليوم" : "Day end"}
          <input
            type="time"
            className="tableInput"
            value={schedule.dayEnd}
            disabled={disabled}
            onChange={(e) => onChange({ ...schedule, dayEnd: e.target.value })}
          />
        </label>
      </div>

      {showComputedHours && (
        <p className="workScheduleHint">
          {isArabic
            ? `صافي ساعات العمل المحسوبة: ${computedHours} ساعة`
            : `Computed net work hours: ${computedHours}h`}
        </p>
      )}

      <div className="workScheduleBreaks">
        <div className="workScheduleBreaksHeader">
          <strong>{isArabic ? "أوقات الراحة" : "Break times"}</strong>
          {!disabled && (
            <button type="button" className="smallBtn" onClick={addBreak}>
              {isArabic ? "+ إضافة راحة" : "+ Add break"}
            </button>
          )}
        </div>

        {schedule.breaks.length === 0 ? (
          <p className="workScheduleEmpty">
            {isArabic ? "لا توجد فترات راحة" : "No breaks configured"}
          </p>
        ) : (
          schedule.breaks.map((br, index) => (
            <div key={`break-${index}`} className="workScheduleBreakRow">
              <label>
                {isArabic ? "من" : "From"}
                <input
                  type="time"
                  className="tableInput"
                  value={br.start}
                  disabled={disabled}
                  onChange={(e) => updateBreak(index, { start: e.target.value })}
                />
              </label>
              <label>
                {isArabic ? "إلى" : "To"}
                <input
                  type="time"
                  className="tableInput"
                  value={br.end}
                  disabled={disabled}
                  onChange={(e) => updateBreak(index, { end: e.target.value })}
                />
              </label>
              {!disabled && (
                <button
                  type="button"
                  className="deleteSmallBtn workScheduleRemoveBtn"
                  onClick={() => removeBreak(index)}
                  aria-label={isArabic ? "حذف الراحة" : "Remove break"}
                >
                  {isArabic ? "حذف" : "Remove"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
