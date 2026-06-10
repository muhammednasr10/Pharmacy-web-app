import { jsPDF } from "jspdf";
import { ARABIC_FONT_BASE64 } from "../arabicFont";
import { LOGO_BASE64 } from "../logoBase64";
import type { CustomerDebt, CustomerPayment, PharmacySettings } from "../types";
import { formatDateInput } from "./date";
import { downloadCSV } from "./csvExport";

export type CustomerExportContext = {
  isArabic: boolean;
  currency: string;
  pharmacySettings: PharmacySettings | null;
  getPaymentLabel: (method: string) => string;
};

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pdfLabel(ctx: CustomerExportContext, ar: string, en: string) {
  return ctx.isArabic ? ar : en;
}

function setupArabicPdfFont(docPdf: jsPDF, isArabic: boolean) {
  try {
    docPdf.addFileToVFS("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_BASE64);
    docPdf.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
    docPdf.setFont(isArabic ? "NotoNaskhArabic" : "helvetica", "normal");
  } catch (error) {
    console.error("Arabic PDF font error:", error);
  }
}

function addPdfHeader(docPdf: jsPDF, ctx: CustomerExportContext, title: string, subtitle?: string) {
  setupArabicPdfFont(docPdf, ctx.isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  let y = 15;

  try {
    docPdf.addImage(LOGO_BASE64, "PNG", pageWidth / 2 - 10, y - 8, 20, 20);
    y += 15;
  } catch (error) {
    console.error("PDF logo error:", error);
  }

  const pharmacyName = ctx.isArabic
    ? ctx.pharmacySettings?.name || "صيدلية Focus"
    : ctx.pharmacySettings?.name_en || "Focus Pharmacy";

  docPdf.setFontSize(18);
  docPdf.text(pharmacyName, pageWidth / 2, y, { align: "center" });
  y += 7;

  docPdf.setFontSize(9);
  docPdf.text(
    `${pdfLabel(ctx, "الهاتف", "Phone")}: ${ctx.pharmacySettings?.phone || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 6;

  docPdf.text(
    `${pdfLabel(ctx, "العنوان", "Address")}: ${ctx.pharmacySettings?.address || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" }
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

function addPdfFooter(docPdf: jsPDF, ctx: CustomerExportContext, y: number) {
  setupArabicPdfFont(docPdf, ctx.isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();

  if (y > 280) {
    docPdf.addPage();
    y = 15;
  }

  const pharmacyName = ctx.isArabic
    ? ctx.pharmacySettings?.name || "صيدلية Focus"
    : ctx.pharmacySettings?.name_en || "Focus Pharmacy";

  docPdf.setFontSize(8);
  docPdf.text(pharmacyName, pageWidth / 2, y, { align: "center" });
}

export function printCustomerPaymentReceipt(
  payment: CustomerPayment,
  ctx: CustomerExportContext
) {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;

  let y = addPdfHeader(
    docPdf,
    ctx,
    ctx.isArabic ? "إيصال تحصيل" : "Customer Payment Receipt",
    `${payment.paymentNumber} - ${payment.date || ""}`
  );

  docPdf.setFontSize(10);
  docPdf.text(
    `${pdfLabel(ctx, "رقم الإيصال", "Receipt No")}: ${payment.paymentNumber}`,
    margin,
    y
  );
  y += 7;

  docPdf.text(
    `${pdfLabel(ctx, "العميل", "Customer")}: ${payment.customerName}`,
    margin,
    y
  );
  y += 7;

  docPdf.text(
    `${pdfLabel(ctx, "المبلغ", "Amount")}: ${safeNumber(payment.amount).toFixed(2)} ${ctx.currency}`,
    margin,
    y
  );
  y += 7;

  docPdf.text(
    `${pdfLabel(ctx, "طريقة الدفع", "Payment Method")}: ${ctx.getPaymentLabel(payment.paymentMethod)}`,
    margin,
    y
  );
  y += 7;

  docPdf.text(
    `${pdfLabel(ctx, "المستخدم", "User")}: ${payment.userName || "-"}`,
    margin,
    y
  );
  y += 7;

  docPdf.text(
    `${pdfLabel(ctx, "التاريخ", "Date")}: ${payment.date || "-"}`,
    margin,
    y
  );
  y += 10;

  if (payment.notes) {
    docPdf.text(`${pdfLabel(ctx, "ملاحظات", "Notes")}: ${payment.notes}`, margin, y);
    y += 7;
  }

  docPdf.rect(margin, 45, pageWidth - margin * 2, y - 35);
  y += 12;
  addPdfFooter(docPdf, ctx, y);
  docPdf.save(`${payment.paymentNumber}.pdf`);
}

export function printCustomerStatement(
  customer: CustomerDebt,
  payments: CustomerPayment[],
  ctx: CustomerExportContext
) {
  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;

  let y = addPdfHeader(
    docPdf,
    ctx,
    ctx.isArabic ? "كشف حساب العميل" : "Customer Statement",
    customer.customerName
  );

  docPdf.setFontSize(10);
  docPdf.text(`${pdfLabel(ctx, "العميل", "Customer")}: ${customer.customerName}`, margin, y);
  y += 7;
  docPdf.text(
    `${pdfLabel(ctx, "التاريخ", "Date")}: ${new Date().toLocaleString()}`,
    margin,
    y
  );
  y += 10;

  docPdf.rect(margin, y, pageWidth - margin * 2, 28);
  docPdf.text(
    `${pdfLabel(ctx, "إجمالي الآجل", "Total Credit")}: ${safeNumber(customer.totalDebt).toFixed(2)} ${ctx.currency}`,
    margin + 4,
    y + 8
  );
  docPdf.text(
    `${pdfLabel(ctx, "المحصل", "Paid")}: ${safeNumber(customer.paidAmount).toFixed(2)} ${ctx.currency}`,
    margin + 4,
    y + 16
  );
  docPdf.text(
    `${pdfLabel(ctx, "المتبقي", "Remaining")}: ${safeNumber(customer.remainingDebt).toFixed(2)} ${ctx.currency}`,
    margin + 4,
    y + 24
  );
  y += 40;

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel(ctx, "الفواتير الآجلة", "Credit Invoices"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel(ctx, "رقم الفاتورة", "Invoice No"), margin, y);
  docPdf.text(pdfLabel(ctx, "التاريخ", "Date"), margin + 45, y);
  docPdf.text(pdfLabel(ctx, "الإجمالي", "Total"), margin + 130, y);
  y += 5;

  customer.invoices.forEach((invoice) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }
    docPdf.text(invoice.invoiceNumber || `#${invoice.id}`, margin, y);
    docPdf.text(String(invoice.date || "-").slice(0, 28), margin + 45, y);
    docPdf.text(`${safeNumber(invoice.total).toFixed(2)} ${ctx.currency}`, margin + 130, y);
    y += 7;
  });

  y += 8;
  if (y > 260) {
    docPdf.addPage();
    y = 15;
  }

  docPdf.setFontSize(13);
  docPdf.text(pdfLabel(ctx, "التحصيلات", "Payments"), margin, y);
  y += 8;

  docPdf.setFontSize(9);
  docPdf.text(pdfLabel(ctx, "رقم التحصيل", "Payment No"), margin, y);
  docPdf.text(pdfLabel(ctx, "التاريخ", "Date"), margin + 45, y);
  docPdf.text(pdfLabel(ctx, "المبلغ", "Amount"), margin + 130, y);
  y += 5;

  payments.forEach((payment) => {
    if (y > 275) {
      docPdf.addPage();
      y = 15;
    }
    docPdf.text(payment.paymentNumber || `#${payment.id}`, margin, y);
    docPdf.text(String(payment.date || "-").slice(0, 28), margin + 45, y);
    docPdf.text(`${safeNumber(payment.amount).toFixed(2)} ${ctx.currency}`, margin + 130, y);
    y += 7;
  });

  addPdfFooter(docPdf, ctx, y);
  docPdf.save(`customer-statement-${customer.customerName}.pdf`);
}

export function exportCustomerStatementCSV(
  customer: CustomerDebt,
  payments: CustomerPayment[],
  ctx: CustomerExportContext
) {
  const rows = [
    [ctx.isArabic ? "كشف حساب العميل" : "Customer Statement"],
    [],
    [ctx.isArabic ? "اسم العميل" : "Customer Name", customer.customerName],
    [ctx.isArabic ? "إجمالي الآجل" : "Total Credit", safeNumber(customer.totalDebt).toFixed(2)],
    [ctx.isArabic ? "المحصل" : "Paid", safeNumber(customer.paidAmount).toFixed(2)],
    [ctx.isArabic ? "المتبقي" : "Remaining", safeNumber(customer.remainingDebt).toFixed(2)],
    [],
    [ctx.isArabic ? "الفواتير الآجلة" : "Credit Invoices"],
    [
      ctx.isArabic ? "رقم الفاتورة" : "Invoice No.",
      ctx.isArabic ? "التاريخ" : "Date",
      ctx.isArabic ? "الإجمالي" : "Total",
    ],
    ...customer.invoices.map((invoice) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      safeNumber(invoice.total).toFixed(2),
    ]),
    [],
    [ctx.isArabic ? "التحصيلات" : "Payments"],
    [
      ctx.isArabic ? "رقم التحصيل" : "Payment No.",
      ctx.isArabic ? "التاريخ" : "Date",
      ctx.isArabic ? "المبلغ" : "Amount",
      ctx.isArabic ? "طريقة الدفع" : "Payment Method",
      ctx.isArabic ? "المستخدم" : "User",
      ctx.isArabic ? "ملاحظات" : "Notes",
    ],
    ...payments.map((payment) => [
      payment.paymentNumber || `#${payment.id}`,
      payment.date || "-",
      safeNumber(payment.amount).toFixed(2),
      ctx.getPaymentLabel(payment.paymentMethod || "cash"),
      payment.userName || "-",
      payment.notes || "-",
    ]),
  ];

  downloadCSV(
    `customer-statement-${customer.customerName}-${formatDateInput(new Date())}.csv`,
    rows
  );
}

export function exportCustomersDebtsCSV(
  customers: CustomerDebt[],
  ctx: CustomerExportContext
) {
  const rows = [
    [
      ctx.isArabic ? "اسم العميل" : "Customer Name",
      ctx.isArabic ? "إجمالي الآجل" : "Total Credit",
      ctx.isArabic ? "المحصل" : "Paid",
      ctx.isArabic ? "المتبقي" : "Remaining",
      ctx.isArabic ? "عدد الفواتير" : "Invoices Count",
      ctx.isArabic ? "آخر فاتورة" : "Last Invoice Date",
    ],
    ...customers.map((customer) => [
      customer.customerName,
      safeNumber(customer.totalDebt).toFixed(2),
      safeNumber(customer.paidAmount).toFixed(2),
      safeNumber(customer.remainingDebt).toFixed(2),
      customer.invoicesCount,
      customer.lastInvoiceDate,
    ]),
  ];

  downloadCSV(`customers-debts-${formatDateInput(new Date())}.csv`, rows);
}
