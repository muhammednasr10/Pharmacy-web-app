export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
