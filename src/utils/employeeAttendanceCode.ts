const ATT_PREFIX = "ATT:";

export function normalizeAttendanceCode(value: string) {
  return value.trim().toUpperCase();
}

export function buildEmployeeAttendanceToken(pharmacyId: string, employeeCode: string) {
  return `${ATT_PREFIX}${pharmacyId}:${normalizeAttendanceCode(employeeCode)}`;
}
