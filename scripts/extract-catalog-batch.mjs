import { readFileSync, writeFileSync } from "node:fs";

const index = Number(process.argv[2] || 0);
const tag = `batch${index}`;
const sql = readFileSync(`.tmp/catalog-seed/${String(index).padStart(3, "0")}.sql`, "utf8");
const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*)\\$${tag}\\$`));
if (!match) throw new Error(`Could not parse batch ${index}`);
writeFileSync(".tmp/run-batch.json", match[1]);
console.log(JSON.parse(match[1]).length);
