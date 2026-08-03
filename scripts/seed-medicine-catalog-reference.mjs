/**
 * Seeds medicine_catalog_reference from supabase/egyptian-medicine-catalog.csv
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (Supabase → Settings → API → service_role)
 *
 * Run:
 *   node scripts/seed-medicine-catalog-reference.mjs
 *   node scripts/seed-medicine-catalog-reference.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "..", "supabase", "egyptian-medicine-catalog.csv");
const BATCH_SIZE = 200;

function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
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

function parseCatalogCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length === 0) continue;

    const record = {};
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? "";
    });

    const nameAr = String(record.name_ar ?? "").trim();
    const nameEn = String(record.name_en ?? nameAr).trim();
    const barcode = String(record.barcode ?? "").trim();
    if (!barcode || (!nameAr && !nameEn)) continue;

    const price = Math.max(0, Number(record.price ?? 0) || 0);
    const buyRaw = record.buy_price;
    const buyPrice =
      buyRaw === "" || buyRaw == null ? Math.round(price * 0.85 * 100) / 100 : Number(buyRaw) || 0;

    rows.push({
      name_ar: nameAr,
      name_en: nameEn,
      active_ingredient: String(record.active_ingredient ?? "").trim() || null,
      barcode,
      qty: Math.max(0, Number(record.qty ?? 0) || 0),
      price,
      buy_price: buyPrice,
      expiry: String(record.expiry ?? "2099-12-31").trim() || "2099-12-31",
    });
  }

  return rows;
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const writeBatchesArg = process.argv.indexOf("--write-batches");
  const writeBatchesDir =
    writeBatchesArg >= 0 ? process.argv[writeBatchesArg + 1] : null;
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const csvText = readFileSync(CSV_PATH, "utf8");
  const rows = parseCatalogCsv(csvText);
  const chunks = chunkRows(rows, BATCH_SIZE);

  console.log(`Catalog CSV: ${rows.length.toLocaleString()} rows → ${chunks.length} batches`);

  if (writeBatchesDir) {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(writeBatchesDir, { recursive: true });
    for (let index = 0; index < chunks.length; index += 1) {
      const tag = `batch${index}`;
      const sql = `select public.import_medicine_catalog_reference_batch($${tag}$${JSON.stringify(chunks[index])}$${tag}$::jsonb);`;
      writeFileSync(join(writeBatchesDir, `${String(index).padStart(3, "0")}.sql`), sql, "utf8");
    }
    console.log(`Wrote ${chunks.length} SQL batch files to ${writeBatchesDir}`);
    return;
  }

  if (dryRun) {
    console.log("Dry run — no data sent.");
    return;
  }

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env\n" +
        "Add service_role key from Supabase → Settings → API, then re-run.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalUpserted = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    const batch = chunks[index];
    const { data, error } = await supabase.rpc("import_medicine_catalog_reference_batch", {
      p_rows: batch,
    });

    if (error) {
      console.error(`Batch ${index + 1}/${chunks.length} failed:`, error.message);
      process.exit(1);
    }

    const upserted = Number(data?.upserted ?? 0);
    totalUpserted += upserted;
    console.log(`Batch ${index + 1}/${chunks.length}: ${upserted} rows (total ${totalUpserted})`);
  }

  const { data: stats, error: statsError } = await supabase.rpc("get_medicine_catalog_reference_stats");
  if (statsError) {
    console.warn("Could not verify stats:", statsError.message);
  } else {
    console.log(`Done — reference catalog total: ${Number(stats?.total ?? 0).toLocaleString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
