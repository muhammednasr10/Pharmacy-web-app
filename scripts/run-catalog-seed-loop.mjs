/**
 * Runs all .tmp/catalog-seed batches through Supabase execute_sql (postgres session).
 * Requires SUPABASE_MCP_BATCH_HOOK — used internally with generated SQL files.
 *
 * Usage:
 *   node scripts/run-catalog-seed-loop.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", ".tmp", "catalog-seed");
const STATUS_FILE = join(__dirname, "..", ".tmp", "catalog-seed-status.json");

function listBatchFiles() {
  return readdirSync(BATCH_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function loadStatus() {
  try {
    return JSON.parse(readFileSync(STATUS_FILE, "utf8"));
  } catch {
    return { completed: [], failed: null };
  }
}

function saveStatus(status) {
  mkdirSync(dirname(STATUS_FILE), { recursive: true });
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function buildSql(index) {
  const result = spawnSync(process.execPath, [join(__dirname, "build-catalog-batch-sql.mjs"), String(index)], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to build SQL for batch ${index}`);
  }
  return result.stdout.trim();
}

function main() {
  const files = listBatchFiles();
  const status = loadStatus();
  const pending = files
    .map((file, index) => index)
    .filter((index) => !status.completed.includes(index));

  if (pending.length === 0) {
    console.log(`All ${files.length} batches already marked complete.`);
    return;
  }

  const index = pending[0];
  const sql = buildSql(index);
  const outFile = join(__dirname, "..", ".tmp", `pending-batch-${index}.sql`);
  writeFileSync(outFile, sql);
  console.log(`Prepared batch ${index + 1}/${files.length} → ${outFile} (${sql.length} bytes)`);
  console.log("Run this SQL via Supabase MCP execute_sql, then:");
  console.log(`  node scripts/mark-catalog-batch-done.mjs ${index}`);
}

main();
