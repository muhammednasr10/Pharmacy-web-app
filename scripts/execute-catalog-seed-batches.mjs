/**
 * Executes generated .tmp/catalog-seed/*.sql batches via Supabase MCP-style SQL runner,
 * or via service role RPC when SUPABASE_SERVICE_ROLE_KEY is set.
 *
 * Usage:
 *   node scripts/execute-catalog-seed-batches.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", ".tmp", "catalog-seed");

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

function listBatchFiles() {
  return readdirSync(BATCH_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function parseBatchJson(sql) {
  const match = sql.match(/\$batch\d+\$([\s\S]*)\$batch\d+\$/);
  if (!match) throw new Error("Could not parse batch JSON from SQL file");
  return JSON.parse(match[1]);
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const files = listBatchFiles();

  if (files.length === 0) {
    console.error("No batch files — run: node scripts/seed-medicine-catalog-reference.mjs --write-batches .tmp/catalog-seed");
    process.exit(1);
  }

  if (!url || !serviceRoleKey) {
    console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let total = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const sql = readFileSync(join(BATCH_DIR, file), "utf8");
    const rows = parseBatchJson(sql);
    const { data, error } = await supabase.rpc("import_medicine_catalog_reference_batch", {
      p_rows: rows,
    });
    if (error) {
      console.error(`Batch ${index + 1}/${files.length} (${file}) failed:`, error.message);
      process.exit(1);
    }
    const upserted = Number(data?.upserted ?? 0);
    total += upserted;
    console.log(`Batch ${index + 1}/${files.length}: ${upserted} rows (${total} total)`);
  }

  const { data: stats } = await supabase.rpc("get_medicine_catalog_reference_stats");
  console.log(`Reference catalog ready: ${Number(stats?.total ?? 0).toLocaleString()} medicines`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
