import { jsPDF } from "jspdf";
import { ARABIC_FONT_BASE64 } from "../arabicFont";
import { LOGO_BASE64 } from "../logoBase64";
import { getBranchLabel } from "./branchLabel";
import type { BranchStockTransfer, PharmacySettings } from "../types";

export type BranchTransferPrintItem = {
  name: string;
  barcode?: string;
  quantity: number;
};

export type BranchTransferPrintParams = {
  isArabic: boolean;
  transferNumber: string;
  fromBranchLabel: string;
  toBranchLabel: string;
  items: BranchTransferPrintItem[];
  totalQty: number;
  notes?: string;
  userName?: string;
  createdAt?: string;
  pharmacySettings?: PharmacySettings | null;
  logoBase64?: string;
};

function label(isArabic: boolean, ar: string, en: string) {
  return isArabic ? ar : en;
}

function setupPdfFont(docPdf: jsPDF, isArabic: boolean) {
  try {
    docPdf.addFileToVFS("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_BASE64);
    docPdf.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
    if (isArabic) {
      docPdf.setFont("NotoNaskhArabic", "normal");
    } else {
      docPdf.setFont("helvetica", "normal");
    }
    docPdf.setR2L(false);
  } catch (error) {
    console.error("Branch transfer PDF font error:", error);
  }
}

function formatPrintDate(value?: string, isArabic?: boolean) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

function addHeader(
  docPdf: jsPDF,
  params: BranchTransferPrintParams,
  title: string,
  subtitle: string,
) {
  setupPdfFont(docPdf, params.isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const settings = params.pharmacySettings;
  const logo = params.logoBase64 || LOGO_BASE64;
  let y = 15;

  try {
    docPdf.addImage(logo, "PNG", pageWidth / 2 - 10, y - 8, 20, 20);
    y += 15;
  } catch (error) {
    console.error("Branch transfer PDF logo error:", error);
  }

  docPdf.setFontSize(18);
  docPdf.text(
    params.isArabic
      ? settings?.name || "صيدلية Focus"
      : settings?.name_en || settings?.name || "Focus Pharmacy",
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 7;

  docPdf.setFontSize(9);
  docPdf.text(
    `${label(params.isArabic, "الهاتف", "Phone")}: ${settings?.phone || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 6;
  docPdf.text(
    `${label(params.isArabic, "العنوان", "Address")}: ${settings?.address || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 8;

  docPdf.setFontSize(13);
  docPdf.text(title, pageWidth / 2, y, { align: "center" });
  y += 6;
  docPdf.setFontSize(9);
  docPdf.text(subtitle, pageWidth / 2, y, { align: "center" });

  return y + 12;
}

export function buildBranchTransferPrintParams(input: {
  records: BranchStockTransfer[];
  branches: PharmacySettings[];
  isArabic: boolean;
  pharmacySettings?: PharmacySettings | null;
  logoBase64?: string;
}): BranchTransferPrintParams | null {
  if (input.records.length === 0) return null;
  const first = input.records[0];
  return {
    isArabic: input.isArabic,
    transferNumber: first.transferNumber,
    fromBranchLabel: getBranchLabel(first.fromPharmacyId, input.branches, input.isArabic),
    toBranchLabel: getBranchLabel(first.toPharmacyId, input.branches, input.isArabic),
    items: input.records.map((row) => ({
      name:
        (input.isArabic ? row.medicineName_ar : row.medicineName_en) ||
        row.medicineName_ar ||
        row.medicineName_en ||
        "—",
      barcode: row.barcode,
      quantity: row.quantity,
    })),
    totalQty: input.records.reduce((sum, row) => sum + row.quantity, 0),
    notes: first.notes,
    userName: first.userName,
    createdAt: first.createdAt,
    pharmacySettings: input.pharmacySettings,
    logoBase64: input.logoBase64,
  };
}

export function printBranchTransferPDF(params: BranchTransferPrintParams) {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;
  const ar = params.isArabic;

  let y = addHeader(
    docPdf,
    params,
    label(ar, "سند نقل مخزون بين الفروع", "Branch Stock Transfer Note"),
    `${params.transferNumber} · ${formatPrintDate(params.createdAt, ar)}`,
  );

  docPdf.setFontSize(10);
  docPdf.setFillColor(248, 250, 252);
  docPdf.rect(margin, y, pageWidth - margin * 2, 36, "F");
  docPdf.rect(margin, y, pageWidth - margin * 2, 36);

  docPdf.text(
    `${label(ar, "رقم السند", "Transfer No.")}: ${params.transferNumber}`,
    margin + 4,
    y + 9,
  );
  docPdf.text(
    `${label(ar, "التاريخ", "Date")}: ${formatPrintDate(params.createdAt, ar)}`,
    margin + 4,
    y + 18,
  );
  docPdf.text(`${label(ar, "المستخدم", "User")}: ${params.userName || "—"}`, margin + 4, y + 27);
  docPdf.text(`${label(ar, "من فرع", "From")}: ${params.fromBranchLabel}`, pageWidth / 2, y + 9);
  docPdf.text(`${label(ar, "إلى فرع", "To")}: ${params.toBranchLabel}`, pageWidth / 2, y + 18);
  docPdf.text(
    `${label(ar, "إجمالي الكمية", "Total qty")}: ${params.totalQty}`,
    pageWidth / 2,
    y + 27,
  );

  y += 44;

  const colX = {
    index: margin,
    item: margin + 12,
    barcode: margin + 95,
    qty: margin + 155,
  };

  docPdf.setFillColor(229, 244, 238);
  docPdf.rect(margin, y, pageWidth - margin * 2, 10, "F");
  docPdf.rect(margin, y, pageWidth - margin * 2, 10);
  docPdf.text("#", colX.index + 2, y + 7);
  docPdf.text(label(ar, "الصنف", "Item"), colX.item + 2, y + 7);
  docPdf.text(label(ar, "الباركود", "Barcode"), colX.barcode + 2, y + 7);
  docPdf.text(label(ar, "الكمية", "Qty"), colX.qty + 2, y + 7);
  y += 11;

  params.items.forEach((item, index) => {
    if (y > 265) {
      docPdf.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      docPdf.setFillColor(252, 252, 253);
      docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10, "F");
    }
    docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10);

    const shortName = item.name.length > 36 ? `${item.name.slice(0, 36)}…` : item.name;
    docPdf.text(String(index + 1), colX.index + 2, y + 5);
    docPdf.text(shortName, colX.item + 2, y + 5);
    docPdf.text(item.barcode || "—", colX.barcode + 2, y + 5);
    docPdf.text(String(item.quantity), colX.qty + 2, y + 5);
    y += 10;
  });

  y += 8;

  if (params.notes?.trim()) {
    docPdf.setFontSize(10);
    docPdf.text(`${label(ar, "ملاحظات", "Notes")}: ${params.notes.trim()}`, margin, y);
    y += 10;
  }

  if (y > 240) {
    docPdf.addPage();
    y = 25;
  }

  y += 6;
  docPdf.setFontSize(9);
  const sigWidth = (pageWidth - margin * 2 - 12) / 3;
  const sigLabels = ar
    ? ["مسؤول الفرع المصدر", "مسؤول الفرع المستلم", "مدير عام / اعتماد"]
    : ["Source branch", "Receiving branch", "Manager approval"];

  sigLabels.forEach((sigLabel, index) => {
    const x = margin + index * (sigWidth + 6);
    docPdf.text(sigLabel, x + sigWidth / 2, y, { align: "center" });
    docPdf.line(x, y + 14, x + sigWidth, y + 14);
  });

  y += 24;
  const footer = params.pharmacySettings?.invoiceFooter;
  if (footer?.trim()) {
    docPdf.setFontSize(8);
    docPdf.text(footer.trim(), pageWidth / 2, y, { align: "center" });
  }

  docPdf.save(`${params.transferNumber || "transfer"}.pdf`);
}
