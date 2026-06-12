import { readFileSync } from "fs";

function loadDotEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
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

const isVercel = Boolean(process.env.VERCEL);
const dotEnv = loadDotEnv();
const url = (process.env.VITE_SUPABASE_URL ?? dotEnv.VITE_SUPABASE_URL ?? "").trim();
const key = (process.env.VITE_SUPABASE_ANON_KEY ?? dotEnv.VITE_SUPABASE_ANON_KEY ?? "").trim();

function fail(message) {
  console.error(`\n[BUILD FAILED] ${message}\n`);
  process.exit(1);
}

if (!url || !key) {
  const base =
    "Missing Supabase environment variables. Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.";
  if (isVercel) {
    fail(
      `${base}\n` +
        "Vercel → Project → Settings → Environment Variables:\n" +
        "  1. Add both variables for Production AND Preview.\n" +
        "  2. Use values from Supabase → Settings → API (Project URL + anon public key).\n" +
        "  3. Redeploy from Deployments → Redeploy (env vars apply on the next build only).",
    );
  }
  fail(
    `${base}\n` +
      "Local: copy .env.example to .env and fill in your Supabase credentials.\n" +
      "Vercel: add the same variables in Project Settings → Environment Variables.",
  );
}

if (/^["']|["']$/.test(url) || /^["']|["']$/.test(key)) {
  fail("Remove surrounding quotes from environment variable values in Vercel or .env.");
}

if (/aBcDe/i.test(url)) {
  fail("VITE_SUPABASE_URL is still the placeholder aBcDe.supabase.co. Use your real Project URL.");
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  console.warn(
    "[env] VITE_SUPABASE_URL does not look like a standard Supabase URL — verify it in Supabase → Settings → API.",
  );
}

if (/service_role/i.test(key)) {
  fail("VITE_SUPABASE_ANON_KEY must be the anon/publishable key, not service_role.");
}

if (key.length < 40) {
  fail("VITE_SUPABASE_ANON_KEY looks too short — paste the full anon key from Supabase.");
}

const vercelEnv = process.env.VERCEL_ENV || "";
console.log(
  `[env] Supabase variables present${isVercel ? ` (Vercel ${vercelEnv || "build"})` : ""} — build can continue.`,
);
if (isVercel && vercelEnv === "preview") {
  console.log(
    "[env] Preview deployment — ensure VITE_SUPABASE_* are enabled for the Preview scope in Vercel env settings.",
  );
}
