export type EgyptianDrugRecord = {
  commercial_name_en?: string;
  commercial_name_ar?: string;
  scientific_name?: string;
  manufacturer?: string;
  drug_class?: string;
  route?: string;
  price_egp?: number | null;
};

export type MedicineCatalogImportRow = {
  name_ar: string;
  name_en: string;
  barcode: string;
  qty: number;
  price: number;
  buy_price?: number;
  expiry: string;
};

export const EGYPTIAN_DRUGS_JSON_URL =
  "https://raw.githubusercontent.com/karem505/egyptian-drug-database/main/data/egyptian-drugs.json";

export const EGYPTIAN_DRUGS_CSV_URL =
  "https://raw.githubusercontent.com/karem505/egyptian-drug-database/main/data/egyptian-drugs.csv";

export const MEDICINE_CATALOG_IMPORT_BATCH_SIZE = 250;

const CATALOG_PLACEHOLDER_EXPIRY = "2099-12-31";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function buildCatalogBarcode(seed: string, index: number) {
  const normalized = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  return `EG${String(index + 1).padStart(6, "0")}${normalized ? normalized.slice(0, 6) : "RX"}`;
}

export function mapEgyptianDrugToCatalogRow(
  record: EgyptianDrugRecord,
  index: number,
): MedicineCatalogImportRow | null {
  const commercialEn = cleanText(record.commercial_name_en);
  const commercialAr = cleanText(record.commercial_name_ar);
  const scientific = cleanText(record.scientific_name);
  const manufacturer = cleanText(record.manufacturer);

  if (!commercialEn && !commercialAr) return null;

  const nameAr = commercialAr || commercialEn;
  const nameEnParts = [commercialEn || commercialAr];
  if (scientific) nameEnParts.push(scientific);
  if (manufacturer) nameEnParts.push(manufacturer);

  const price =
    typeof record.price_egp === "number" && Number.isFinite(record.price_egp)
      ? Math.max(0, record.price_egp)
      : 0;

  return {
    name_ar: nameAr.slice(0, 500),
    name_en: nameEnParts.join(" · ").slice(0, 500),
    barcode: buildCatalogBarcode(commercialEn || commercialAr, index),
    qty: 0,
    price,
    buy_price: price > 0 ? Math.round(price * 0.85 * 100) / 100 : undefined,
    expiry: CATALOG_PLACEHOLDER_EXPIRY,
  };
}

export function mapEgyptianDrugRecords(records: EgyptianDrugRecord[]): MedicineCatalogImportRow[] {
  const rows: MedicineCatalogImportRow[] = [];
  records.forEach((record, index) => {
    const mapped = mapEgyptianDrugToCatalogRow(record, index);
    if (mapped) rows.push(mapped);
  });
  return rows;
}

export async function fetchEgyptianDrugCatalogRows(): Promise<MedicineCatalogImportRow[]> {
  const response = await fetch(EGYPTIAN_DRUGS_JSON_URL);
  if (!response.ok) {
    throw new Error(`fetch_failed_${response.status}`);
  }
  const payload = (await response.json()) as EgyptianDrugRecord[];
  if (!Array.isArray(payload)) {
    throw new Error("invalid_json");
  }
  return mapEgyptianDrugRecords(payload);
}

export function parseMedicineCatalogJson(text: string): MedicineCatalogImportRow[] {
  const payload = JSON.parse(text) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("invalid_json");
  }

  const rows: MedicineCatalogImportRow[] = [];
  payload.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;

    if ("commercial_name_en" in record || "commercial_name_ar" in record) {
      const mapped = mapEgyptianDrugToCatalogRow(record as EgyptianDrugRecord, index);
      if (mapped) rows.push(mapped);
      return;
    }

    const nameAr = cleanText(record.name_ar || record.nameAr);
    const nameEn = cleanText(record.name_en || record.nameEn || nameAr);
    if (!nameAr && !nameEn) return;

    const price = Math.max(0, Number(record.price ?? record.price_egp ?? 0) || 0);
    rows.push({
      name_ar: nameAr.slice(0, 500),
      name_en: nameEn.slice(0, 500),
      barcode: cleanText(record.barcode) || buildCatalogBarcode(nameEn || nameAr, index),
      qty: Math.max(0, Math.floor(Number(record.qty ?? 0) || 0)),
      price,
      buy_price:
        record.buy_price != null || record.buyPrice != null
          ? Math.max(0, Number(record.buy_price ?? record.buyPrice) || 0)
          : price > 0
            ? Math.round(price * 0.85 * 100) / 100
            : undefined,
      expiry: cleanText(record.expiry) || CATALOG_PLACEHOLDER_EXPIRY,
    });
  });

  return rows;
}

export function parseEgyptianDrugCsv(text: string): MedicineCatalogImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const records: EgyptianDrugRecord[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length === 0) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? "";
    });
    records.push({
      commercial_name_en: record.commercial_name_en,
      commercial_name_ar: record.commercial_name_ar,
      scientific_name: record.scientific_name,
      manufacturer: record.manufacturer,
      drug_class: record.drug_class,
      route: record.route,
      price_egp: record.price_egp ? Number(record.price_egp) : null,
    });
  }

  return mapEgyptianDrugRecords(records);
}

export function chunkCatalogRows<T>(rows: T[], size = MEDICINE_CATALOG_IMPORT_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}
