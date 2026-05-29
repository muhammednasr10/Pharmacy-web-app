const fs = require("fs");
const path = require("path");

const logoPath = path.join(__dirname, "src", "assets", "logo.png");
const outputPath = path.join(__dirname, "src", "logoBase64.ts");

if (!fs.existsSync(logoPath)) {
  console.error("Logo file not found:", logoPath);
  process.exit(1);
}

const logoBase64 = fs.readFileSync(logoPath).toString("base64");

const content = `export const LOGO_BASE64 = "data:image/png;base64,${logoBase64}";\n`;

fs.writeFileSync(outputPath, content);

console.log("Logo generated successfully:", outputPath);