const fs = require("fs");
const path = require("path");

const fontPath = path.join(
  __dirname,
  "src",
  "fonts",
  "NotoNaskhArabic-Regular.ttf"
);

const outputPath = path.join(__dirname, "src", "arabicFont.ts");

if (!fs.existsSync(fontPath)) {
  console.error("Font file not found:", fontPath);
  process.exit(1);
}

const fontBase64 = fs.readFileSync(fontPath).toString("base64");

const content = `export const ARABIC_FONT_BASE64 = "${fontBase64}";\n`;

fs.writeFileSync(outputPath, content);

console.log("Arabic font generated successfully:", outputPath);