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

const dotEnv = loadDotEnv();
const url = (process.env.VITE_SUPABASE_URL ?? dotEnv.VITE_SUPABASE_URL ?? "").trim();
const key = (process.env.VITE_SUPABASE_ANON_KEY ?? dotEnv.VITE_SUPABASE_ANON_KEY ?? "").trim();

if (!url || !key) {
  console.error("\n[BUILD FAILED] Missing Supabase environment variables.");
  console.error("Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
  console.error("On Vercel: Project → Settings → Environment Variables → add both → Redeploy.\n");
  process.exit(1);
}

if (/aBcDe/i.test(url)) {
  console.error("\n[BUILD FAILED] VITE_SUPABASE_URL is still the placeholder aBcDe.supabase.co.");
  console.error("Use your real Project URL from Supabase → Settings → API.\n");
  process.exit(1);
}

if (/service_role/i.test(key)) {
  console.error("\n[BUILD FAILED] VITE_SUPABASE_ANON_KEY must be the anon/publishable key, not service_role.\n");
  process.exit(1);
}

console.log("[env] Supabase variables present — build can continue.");
