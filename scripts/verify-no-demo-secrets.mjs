import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");

/** Exact demo password literals — not substrings like base64 "0123456789". */
const forbiddenPatterns = [
  { label: "1234567", regex: /(["'`])1234567\1/ },
  { label: "Mn01125526012#", regex: /Mn01125526012#/ },
  { label: "Mn01125526012", regex: /Mn01125526012(?![#])/ },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(js|css|html|json)$/i.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function fail(message) {
  console.error(`\n[BUILD FAILED] ${message}\n`);
  process.exit(1);
}

let files;
try {
  files = walk(distDir);
} catch {
  fail("dist/ not found — run vite build first");
}

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const { label, regex } of forbiddenPatterns) {
    if (regex.test(text)) {
      hits.push({ file, label });
    }
  }
}

if (hits.length > 0) {
  console.error("[verify-no-demo-secrets] Forbidden strings found in production bundle:\n");
  for (const { file, label } of hits) {
    console.error(`  • "${label}" in ${file.replace(root, "").replace(/^\\/, "")}`);
  }
  fail("Remove demo passwords/secrets from client bundle before deploying");
}

console.log("[verify-no-demo-secrets] OK — no demo passwords in dist/");
