import type { jsPDF } from "jspdf";
import { DEFAULT_APP_LOGO_URL, isInlineLogoSource } from "./appLogoAsset";

let cachedDefaultLogoDataUrl: string | null = null;
let defaultLogoLoadPromise: Promise<string | null> | null = null;

async function loadUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "") || null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | "SVG" {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  if (dataUrl.includes("image/svg")) return "SVG";
  return "PNG";
}

export async function resolvePdfLogoDataUrl(logoSource?: string | null): Promise<string | null> {
  const trimmed = logoSource?.trim();
  if (trimmed && isInlineLogoSource(trimmed)) {
    return trimmed;
  }
  if (trimmed && (trimmed.startsWith("/") || trimmed.startsWith("http"))) {
    return loadUrlAsDataUrl(trimmed);
  }
  if (cachedDefaultLogoDataUrl) return cachedDefaultLogoDataUrl;
  if (!defaultLogoLoadPromise) {
    defaultLogoLoadPromise = loadUrlAsDataUrl(DEFAULT_APP_LOGO_URL).then((dataUrl) => {
      cachedDefaultLogoDataUrl = dataUrl;
      return dataUrl;
    });
  }
  return defaultLogoLoadPromise;
}

export async function tryAddPdfLogoImage(
  docPdf: jsPDF,
  logoSource: string | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<boolean> {
  const dataUrl = await resolvePdfLogoDataUrl(logoSource);
  if (!dataUrl) return false;
  try {
    docPdf.addImage(dataUrl, detectImageFormat(dataUrl), x, y, width, height);
    return true;
  } catch (error) {
    console.error("PDF logo error:", error);
    return false;
  }
}
