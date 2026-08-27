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

const HEADER_ALIASES: Record<string, keyof MedicineCatalogImportRow | "active_ingredient"> = {
  name_ar: "name_ar",
  namear: "name_ar",
  "اسم عربي": "name_ar",
  "الاسم العربي": "name_ar",
  "اسم الدواء": "name_ar",
  name_en: "name_en",
  nameen: "name_en",
  "اسم انجليزي": "name_en",
  "الاسم الانجليزي": "name_en",
  "الاسم الإنجليزي": "name_en",
  active_ingredient: "active_ingredient",
  activeingredient: "active_ingredient",
  "المادة الفعالة": "active_ingredient",
  barcode: "barcode",
  "الباركود": "barcode",
  qty: "qty",
  quantity: "qty",
  "الكمية": "qty",
  price: "price",
  sell_price: "price",
  "سعر البيع": "price",
  "السعر": "price",
  buy_price: "buy_price",
  buyprice: "buy_price",
  "سعر الشراء": "buy_price",
  expiry: "expiry",
  expiry_date: "expiry",
  "الصلاحية": "expiry",
  "تاريخ الصلاحية": "expiry",
  "تاريخ انتهاء الصلاحية": "expiry",
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^="+|"+$/g, "")
    .trim();
}

function normalizeHeader(header: string) {
  const cleaned = cleanText(header).toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[cleaned] || HEADER_ALIASES[cleaned.replace(/[_-]+/g, "")] || cleaned;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  let commas = 0;
  let semis = 0;
  let tabs = 0;
  let inQuotes = false;
  for (let index = 0; index < headerLine.length; index += 1) {
    const char = headerLine[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (char === ",") commas += 1;
    if (char === ";") semis += 1;
    if (char === "\t") tabs += 1;
  }
  if (semis > commas && semis >= tabs) return ";";
  if (tabs > commas && tabs >= semis) return "\t";
  return ",";
}

function parseCsvLine(line: string, delimiter: "," | ";" | "\t" = ","): string[] {
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
    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cleanText(cell));
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

function splitCsvLines(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

/** Columns: name_ar, name_en, active_ingredient, barcode, qty, price, buy_price, expiry */
export function parseAppCatalogCsv(text: string): MedicineCatalogImportRow[] {
  const lines = splitCsvLines(text);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => normalizeHeader(header));
  const rows: MedicineCatalogImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex], delimiter);
    if (cells.length === 0 || cells.every((cell) => !cell)) continue;

    const record = readCsvRow(headers, cells);
    const nameAr = cleanText(record.name_ar);
    const nameEn = cleanText(record.name_en || nameAr);
    if (!nameAr && !nameEn) continue;

    const price = Math.max(0, Number(String(record.price ?? "0").replace(",", ".")) || 0);
    const buyRaw = record.buy_price;
    const buyPrice =
      buyRaw != null && buyRaw !== ""
        ? Math.max(0, Number(String(buyRaw).replace(",", ".")) || 0)
        : price > 0
          ? Math.round(price * 0.85 * 100) / 100
          : undefined;

    rows.push({
      name_ar: nameAr.slice(0, 500),
      name_en: nameEn.slice(0, 500),
      active_ingredient: cleanText(record.active_ingredient) || undefined,
      barcode: cleanText(record.barcode) || buildCatalogBarcode(nameEn || nameAr, lineIndex - 1),
      qty: Math.max(0, Math.floor(Number(String(record.qty ?? "0").replace(",", ".")) || 0)),
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
  const lines = splitCsvLines(text);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const rows: MedicineCatalogImportRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex], delimiter);
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

export async function readMedicineCatalogFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

export function parseMedicineCatalogFile(text: string, filename = ""): MedicineCatalogImportRow[] {
  const trimmed = text.replace(/^\uFEFF/, "").trimStart();
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseMedicineCatalogJson(text);
  }

  const firstLine = splitCsvLines(text)[0]?.toLowerCase() ?? "";
  if (firstLine.includes("commercial_name_en")) {
    return parseLegacyEgyptianDrugCsv(text);
  }

  const rows = parseAppCatalogCsv(text);
  if (rows.length === 0) {
    throw new Error("empty_or_unrecognized_csv");
  }
  return rows;
}

function mapObjectRowToCatalogRow(
  record: Record<string, unknown>,
  index: number,
): MedicineCatalogImportRow | null {
  const normalized: Record<string, string> = {};
  Object.entries(record).forEach(([key, value]) => {
    const mappedKey = normalizeHeader(String(key));
    normalized[mappedKey] = cleanText(value);
  });

  const nameAr = cleanText(normalized.name_ar);
  const nameEn = cleanText(normalized.name_en || nameAr);
  if (!nameAr && !nameEn) return null;

  const price = Math.max(0, Number(String(normalized.price ?? "0").replace(",", ".")) || 0);
  const buyRaw = normalized.buy_price;
  const buyPrice =
    buyRaw != null && buyRaw !== ""
      ? Math.max(0, Number(String(buyRaw).replace(",", ".")) || 0)
      : price > 0
        ? Math.round(price * 0.85 * 100) / 100
        : undefined;

  return {
    name_ar: nameAr.slice(0, 500),
    name_en: nameEn.slice(0, 500),
    active_ingredient: cleanText(normalized.active_ingredient) || undefined,
    barcode: cleanText(normalized.barcode) || buildCatalogBarcode(nameEn || nameAr, index),
    qty: Math.max(0, Math.floor(Number(String(normalized.qty ?? "0").replace(",", ".")) || 0)),
    price,
    buy_price: buyPrice,
    expiry: cleanText(normalized.expiry) || CATALOG_PLACEHOLDER_EXPIRY,
  };
}

function mapPositionalCellsToCatalogRow(
  cells: string[],
  index: number,
): MedicineCatalogImportRow | null {
  const cleaned = cells.map((cell) => cleanText(cell)).filter((cell, i, arr) => cell || i < arr.length - 1);
  if (cleaned.length < 2) return null;

  // Common pharmacy sheets: name_ar | name_en | barcode
  // or name_ar | name_en | qty | barcode
  const last = cleaned[cleaned.length - 1];
  const barcodeCandidate = last.replace(/\D/g, "");
  const hasBarcodeTail = barcodeCandidate.length >= 8;

  if (cleaned.length === 3 && hasBarcodeTail) {
    return {
      name_ar: cleaned[0].slice(0, 500) || cleaned[1].slice(0, 500),
      name_en: cleaned[1].slice(0, 500) || cleaned[0].slice(0, 500),
      barcode: barcodeCandidate,
      qty: 0,
      price: 0,
      expiry: CATALOG_PLACEHOLDER_EXPIRY,
    };
  }

  if (cleaned.length >= 4 && hasBarcodeTail) {
    const maybeQty = Number(String(cleaned[2]).replace(",", "."));
    return {
      name_ar: cleaned[0].slice(0, 500) || cleaned[1].slice(0, 500),
      name_en: cleaned[1].slice(0, 500) || cleaned[0].slice(0, 500),
      barcode: barcodeCandidate,
      qty: Number.isFinite(maybeQty) ? Math.max(0, Math.floor(maybeQty)) : 0,
      price: 0,
      expiry: CATALOG_PLACEHOLDER_EXPIRY,
    };
  }

  return mapObjectRowToCatalogRow(
    {
      name_ar: cleaned[0],
      name_en: cleaned[1] || cleaned[0],
      barcode: cleaned[3] || cleaned[2] || "",
      qty: cleaned[2] || "0",
    },
    index,
  );
}

export function parseMedicineCatalogExcelWorkbook(
  buffer: ArrayBuffer,
  XLSX: typeof import("xlsx"),
): MedicineCatalogImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("empty_or_unrecognized_csv");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as Array<Array<string | number | boolean | Date | null>>;

  if (!matrix.length) throw new Error("empty_or_unrecognized_csv");

  const headerCells = matrix[0].map((cell) => cleanText(cell));
  const normalizedHeaders = headerCells.map((header) => normalizeHeader(header));
  const looksLikeHeader = normalizedHeaders.some((header) =>
    ["name_ar", "name_en", "barcode", "qty", "price", "buy_price", "expiry", "active_ingredient"].includes(
      header,
    ),
  );

  const rows: MedicineCatalogImportRow[] = [];
  const startIndex = looksLikeHeader ? 1 : 0;

  for (let index = startIndex; index < matrix.length; index += 1) {
    const cells = (matrix[index] || []).map((cell) => cleanText(cell));
    if (cells.every((cell) => !cell)) continue;

    if (looksLikeHeader) {
      const record: Record<string, string> = {};
      normalizedHeaders.forEach((header, cellIndex) => {
        record[header] = cells[cellIndex] ?? "";
      });
      const mapped = mapObjectRowToCatalogRow(record, rows.length);
      if (mapped) rows.push(mapped);
    } else {
      const mapped = mapPositionalCellsToCatalogRow(cells, rows.length);
      if (mapped) rows.push(mapped);
    }
  }

  if (rows.length === 0) throw new Error("empty_or_unrecognized_csv");
  return rows;
}

export async function parseMedicineCatalogUpload(file: File): Promise<MedicineCatalogImportRow[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    return parseMedicineCatalogExcelWorkbook(buffer, XLSX);
  }

  const text = await readMedicineCatalogFileText(file);
  return parseMedicineCatalogFile(text, file.name);
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

function escapeCsvCell(value: string, forceQuote = false) {
  const text = String(value ?? "");
  if (forceQuote || /[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadMedicineCatalogCsvTemplate() {
  const lines = MEDICINE_CATALOG_CSV_TEMPLATE_ROWS.map((row, rowIndex) =>
    row
      .map((cell, cellIndex) => {
        const header = MEDICINE_CATALOG_CSV_HEADERS[cellIndex];
        if (rowIndex > 0 && header === "barcode") {
          return `="${String(cell).replace(/"/g, '""')}"`;
        }
        return escapeCsvCell(String(cell), true);
      })
      .join(","),
  );
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "victory-medicine-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadMedicineCatalogExcelTemplate() {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(
    MEDICINE_CATALOG_CSV_TEMPLATE_ROWS.map((row) => [...row]),
  );
  // Force barcode column as text for sample rows.
  worksheet["D2"] = { t: "s", v: "6224000000001" };
  worksheet["D3"] = { t: "s", v: "6224000000002" };
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "medicines");
  XLSX.writeFile(workbook, "victory-medicine-import-template.xlsx");
}
