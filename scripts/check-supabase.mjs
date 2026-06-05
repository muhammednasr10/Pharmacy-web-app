import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      env[trimmed.slice(0, i)] = trimmed.slice(i + 1);
    }
    return env;
  } catch {
    return {};
  }
}

const TABLES = [
  "medicines",
  "invoices",
  "invoice_items",
  "pharmacies",
  "users",
  "customer_payments",
  "purchases",
  "returns",
  "stock_movements",
  "activity_logs",
  "held_invoices",
];

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

console.log("\n=== Pharmacy Web App — Supabase Health Check ===\n");

if (!url || !key) {
  console.log("FAIL  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

console.log(`URL:  ${url}`);
console.log(`Key:  ${key.slice(0, 12)}...${key.slice(-4)} (${key.length} chars)\n`);

const supabase = createClient(url, key);

async function checkTable(table) {
  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    return { table, ok: false, count: null, error: `${error.code}: ${error.message}` };
  }
  return { table, ok: true, count: count ?? data?.length ?? 0, error: null };
}

async function main() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.log(`Auth: FAIL — ${sessionError.message}`);
  } else {
    const email = sessionData.session?.user?.email ?? "(none)";
    console.log(`Auth: OK — active session: ${email}`);
  }

  console.log("\n--- Tables ---\n");

  const results = [];
  for (const table of TABLES) {
    results.push(await checkTable(table));
  }

  const maxLen = Math.max(...TABLES.map((t) => t.length));
  for (const r of results) {
    const name = r.table.padEnd(maxLen);
    if (r.ok) {
      console.log(`OK    ${name}  rows: ${r.count}`);
    } else {
      console.log(`FAIL  ${name}  ${r.error}`);
    }
  }

  const { data: users, error: usersErr } = await supabase.from("users").select("uid,name,email,role,is_active").limit(5);
  if (!usersErr && users?.length) {
    console.log("\n--- Sample users (app login must match Auth) ---\n");
    for (const u of users) {
      console.log(`  • ${u.email} | ${u.name} | role=${u.role} | active=${u.is_active}`);
    }
  }

  const { data: pharmacies, error: phErr } = await supabase.from("pharmacies").select("id,name,is_active").limit(3);
  if (!phErr && pharmacies?.length) {
    console.log("\n--- Pharmacies ---\n");
    for (const p of pharmacies) {
      console.log(`  • ${p.id}: ${p.name ?? "(no name)"} | active=${p.is_active}`);
    }
  } else if (!phErr) {
    console.log("\nWARN  pharmacies table is empty — settings may not load.");
  }

  const fails = results.filter((r) => !r.ok).length;
  console.log("\n--- Summary ---\n");
  if (fails === 0) {
    console.log(`All ${TABLES.length} tables reachable. Connection looks good.\n`);
  } else {
    console.log(`${fails} table(s) failed. Check RLS policies or run supabase/schema.sql in SQL Editor.\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e.message);
  process.exit(1);
});
