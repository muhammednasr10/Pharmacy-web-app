export type MedicineCatalogImportRow = {
  name_ar: string;
  name_en: string;
  active_ingredient?: string;
  barcode: string;
  qty: number;
  price: number;
  buy_price?: number;
  expiry: string;
};

/** App-ready CSV shipped in supabase/egyptian-medicine-catalog.csv */
export const MEDICINE_CATALOG_CSV_FILENAME = "egyptian-medicine-catalog.csv";

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

function readCsvRow(headers: string[], cells: string[]) {
  const record: Record<string, string> = {};
  headers.forEach((header, cellIndex) => {
    record[header] = cells[cellIndex] ?? "";
  });
  return record;
}

/** Columns: name_ar, name_en, active_ingredient, barcode, qty, price, buy_price, expiry */
export function parseAppCatalogCsv(text: string): MedicineCatalogImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: MedicineCatalogImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length === 0) continue;

    const record = readCsvRow(headers, cells);
    const nameAr = cleanText(record.name_ar);
    const nameEn = cleanText(record.name_en || nameAr);
    if (!nameAr && !nameEn) continue;

    const price = Math.max(0, Number(record.price ?? 0) || 0);
    const buyRaw = record.buy_price;
    const buyPrice =
      buyRaw != null && buyRaw !== ""
        ? Math.max(0, Number(buyRaw) || 0)
        : price > 0
          ? Math.round(price * 0.85 * 100) / 100
          : undefined;

    rows.push({
      name_ar: nameAr.slice(0, 500),
      name_en: nameEn.slice(0, 500),
      active_ingredient: cleanText(record.active_ingredient) || undefined,
      barcode: cleanText(record.barcode) || buildCatalogBarcode(nameEn || nameAr, lineIndex - 1),
      qty: Math.max(0, Math.floor(Number(record.qty ?? 0) || 0)),
      price,
      buy_price: buyPrice,
      expiry: cleanText(record.expiry) || CATALOG_PLACEHOLDER_EXPIRY,
    });
  }

  return rows;
}

type LegacyEgyptianDrugRecord = {
  commercial_name_en?: string;
  commercial_name_ar?: string;
  scientific_name?: string;
  manufacturer?: string;
  price_egp?: number | null;
};

function mapLegacyEgyptianDrug(record: LegacyEgyptianDrugRecord, index: number): MedicineCatalogImportRow | null {
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
    active_ingredient: scientific ? scientific.slice(0, 500) : undefined,
    barcode: buildCatalogBarcode(commercialEn || commercialAr, index),
    qty: 0,
    price,
    buy_price: price > 0 ? Math.round(price * 0.85 * 100) / 100 : undefined,
    expiry: CATALOG_PLACEHOLDER_EXPIRY,
  };
}

function parseLegacyEgyptianDrugCsv(text: string): MedicineCatalogImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: MedicineCatalogImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length === 0) continue;

    const record = readCsvRow(headers, cells);
    const mapped = mapLegacyEgyptianDrug(
      {
        commercial_name_en: record.commercial_name_en,
        commercial_name_ar: record.commercial_name_ar,
        scientific_name: record.scientific_name,
        manufacturer: record.manufacturer,
        price_egp: record.price_egp ? Number(record.price_egp) : null,
      },
      lineIndex - 1,
    );
    if (mapped) rows.push(mapped);
  }

  return rows;
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
      const mapped = mapLegacyEgyptianDrug(record as LegacyEgyptianDrugRecord, index);
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
      active_ingredient: cleanText(record.active_ingredient || record.activeIngredient) || undefined,
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

export function parseMedicineCatalogFile(text: string, filename = ""): MedicineCatalogImportRow[] {
  const trimmed = text.trimStart();
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseMedicineCatalogJson(text);
  }

  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0]?.toLowerCase() ?? "";
  if (firstLine.includes("commercial_name_en")) {
    return parseLegacyEgyptianDrugCsv(text);
  }

  return parseAppCatalogCsv(text);
}

export function chunkCatalogRows<T>(rows: T[], size = MEDICINE_CATALOG_IMPORT_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

/** Header row required by parseAppCatalogCsv (English keys). */
export const MEDICINE_CATALOG_CSV_HEADERS = [
  "name_ar",
  "name_en",
  "active_ingredient",
  "barcode",
  "qty",
  "price",
  "buy_price",
  "expiry",
] as const;

export const MEDICINE_CATALOG_CSV_TEMPLATE_ROWS: string[][] = [
  [...MEDICINE_CATALOG_CSV_HEADERS],
  [
    "بنادول إكسترا",
    "Panadol Extra",
    "Paracetamol + Caffeine",
    "6224000000001",
    "50",
    "25.5",
    "18",
    "2027-12-31",
  ],
  [
    "أوجمنتين 1 جم",
    "Augmentin 1g",
    "Amoxicillin + Clavulanic acid",
    "6224000000002",
    "24",
    "95",
    "70",
    "2026-06-30",
  ],
];

export function downloadMedicineCatalogCsvTemplate() {
  const lines = MEDICINE_CATALOG_CSV_TEMPLATE_ROWS.map((row) =>
    row
      .map((cell) => {
        const text = String(cell ?? "");
        if (/[",\n\r]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      })
      .join(","),
  );
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "victory-medicine-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
