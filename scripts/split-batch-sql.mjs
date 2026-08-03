/** Split batch SQL into MCP-safe chunks (<90KB each). Usage: node scripts/split-batch-sql.mjs 0 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const index = Number(process.argv[2] || 0);
const outDir = join(__dirname, "..", ".tmp", "catalog-chunks", String(index));

const built = spawnSync(process.execPath, [join(__dirname, "build-catalog-batch-sql.mjs"), String(index)], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
if (built.status !== 0) throw new Error(built.stderr || built.stdout);

const full = built.stdout.trim();
const prefix = "select public.import_medicine_catalog_reference_batch(convert_from(decode('";
const suffix = "', 'base64'), 'utf8')::jsonb) as result;";

const start = full.indexOf(prefix) + prefix.length;
const end = full.lastIndexOf(suffix);
const base64 = full.slice(start, end);

const chunkSize = 60000;
mkdirSync(outDir, { recursive: true });
const parts = [];
for (let offset = 0; offset < base64.length; offset += chunkSize) {
  parts.push(base64.slice(offset, offset + chunkSize));
}

writeFileSync(join(outDir, "meta.json"), JSON.stringify({ index, parts: parts.length }), "utf8");
parts.forEach((part, partIndex) => {
  writeFileSync(join(outDir, `part-${partIndex}.txt`), part, "utf8");
});

console.log(JSON.stringify({ index, parts: parts.length, outDir }));
