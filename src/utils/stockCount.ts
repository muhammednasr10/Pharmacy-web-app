import type { Medicine } from "../types";

export type StockCountLine = {
  medicineId: number;
  barcode: string;
  name_ar: string;
  name_en: string;
  systemQty: number;
  countedQty: number;
  pharmacyId?: string;
};

export type StockCountSession = {
  id: string;
  pharmacyId: string;
  startedAt: string;
  notes: string;
  lines: StockCountLine[];
};

export type StockCountSummary = {
  totalLines: number;
  matchedLines: number;
  varianceLines: number;
  totalSystemQty: number;
  totalCountedQty: number;
  totalVariance: number;
};

const STORAGE_PREFIX = "focus-stock-count";

function storageKey(pharmacyId: string) {
  return `${STORAGE_PREFIX}-${pharmacyId}`;
}

export function createStockCountSession(pharmacyId: string): StockCountSession {
  return {
    id: `sc-${Date.now()}`,
    pharmacyId,
    startedAt: new Date().toISOString(),
    notes: "",
    lines: [],
  };
}

export function medicineToCountLine(medicine: Medicine, countedQty = 1): StockCountLine {
  return {
    medicineId: medicine.id,
    barcode: medicine.barcode || "",
    name_ar: medicine.name_ar,
    name_en: medicine.name_en,
    systemQty: medicine.qty,
    countedQty,
    pharmacyId: medicine.pharmacyId,
  };
}

export function recordStockCountScan(
  session: StockCountSession,
  medicine: Medicine,
  increment = 1,
): StockCountSession {
  const existing = session.lines.find((line) => line.medicineId === medicine.id);
  if (existing) {
    return {
      ...session,
      lines: session.lines.map((line) =>
        line.medicineId === medicine.id
          ? { ...line, countedQty: line.countedQty + increment }
          : line,
      ),
    };
  }
  return {
    ...session,
    lines: [...session.lines, medicineToCountLine(medicine, increment)],
  };
}

export function setStockCountLineQty(
  session: StockCountSession,
  medicineId: number,
  countedQty: number,
): StockCountSession {
  const safeQty = Math.max(0, Math.floor(Number(countedQty) || 0));
  return {
    ...session,
    lines: session.lines.map((line) =>
      line.medicineId === medicineId ? { ...line, countedQty: safeQty } : line,
    ),
  };
}

export function removeStockCountLine(
  session: StockCountSession,
  medicineId: number,
): StockCountSession {
  return {
    ...session,
    lines: session.lines.filter((line) => line.medicineId !== medicineId),
  };
}

export function getLineVariance(line: StockCountLine) {
  return line.countedQty - line.systemQty;
}

export function summarizeStockCountSession(session: StockCountSession): StockCountSummary {
  let matchedLines = 0;
  let varianceLines = 0;
  let totalSystemQty = 0;
  let totalCountedQty = 0;

  session.lines.forEach((line) => {
    totalSystemQty += line.systemQty;
    totalCountedQty += line.countedQty;
    const variance = getLineVariance(line);
    if (variance === 0) matchedLines += 1;
    else varianceLines += 1;
  });

  return {
    totalLines: session.lines.length,
    matchedLines,
    varianceLines,
    totalSystemQty,
    totalCountedQty,
    totalVariance: totalCountedQty - totalSystemQty,
  };
}

export function getVarianceLines(session: StockCountSession) {
  return session.lines.filter((line) => getLineVariance(line) !== 0);
}

export function loadStockCountSession(pharmacyId: string): StockCountSession | null {
  try {
    const raw = localStorage.getItem(storageKey(pharmacyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StockCountSession;
    if (!parsed || parsed.pharmacyId !== pharmacyId || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStockCountSession(session: StockCountSession) {
  try {
    localStorage.setItem(storageKey(session.pharmacyId), JSON.stringify(session));
  } catch {
    // Ignore storage errors.
  }
}

export function clearStockCountSession(pharmacyId: string) {
  try {
    localStorage.removeItem(storageKey(pharmacyId));
  } catch {
    // Ignore storage errors.
  }
}
