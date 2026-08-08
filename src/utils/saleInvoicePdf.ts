import { jsPDF } from "jspdf";
import { ARABIC_FONT_BASE64 } from "../arabicFont";
import { tryAddPdfLogoImage } from "./pdfLogo";
import type { Invoice, PharmacySettings } from "../types";

type PrintSaleInvoiceOptions = {
  invoice: Invoice;
  isArabic: boolean;
  currency: string;
  pharmacySettings: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
};

function safeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function pdfLabel(ar: string, en: string, isArabic: boolean) {
  return isArabic ? ar : en;
}

function setupArabicPdfFont(docPdf: jsPDF, isArabic: boolean) {
  try {
    docPdf.addFileToVFS("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_BASE64);
    docPdf.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");

    if (isArabic) {
      docPdf.setFont("NotoNaskhArabic", "normal");
      docPdf.setR2L(false);
    } else {
      docPdf.setFont("helvetica", "normal");
      docPdf.setR2L(false);
    }
  } catch (error) {
    console.error("Arabic PDF font error:", error);
  }
}

async function addPdfHeader(
  docPdf: jsPDF,
  isArabic: boolean,
  pharmacySettings: PharmacySettings | null,
  title: string,
  subtitle?: string,
) {
  setupArabicPdfFont(docPdf, isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  let y = 15;

  if (
    await tryAddPdfLogoImage(
      docPdf,
      pharmacySettings?.logoBase64,
      pageWidth / 2 - 10,
      y - 8,
      20,
      20,
    )
  ) {
    y += 15;
  }

  docPdf.setFontSize(18);
  docPdf.text(
    isArabic
      ? pharmacySettings?.name || "صيدلية Focus"
      : pharmacySettings?.name_en || "Focus Pharmacy",
    pageWidth / 2,
    y,
    { align: "center" },
  );

  y += 7;

  docPdf.setFontSize(9);
  docPdf.text(
    `${pdfLabel("الهاتف", "Phone", isArabic)}: ${pharmacySettings?.phone || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );

  y += 6;

  docPdf.text(
    `${pdfLabel("العنوان", "Address", isArabic)}: ${pharmacySettings?.address || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );

  y += 8;

  docPdf.setFontSize(13);
  docPdf.text(title, pageWidth / 2, y, { align: "center" });

  if (subtitle) {
    y += 6;
    docPdf.setFontSize(9);
    docPdf.text(subtitle, pageWidth / 2, y, { align: "center" });
  }

  return y + 12;
}

function addPdfFooter(
  docPdf: jsPDF,
  y: number,
  isArabic: boolean,
  pharmacySettings: PharmacySettings | null,
) {
  setupArabicPdfFont(docPdf, isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();

  if (y > 280) {
    docPdf.addPage();
    y = 15;
  }

  const pharmacyName = isArabic
    ? pharmacySettings?.name || "صيدلية Focus"
    : pharmacySettings?.name_en || "Focus Pharmacy";

  docPdf.setFontSize(9);
  docPdf.text(pharmacySettings?.invoiceFooter || pharmacyName, pageWidth / 2, y, {
    align: "center",
  });
}

export async function printSaleInvoice({
  invoice,
  isArabic,
  currency,
  pharmacySettings,
  getPaymentLabel,
}: PrintSaleInvoiceOptions) {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;

  let y = await addPdfHeader(
    docPdf,
    isArabic,
    pharmacySettings,
    isArabic ? "فاتورة بيع" : "Sales Invoice",
    `${invoice.invoiceNumber || `#${invoice.id}`} - ${invoice.date || ""}`,
  );

  docPdf.setFontSize(10);
  docPdf.setFillColor(248, 250, 252);
  docPdf.rect(margin, y, pageWidth - margin * 2, 32, "F");
  docPdf.rect(margin, y, pageWidth - margin * 2, 32);

  docPdf.text(
    `${pdfLabel("رقم الفاتورة", "Invoice No", isArabic)}: ${invoice.invoiceNumber || `#${invoice.id}`}`,
    margin + 4,
    y + 9,
  );

  docPdf.text(
    `${pdfLabel("التاريخ", "Date", isArabic)}: ${invoice.date || ""}`,
    margin + 4,
    y + 18,
  );

  docPdf.text(
    `${pdfLabel("طريقة الدفع", "Payment", isArabic)}: ${getPaymentLabel(invoice.paymentMethod || "cash")}`,
    margin + 4,
    y + 27,
  );

  const customerName = (invoice as Invoice & { customerName?: string }).customerName;
  if (customerName) {
    docPdf.text(
      `${pdfLabel("العميل", "Customer", isArabic)}: ${customerName}`,
      pageWidth / 2,
      y + 9,
    );
  }

  const cashierName = (invoice as Invoice & { cashierName?: string }).cashierName;
  if (cashierName) {
    docPdf.text(
      `${pdfLabel("الكاشير", "Cashier", isArabic)}: ${cashierName}`,
      pageWidth / 2,
      y + 18,
    );
  }

  y += 42;

  const colX = {
    item: margin,
    barcode: margin + 65,
    qty: margin + 115,
    unit: margin + 135,
    total: margin + 165,
  };

  docPdf.setFontSize(10);
  docPdf.setFillColor(229, 244, 238);
  docPdf.rect(margin, y, pageWidth - margin * 2, 10, "F");
  docPdf.rect(margin, y, pageWidth - margin * 2, 10);

  docPdf.text(pdfLabel("الصنف", "Item", isArabic), colX.item + 2, y + 7);
  docPdf.text(pdfLabel("الباركود", "Barcode", isArabic), colX.barcode + 2, y + 7);
  docPdf.text(pdfLabel("الكمية", "Qty", isArabic), colX.qty + 2, y + 7);
  docPdf.text(pdfLabel("السعر", "Unit", isArabic), colX.unit + 2, y + 7);
  docPdf.text(pdfLabel("الإجمالي", "Total", isArabic), colX.total + 2, y + 7);

  y += 11;

  invoice.items?.forEach((item, index) => {
    const name = isArabic ? item.name_ar : item.name_en;
    const shortName = name.length > 28 ? `${name.slice(0, 28)}...` : name;

    if (y > 270) {
      docPdf.addPage();
      y = 15;
    }

    if (index % 2 === 0) {
      docPdf.setFillColor(252, 252, 253);
      docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10, "F");
    }

    docPdf.rect(margin, y - 2, pageWidth - margin * 2, 10);

    docPdf.text(`${index + 1}. ${shortName}`, colX.item + 2, y + 5);
    docPdf.text(String(item.barcode || ""), colX.barcode + 2, y + 5);
    docPdf.text(String(item.quantity || 0), colX.qty + 2, y + 5);
    docPdf.text(safeNumber(item.unitPrice).toFixed(2), colX.unit + 2, y + 5);
    docPdf.text(safeNumber(item.lineTotal).toFixed(2), colX.total + 2, y + 5);

    y += 10;
  });

  y += 8;
  const totalsX = pageWidth - 78;
  docPdf.setFontSize(11);
  docPdf.setFillColor(248, 250, 252);
  docPdf.rect(totalsX, y, 68, 36, "F");
  docPdf.rect(totalsX, y, 68, 36);
  docPdf.text(`${pdfLabel("قبل الخصم", "Subtotal", isArabic)}:`, totalsX + 4, y + 8);
  docPdf.text(
    `${(invoice.subtotal || invoice.total || 0).toFixed(2)} ${currency}`,
    totalsX + 36,
    y + 8,
  );
  docPdf.text(`${pdfLabel("الخصم", "Discount", isArabic)}:`, totalsX + 4, y + 18);
  docPdf.text(`${(invoice.discount || 0).toFixed(2)} ${currency}`, totalsX + 34, y + 18);
  docPdf.setFontSize(12);
  docPdf.text(`${pdfLabel("الإجمالي", "Total", isArabic)}:`, totalsX + 4, y + 29);
  docPdf.text(`${(invoice.total || 0).toFixed(2)} ${currency}`, totalsX + 34, y + 29);
  addPdfFooter(docPdf, y, isArabic, pharmacySettings);

  docPdf.save(`${invoice.invoiceNumber || invoice.id}.pdf`);
}
