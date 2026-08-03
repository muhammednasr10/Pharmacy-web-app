/**
 * Seeds all catalog batches via Supabase REST RPC (anon key).
 * Marks each batch done in .tmp/catalog-seed-status.json.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", ".tmp", "catalog-seed");

function loadEnv() {
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
}

function parseBatchJson(sql, index) {
  const tag = `batch${index}`;
  const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*)\\$${tag}\\$`));
  if (!match) throw new Error(`Could not parse batch ${index}`);
  return JSON.parse(match[1]);
}

async function importBatch(url, key, rows) {
  const res = await fetch(`${url}/rest/v1/rpc/import_medicine_catalog_reference_batch`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ p_rows: rows }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");

  const files = readdirSync(BATCH_DIR)
    .filter((n) => n.endsWith(".sql"))
    .sort();

  const failed = [];
  let totalUpserted = 0;

  for (const file of files) {
    const index = Number(file.replace(".sql", ""));
    try {
      const sql = readFileSync(join(BATCH_DIR, file), "utf8");
      const rows = parseBatchJson(sql, index);
      const result = await importBatch(url, key, rows);
      const upserted = Number(result?.upserted ?? 0);
      totalUpserted += upserted;
      execSync(`node scripts/mark-catalog-batch-done.mjs ${index}`, {
        cwd: join(__dirname, ".."),
        stdio: "inherit",
      });
      console.log(`Batch ${index}: upserted ${upserted} (${totalUpserted} cumulative)`);
    } catch (err) {
      console.error(`Batch ${index} FAILED:`, err.message);
      failed.push(index);
    }
  }

  console.log(JSON.stringify({ totalUpserted, failed, batchCount: files.length }));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
