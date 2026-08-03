/**
 * Builds a single SQL statement for MCP execute_sql to import one catalog batch.
 * Usage: node scripts/build-catalog-batch-sql.mjs 0
 */
import { readFileSync } from "node:fs";

const index = Number(process.argv[2] || 0);
const tag = `batch${index}`;
const sql = readFileSync(`.tmp/catalog-seed/${String(index).padStart(3, "0")}.sql`, "utf8");
const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*)\\$${tag}\\$`));
if (!match) throw new Error(`Could not parse batch ${index}`);

const json = match[1];
const base64 = Buffer.from(json, "utf8").toString("base64");
const query = `select public.import_medicine_catalog_reference_batch(convert_from(decode('${base64}', 'base64'), 'utf8')::jsonb) as result;`;
process.stdout.write(query);
