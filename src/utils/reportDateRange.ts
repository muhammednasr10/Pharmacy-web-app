import { formatDateInput } from "./date";

export type ReportQuickRangePreset = "today" | "7days" | "month" | "year";

export function getReportQuickRange(preset: ReportQuickRangePreset): {
  from: string;
  to: string;
} {
  const today = new Date();
  let from = new Date();

  if (preset === "today") {
    from = today;
  } else if (preset === "7days") {
    from = new Date(today.getTime() - 6 * 86400000);
  } else if (preset === "month") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    from = new Date(today.getFullYear(), 0, 1);
  }

  return {
    from: formatDateInput(from),
    to: formatDateInput(today),
  };
}
