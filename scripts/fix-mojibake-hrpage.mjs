import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, "src/pages/HrPage.tsx");

const CP1252_OVERRIDES = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function decodeMojibake(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_OVERRIDES[ch];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    return null;
  }
  return Buffer.from(bytes).toString("utf8");
}

function fixLine(line) {
  if (!/[ØÙÃâ€‚ƒ„…†‡ˆ‰Š‹ŒŽ''""•–—˜™š›œžŸ]/.test(line)) {
    return line;
  }
  const fixed = decodeMojibake(line);
  if (!fixed || fixed.includes("\uFFFD") || fixed.includes("Ø")) {
    return line;
  }
  return fixed;
}

const corrupted = execSync("git show b6ec978:src/pages/HrPage.tsx", {
  cwd: root,
  maxBuffer: 10 * 1024 * 1024,
});

const lines = corrupted.toString("utf8").split(/\n/);
const fixed = lines.map(fixLine).join("\n");

console.log("present.ar:", fixed.match(/present: \{ ar: "([^"]+)"/)?.[1]);
console.log("fffd:", (fixed.match(/\uFFFD/g) || []).length);
console.log("mojibake Ø:", (fixed.match(/Ø/g) || []).length);

const unfixed = lines.filter((line, i) => line.includes("Ø") && fixed.split("\n")[i].includes("Ø"));
console.log("unfixed lines:", unfixed.length);
if (unfixed.length > 0) {
  console.log("sample:", unfixed[0].slice(0, 100));
}

if (!fixed.includes("حاضر") || fixed.includes("Ø") || fixed.includes("\uFFFD")) {
  console.error("Fix failed");
  process.exit(1);
}

fs.writeFileSync(target, fixed, { encoding: "utf8" });
console.log("HrPage.tsx encoding fixed successfully");
