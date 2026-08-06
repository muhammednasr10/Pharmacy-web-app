/**
 * Seeds all catalog batches using either:
 * - SUPABASE_SERVICE_ROLE_KEY (preferred), or
 * - SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (super admin app login)
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

function parseBatchJson(sql, index) {
  const tag = `batch${index}`;
  const match = sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*)\\$${tag}\\$`));
  if (!match) throw new Error(`Could not parse batch ${index}`);
  return JSON.parse(match[1]);
}

async function createSeedClient(env) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  if (!url) throw new Error("Missing VITE_SUPABASE_URL in .env");

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const email = env.SEED_ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set SUPABASE_SERVICE_ROLE_KEY or SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env",
    );
  }

  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing VITE_SUPABASE_ANON_KEY in .env");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("app_client_login", {
    p_email: email,
    p_password: password,
  });

  if (error) throw new Error(`Login failed: ${error.message}`);

  const payload =
    data && typeof data === "object" ? /** @type {{ access_token?: string }} */ (data) : null;
  const accessToken = payload?.access_token;
  if (!accessToken) throw new Error("Login did not return access_token");

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function main() {
  const env = loadEnv();
  const files = listBatchFiles();
  if (files.length === 0) {
    console.error(
      "No batch files. Run:\n  node scripts/seed-medicine-catalog-reference.mjs --write-batches .tmp/catalog-seed",
    );
    process.exit(1);
  }

  const supabase = await createSeedClient(env);
  let total = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const sql = readFileSync(join(BATCH_DIR, file), "utf8");
    const rows = parseBatchJson(sql, index);
    const { data, error } = await supabase.rpc("import_medicine_catalog_reference_batch", {
      p_rows: rows,
    });

    if (error) {
      console.error(`Batch ${index + 1}/${files.length} failed:`, error.message);
      process.exit(1);
    }

    const upserted = Number(data?.upserted ?? 0);
    total += upserted;
    console.log(`Batch ${index + 1}/${files.length}: ${upserted} rows (${total} total)`);
  }

  const { data: stats } = await supabase.rpc("get_medicine_catalog_reference_stats");
  console.log(`Done — reference catalog: ${Number(stats?.total ?? 0).toLocaleString()} medicines`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
