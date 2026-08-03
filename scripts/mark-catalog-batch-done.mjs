import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUS_FILE = join(__dirname, "..", ".tmp", "catalog-seed-status.json");

const index = Number(process.argv[2]);
if (!Number.isFinite(index)) {
  console.error("Usage: node scripts/mark-catalog-batch-done.mjs <batch-index>");
  process.exit(1);
}

let status = { completed: [], failed: null };
try {
  status = JSON.parse(readFileSync(STATUS_FILE, "utf8"));
} catch {
  /* fresh */
}

if (!status.completed.includes(index)) {
  status.completed.push(index);
  status.completed.sort((a, b) => a - b);
}

mkdirSync(dirname(STATUS_FILE), { recursive: true });
writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
console.log(`Marked batch ${index} done (${status.completed.length} total)`);
