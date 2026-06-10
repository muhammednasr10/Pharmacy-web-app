const ATT_PREFIX = "ATT:";

export function normalizeAttendanceCode(value: string) {
  return value.trim().toUpperCase();
}

export function buildEmployeeAttendanceToken(pharmacyId: string, employeeCode: string) {
  return `${ATT_PREFIX}${pharmacyId}:${normalizeAttendanceCode(employeeCode)}`;
}

export function parseEmployeeAttendanceCode(raw: string): {
  pharmacyId?: string;
  employeeCode: string;
} {
  const clean = raw.trim();
  if (!clean) {
    return { employeeCode: "" };
  }

  const upper = clean.toUpperCase();
  if (upper.startsWith(ATT_PREFIX)) {
    const body = clean.slice(ATT_PREFIX.length);
    const colon = body.indexOf(":");
    if (colon > 0) {
      return {
        pharmacyId: body.slice(0, colon).trim(),
        employeeCode: normalizeAttendanceCode(body.slice(colon + 1)),
      };
    }
  }

  if (clean.startsWith("{")) {
    try {
      const json = JSON.parse(clean) as {
        pharmacyId?: string;
        code?: string;
        employeeCode?: string;
      };
      const code = json.code || json.employeeCode;
      if (code) {
        return {
          pharmacyId: json.pharmacyId,
          employeeCode: normalizeAttendanceCode(String(code)),
        };
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  return { employeeCode: normalizeAttendanceCode(clean) };
}

export function resolveStaffFromAttendanceCode<T extends { employeeCode?: string; pharmacyId: string }>(
  staffRows: T[],
  rawCode: string,
  options?: { pharmacyIds?: string[] }
): T | null {
  const parsed = parseEmployeeAttendanceCode(rawCode);
  if (!parsed.employeeCode) return null;

  const tokenMatch = normalizeAttendanceCode(rawCode);
  const scopedRows = parsed.pharmacyId
    ? staffRows.filter((row) => row.pharmacyId === parsed.pharmacyId)
    : options?.pharmacyIds?.length
      ? staffRows.filter((row) => options.pharmacyIds!.includes(row.pharmacyId))
      : staffRows;

  const direct = scopedRows.find(
    (row) =>
      row.employeeCode &&
      (normalizeAttendanceCode(row.employeeCode) === parsed.employeeCode ||
        buildEmployeeAttendanceToken(row.pharmacyId, row.employeeCode) === tokenMatch)
  );
  return direct || null;
}
