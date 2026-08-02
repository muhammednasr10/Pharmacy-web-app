/**
 * Converts eg-drugs CSV → app-ready supabase/egyptian-medicine-catalog.csv
 *
 * Run:
 *   node scripts/generate-medicine-catalog-csv.mjs
 *   node scripts/generate-medicine-catalog-csv.mjs "e:/web apps/eg-drugs-main/data/eg_drugs.csv"
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "supabase", "egyptian-medicine-catalog.csv");
const DEFAULT_INPUT = resolve("e:/web apps/eg-drugs-main/data/eg_drugs.csv");
const PLACEHOLDER_EXPIRY = "2099-12-31";

function cleanText(value) {
  return String(value ?? "").trim();
}

function parsePrice(value) {
  const normalized = cleanText(value).replace(/\.+$/, "").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function buildCatalogBarcode(seed, index) {
  const normalized = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  return `EG${String(index + 1).padStart(6, "0")}${normalized ? normalized.slice(0, 6) : "RX"}`;
}

function parseCsvLine(line) {
  const cells = [];
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

function readCsvRow(headers, cells) {
  const record = {};
  headers.forEach((header, cellIndex) => {
    record[header] = cells[cellIndex] ?? "";
  });
  return record;
}

function mapEgDrugsRecord(record, index, usedBarcodes) {
  const nameEn = cleanText(record.name);
  const nameAr = cleanText(record.arabic) || nameEn;
  if (!nameAr && !nameEn) return null;

  const company = cleanText(record.company);
  const active = cleanText(record.active) || cleanText(record.matched_fda_ingredients);
  const nameEnDisplay = company ? `${nameEn || nameAr} · ${company}` : nameEn || nameAr;

  const price = parsePrice(record.price);
  const oldPrice = parsePrice(record.oldprice);
  const buyPrice =
    oldPrice > 0 && oldPrice < price
      ? oldPrice
      : price > 0
        ? Math.round(price * 0.85 * 100) / 100
        : "";

  let barcode = cleanText(record.barcode).replace(/[^\d]/g, "");
  if (!barcode) {
    barcode = buildCatalogBarcode(nameEn || nameAr, index);
  } else if (usedBarcodes.has(barcode)) {
    const suffix = cleanText(record.id) || cleanText(record.slug) || String(index + 1);
    barcode = `${barcode}${suffix}`.slice(0, 20);
  }
  usedBarcodes.add(barcode);

  return {
    name_ar: nameAr.slice(0, 500),
    name_en: nameEnDisplay.slice(0, 500),
    active_ingredient: active.slice(0, 500),
    barcode,
    qty: 0,
    price,
    buy_price: buyPrice,
    expiry: PLACEHOLDER_EXPIRY,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function convertEgDrugsCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("empty_csv");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (!headers.includes("arabic") && !headers.includes("name")) {
    throw new Error("not_eg_drugs_format");
  }

  const outHeaders = [
    "name_ar",
    "name_en",
    "active_ingredient",
    "barcode",
    "qty",
    "price",
    "buy_price",
    "expiry",
  ];

  const outputLines = [outHeaders.join(",")];
  const usedBarcodes = new Set();
  let mapped = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length === 0) continue;

    const record = readCsvRow(headers, cells);
    const row = mapEgDrugsRecord(record, lineIndex - 1, usedBarcodes);
    if (!row) continue;

    mapped += 1;
    outputLines.push(outHeaders.map((key) => csvCell(row[key])).join(","));
  }

  return { mapped, outputLines };
}

function resolveInputPath() {
  const argPath = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  const inputPath = resolve(argPath || DEFAULT_INPUT);
  if (!existsSync(inputPath)) {
    throw new Error(`input_not_found: ${inputPath}`);
  }
  return inputPath;
}

function main() {
  const inputPath = resolveInputPath();
  console.log(`Reading ${inputPath}...`);

  const text = readFileSync(inputPath, "utf8");
  const { mapped, outputLines } = convertEgDrugsCsv(text);

  writeFileSync(OUT_PATH, `\uFEFF${outputLines.join("\n")}`, "utf8");
  console.log(`Wrote ${mapped.toLocaleString()} rows → ${OUT_PATH}`);
}

main();
