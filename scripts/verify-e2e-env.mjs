import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.e2e");

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "E2E_LOGIN_EMAIL",
  "E2E_LOGIN_PASSWORD",
  "E2E_TEST_BARCODE",
];

const placeholderValues = new Set([
  "manager@your-pharmacy.com",
  "your-password",
  "6221234567890",
  "REPLACE_WITH_REAL_EMAIL",
  "REPLACE_WITH_REAL_PASSWORD",
  "REPLACE_WITH_REAL_BARCODE",
]);

const missing = required.filter((key) => !String(process.env[key] || "").trim());

if (missing.length > 0) {
  console.error("[e2e] Missing required environment variables:");
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error("\nCopy .env.e2e.example to .env.e2e and use a real test account + barcode.");
  process.exit(1);
}

const placeholders = required
  .map((key) => ({ key, value: String(process.env[key] || "").trim() }))
  .filter(
    ({ value }) =>
      placeholderValues.has(value) ||
      value.includes("your-pharmacy") ||
      value.startsWith("REPLACE_WITH_"),
  );

if (placeholders.length > 0) {
  console.error("[e2e] Placeholder values detected — replace with real credentials:");
  placeholders.forEach(({ key }) => console.error(`  - ${key}`));
  process.exit(1);
}

console.log("[e2e] Required environment variables present.");
