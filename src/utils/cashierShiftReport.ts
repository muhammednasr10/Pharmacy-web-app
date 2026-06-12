import { jsPDF } from "jspdf";
import type { CashierShift, CashierShiftSummary, PharmacySettings } from "../types";

function pdfLabel(ar: string, en: string, isArabic: boolean) {
  return isArabic ? ar : en;
}

function formatMoney(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function formatDateTime(value: string | undefined, isArabic: boolean) {
  if (!value) return "—";
  return new Date(value).toLocaleString(isArabic ? "ar-EG" : "en-GB");
}

export function downloadCashierShiftPdf(options: {
  shift: CashierShift;
  summary: CashierShiftSummary;
  pharmacy?: PharmacySettings | null;
  currency: string;
  isArabic: boolean;
  getPaymentLabel?: (method: string) => string;
}) {
  const { shift, summary, pharmacy, currency, isArabic } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  const pharmacyName = isArabic
    ? pharmacy?.name || pharmacy?.name_en || "الصيدلية"
    : pharmacy?.name_en || pharmacy?.name || "Pharmacy";

  doc.setFontSize(16);
  doc.text(pharmacyName, margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(
    pdfLabel("تقرير إغلاق وردية الكاشير", "Cashier Shift Closing Report", isArabic),
    margin,
    y,
  );
  y += 10;

  doc.setFontSize(10);
  const lines: Array<[string, string]> = [
    [pdfLabel("رقم الوردية", "Shift No.", isArabic), shift.shiftNumber],
    [pdfLabel("الكاشير", "Cashier", isArabic), shift.cashierName || shift.cashierId],
    [pdfLabel("فتح الوردية", "Opened", isArabic), formatDateTime(shift.openedAt, isArabic)],
    [pdfLabel("إغلاق الوردية", "Closed", isArabic), formatDateTime(shift.closedAt, isArabic)],
    [pdfLabel("رصيد افتتاحي", "Opening cash", isArabic), formatMoney(shift.openingCash, currency)],
    [pdfLabel("مبيعات نقدية", "Cash sales", isArabic), formatMoney(summary.cashSales, currency)],
    [pdfLabel("مبيعات فيزا", "Card sales", isArabic), formatMoney(summary.visaSales, currency)],
    [
      pdfLabel("مبيعات محفظة", "Wallet sales", isArabic),
      formatMoney(summary.walletSales, currency),
    ],
    [pdfLabel("مبيعات آجل", "Credit sales", isArabic), formatMoney(summary.creditSales, currency)],
    [
      pdfLabel("إجمالي المبيعات", "Total sales", isArabic),
      formatMoney(summary.totalSales, currency),
    ],
    [pdfLabel("مرتجعات", "Returns", isArabic), formatMoney(summary.returnsTotal, currency)],
    [
      pdfLabel("تحصيلات نقدية", "Cash collections", isArabic),
      formatMoney(summary.customerPaymentsCash, currency),
    ],
    [
      pdfLabel("تحصيلات أخرى", "Other collections", isArabic),
      formatMoney(summary.customerPaymentsOther, currency),
    ],
    [
      pdfLabel("النقد المتوقع", "Expected cash", isArabic),
      formatMoney(summary.expectedCash, currency),
    ],
    [
      pdfLabel("النقد الفعلي", "Actual cash", isArabic),
      formatMoney(shift.actualCash ?? 0, currency),
    ],
    [
      pdfLabel("الفرق", "Variance", isArabic),
      formatMoney(shift.cashVariance ?? summary.expectedCash - (shift.actualCash ?? 0), currency),
    ],
    [pdfLabel("عدد الفواتير", "Invoices", isArabic), String(summary.invoiceCount)],
  ];

  lines.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, margin, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  });

  if (shift.notes?.trim()) {
    y += 4;
    doc.text(`${pdfLabel("ملاحظات", "Notes", isArabic)}: ${shift.notes.trim()}`, margin, y);
  }

  doc.save(`${shift.shiftNumber || shift.id}-shift.pdf`);
}
