/**
 * Builds SQL query files for all catalog seed batches.
 * Output: .tmp/batch-queries/NNN.sql (one line each)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, ".tmp", "batch-queries");
const BUILD = join(__dirname, "build-catalog-batch-sql.mjs");

const files = readdirSync(join(ROOT, ".tmp", "catalog-seed"))
  .filter((n) => n.endsWith(".sql"))
  .sort();

mkdirSync(OUT_DIR, { recursive: true });

for (let index = 0; index < files.length; index += 1) {
  const out = join(OUT_DIR, `${String(index).padStart(3, "0")}.sql`);
  try {
    if (readFileSync(out, "utf8").length > 100) {
      console.log(`Skip batch ${index} (already prepared)`);
      continue;
    }
  } catch {
    /* not yet built */
  }
  const result = spawnSync(process.execPath, [BUILD, String(index)], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    console.error(`Failed batch ${index}:`, result.stderr || result.stdout);
    process.exit(1);
  }
  writeFileSync(out, result.stdout.trim());
  console.log(`Prepared batch ${index} (${result.stdout.trim().length} bytes)`);
}

console.log(`Done — ${files.length} batch query files in ${OUT_DIR}`);
