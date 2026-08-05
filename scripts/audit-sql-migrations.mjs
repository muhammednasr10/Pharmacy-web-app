#!/usr/bin/env node
/**
 * Validates SQL migration registry vs disk and run-order manifest.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, "src/config/sqlMigrations.ts");
const extraPath = join(root, "src/config/sqlMigrationExtraEntries.ts");
const manifestPath = join(root, "src/config/sqlMigrationRunOrder.json");
const supabaseDir = join(root, "supabase");

const config = readFileSync(configPath, "utf8");
const extra = existsSync(extraPath) ? readFileSync(extraPath, "utf8") : "";
const registered = [
  ...config.matchAll(/file:\s*"([^"]+)"/g),
  ...extra.matchAll(/file:\s*"([^"]+)"/g),
].map((m) => m[1]);
const registeredSet = new Set(registered);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifestFiles = manifest.map((entry) => entry.file);
const manifestSet = new Set(manifestFiles);
const diskFiles = readdirSync(supabaseDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const unregistered = diskFiles.filter((f) => !registeredSet.has(f));
const missingOnDisk = [...registeredSet].filter((f) => !diskFiles.includes(f));
const notInManifest = diskFiles.filter((f) => !manifestSet.has(f));
const manifestMissingDisk = manifestFiles.filter((f) => !diskFiles.includes(f));

console.log("\n=== SQL migration audit ===\n");
console.log(`SQL on disk:              ${diskFiles.length}`);
console.log(`Registry file refs:       ${registered.length} (${registeredSet.size} unique)`);
console.log(`Run-order manifest:       ${manifestFiles.length}`);
console.log(`Unregistered in TS:       ${unregistered.length}`);
console.log(`Not in run-order JSON:    ${notInManifest.length}`);

if (unregistered.length) {
  console.log("\nUnregistered in src/config/sqlMigrations.ts (+ extras):");
  unregistered.forEach((f) => console.log(`  - ${f}`));
}
if (notInManifest.length) {
  console.log("\nOn disk but missing from sqlMigrationRunOrder.json:");
  notInManifest.forEach((f) => console.log(`  - ${f}`));
}
if (manifestMissingDisk.length) {
  console.log("\nIn manifest but missing on disk:");
  manifestMissingDisk.forEach((f) => console.log(`  - ${f}`));
}
if (missingOnDisk.length) {
  console.log("\nRegistered but missing on disk:");
  missingOnDisk.forEach((f) => console.log(`  - ${f}`));
}

const ok =
  unregistered.length === 0 && notInManifest.length === 0 && manifestMissingDisk.length === 0;

console.log(ok ? "\nStatus: OK — registry and run order cover all SQL files.\n" : "\nStatus: ISSUES FOUND\n");
process.exitCode = ok ? 0 : 1;
