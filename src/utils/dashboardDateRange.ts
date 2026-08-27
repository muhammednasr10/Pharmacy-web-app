import { formatDateInput } from "./date";

export type DashboardPeriod = "today" | "7days" | "month" | "custom";

export function getDashboardDateRange(
  period: DashboardPeriod,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } {
  const now = new Date();
  let from = new Date();
  let to = new Date();

  if (period === "today") {
    from = new Date(`${formatDateInput(now)}T00:00:00`);
    to = new Date(`${formatDateInput(now)}T23:59:59`);
  }

  if (period === "7days") {
    from = new Date();
    from.setDate(from.getDate() - 6);
    from = new Date(`${formatDateInput(from)}T00:00:00`);
    to = new Date(`${formatDateInput(now)}T23:59:59`);
  }

  if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  if (period === "custom") {
    from = new Date(`${customFrom}T00:00:00`);
    to = new Date(`${customTo}T23:59:59`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
      from = new Date(`${formatDateInput(now)}T00:00:00`);
      to = new Date(`${formatDateInput(now)}T23:59:59`);
    } else if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
  }

  return { from, to };
}
