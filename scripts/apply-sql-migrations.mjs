#!/usr/bin/env node
/**
 * Apply Supabase SQL migrations in canonical order.
 *
 * Requires DATABASE_URL (Postgres connection string — Supabase → Settings → Database).
 * Optional: SUPABASE_JWT_SECRET for files tagged "secrets" (replaces __JWT_SECRET__ placeholder).
 *
 * Usage:
 *   npm run sql:apply              # required migrations not yet recorded
 *   npm run sql:apply -- --dry-run
 *   npm run sql:apply -- --list
 *   npm run sql:apply -- --file fix-trial-registration.sql
 *   npm run sql:apply -- --include-optional
 *   npm run sql:apply -- --include-secrets --include-destructive
 *   npm run sql:apply -- --bootstrap   # fresh project (includes bootstrap SQL)
 *   npm run sql:apply -- --force       # re-run even if already recorded
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const supabaseDir = join(root, "supabase");
const manifestPath = join(root, "src/config/sqlMigrationRunOrder.json");

function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function parseArgs(argv) {
  const flags = new Set();
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags.add(key);
    } else {
      values[key] = next;
      i += 1;
    }
  }
  return { flags, values };
}

function shouldInclude(entry, flags) {
  if (flags.has("bootstrap")) return true;
  if (entry.kind === "bootstrap") return false;
  if (entry.kind === "required") return true;
  if (entry.kind === "bundle") return flags.has("include-bundles");
  if (entry.kind === "destructive") return flags.has("include-destructive");
  if (entry.kind === "secrets") return flags.has("include-secrets");
  if (entry.kind === "optional") return flags.has("include-optional");
  return false;
}

function substituteSecrets(sql, env) {
  const jwt = env.SUPABASE_JWT_SECRET || env.JWT_SECRET || "";
  if (sql.includes("__JWT_SECRET__")) {
    if (!jwt) {
      throw new Error(
        "SQL contains __JWT_SECRET__ — set SUPABASE_JWT_SECRET in .env or pass --include-secrets only after configuring it",
      );
    }
    return sql.split("__JWT_SECRET__").join(jwt);
  }
  return sql;
}

async function getPgClient(databaseUrl) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error(
      "Missing dependency `pg`. Install it with:\n  npm install --save-dev pg\n",
    );
    process.exit(1);
  }
  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists public.app_sql_migrations (
      filename text primary key,
      kind text not null default 'required',
      applied_at timestamptz not null default now()
    );
  `);
}

async function getAppliedFiles(client) {
  const { rows } = await client.query(
    "select filename from public.app_sql_migrations order by applied_at asc",
  );
  return new Set(rows.map((row) => row.filename));
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const env = { ...loadEnvFile(), ...process.env };
  const databaseUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const diskFiles = new Set(
    readdirSync(supabaseDir).filter((name) => name.endsWith(".sql")),
  );

  const manifestFiles = manifest.map((entry) => entry.file);
  const missingOnDisk = manifestFiles.filter((file) => !diskFiles.has(file));
  const notInManifest = [...diskFiles].filter((file) => !manifestFiles.includes(file));

  if (missingOnDisk.length) {
    console.warn("Warning: manifest references missing files:");
    missingOnDisk.forEach((file) => console.warn(`  - ${file}`));
  }
  if (notInManifest.length) {
    console.warn("Warning: SQL files not in run order manifest:");
    notInManifest.forEach((file) => console.warn(`  - ${file}`));
  }

  if (flags.has("list")) {
    console.log("\n=== SQL migration run order ===\n");
    for (const entry of manifest) {
      const onDisk = diskFiles.has(entry.file) ? "ok" : "MISSING";
      console.log(`[${entry.kind.padEnd(11)}] ${entry.file} (${onDisk})`);
    }
    console.log(`\nTotal: ${manifest.length} entries\n`);
    return;
  }

  const singleFile = values.file;
  if (singleFile && !diskFiles.has(singleFile)) {
    console.error(`File not found: supabase/${singleFile}`);
    process.exit(1);
  }

  let queue = singleFile
    ? manifest.filter((entry) => entry.file === singleFile)
    : manifest.filter((entry) => shouldInclude(entry, flags));

  if (!databaseUrl) {
    console.error(
      "Missing DATABASE_URL (or SUPABASE_DB_URL) in .env\n" +
        "Supabase → Project Settings → Database → Connection string (URI)\n",
    );
    process.exit(1);
  }

  if (flags.has("dry-run")) {
    console.log("\n=== Dry run — migrations that would execute ===\n");
    for (const entry of queue) {
      console.log(`- ${entry.file} [${entry.kind}]`);
    }
    console.log(`\n${queue.length} file(s)\n`);
    return;
  }

  const client = await getPgClient(databaseUrl);
  try {
    await ensureMigrationTable(client);
    const applied = flags.has("force") ? new Set() : await getAppliedFiles(client);

    let ran = 0;
    let skipped = 0;

    for (const entry of queue) {
      if (!flags.has("force") && applied.has(entry.file)) {
        skipped += 1;
        console.log(`skip  ${entry.file} (already applied)`);
        continue;
      }

      const filePath = join(supabaseDir, entry.file);
      if (!existsSync(filePath)) {
        console.warn(`skip  ${entry.file} (missing on disk)`);
        skipped += 1;
        continue;
      }

      let sql = readFileSync(filePath, "utf8");
      if (entry.kind === "secrets") {
        sql = substituteSecrets(sql, env);
      }

      console.log(`run   ${entry.file} [${entry.kind}] ...`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          `insert into public.app_sql_migrations (filename, kind)
           values ($1, $2)
           on conflict (filename) do update set applied_at = now(), kind = excluded.kind`,
          [entry.file, entry.kind],
        );
        await client.query("commit");
        ran += 1;
        console.log(`ok    ${entry.file}`);
      } catch (error) {
        await client.query("rollback");
        console.error(`fail  ${entry.file}`);
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
        break;
      }
    }

    console.log(`\nDone. applied=${ran} skipped=${skipped}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
