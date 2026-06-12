import { jsPDF } from "jspdf";
import { ARABIC_FONT_BASE64 } from "../arabicFont";
import { LOGO_BASE64 } from "../logoBase64";
import type { BranchReportRow } from "./branchReports";

type SellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type InventoryRow = {
  name_ar: string;
  name_en: string;
  barcode: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

export type ReportExportSnapshot = {
  isArabic: boolean;
  currency: string;
  reportFrom: string;
  reportTo: string;
  pharmacyName: string;
  pharmacyNameEn?: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  invoiceFooter?: string;
  filteredReportInvoicesCount: number;
  filteredReportTotal: number;
  filteredReportProfitTotal: number;
  filteredReportDiscountTotal: number;
  reportUnitsSold: number;
  reportReturnsTotal: number;
  reportCostsTotal: number;
  reportCostsCount: number;
  netProfitAfterCosts: number;
  netSales: number;
  profitMargin: number;
  reportPaymentTotals: Record<string, number>;
  reportCostsByCategory: Array<{ category: string; label: string; total: number }>;
  reportCashierTotals: Record<string, number>;
  topSellingMedicines: SellingMedicine[];
  reportSalesTrend: Array<{ date: string; total: number }>;
  branchReportRows: BranchReportRow[];
  medicines: InventoryRow[];
  getPaymentLabel: (method: string) => string;
};

function label(snapshot: ReportExportSnapshot, ar: string, en: string) {
  return snapshot.isArabic ? ar : en;
}

function money(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function escapeCSV(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function barcodeCSV(value: unknown) {
  return `="${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          if (typeof value === "string" && value.startsWith('="')) {
            return value;
          }
          return escapeCSV(value);
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setupArabicPdfFont(docPdf: jsPDF, isArabic: boolean) {
  try {
    docPdf.addFileToVFS("NotoNaskhArabic-Regular.ttf", ARABIC_FONT_BASE64);
    docPdf.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
    docPdf.setFont(isArabic ? "NotoNaskhArabic" : "helvetica", "normal");
    docPdf.setR2L(false);
  } catch (error) {
    console.error("Arabic PDF font error:", error);
  }
}

function addPdfHeader(docPdf: jsPDF, snapshot: ReportExportSnapshot, title: string) {
  setupArabicPdfFont(docPdf, snapshot.isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  let y = 15;

  try {
    docPdf.addImage(LOGO_BASE64, "PNG", pageWidth / 2 - 10, y - 8, 20, 20);
    y += 15;
  } catch {
    /* logo optional */
  }

  const pharmacyName = snapshot.isArabic
    ? snapshot.pharmacyName
    : snapshot.pharmacyNameEn || snapshot.pharmacyName;

  docPdf.setFontSize(18);
  docPdf.text(pharmacyName, pageWidth / 2, y, { align: "center" });
  y += 7;

  docPdf.setFontSize(9);
  docPdf.text(
    `${label(snapshot, "الهاتف", "Phone")}: ${snapshot.pharmacyPhone || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 6;
  docPdf.text(
    `${label(snapshot, "العنوان", "Address")}: ${snapshot.pharmacyAddress || "-"}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 8;

  docPdf.setFontSize(13);
  docPdf.text(title, pageWidth / 2, y, { align: "center" });
  y += 6;
  docPdf.setFontSize(9);
  docPdf.text(`${snapshot.reportFrom} → ${snapshot.reportTo}`, pageWidth / 2, y, {
    align: "center",
  });

  return y + 12;
}

function ensurePageSpace(docPdf: jsPDF, y: number, needed = 12) {
  if (y + needed > 280) {
    docPdf.addPage();
    return 15;
  }
  return y;
}

export function downloadFinancialReportCsv(snapshot: ReportExportSnapshot) {
  const rows: unknown[][] = [
    [label(snapshot, "تقرير مالي", "Financial Report")],
    [label(snapshot, "من", "From"), snapshot.reportFrom],
    [label(snapshot, "إلى", "To"), snapshot.reportTo],
    [label(snapshot, "تاريخ التصدير", "Export date"), new Date().toLocaleString()],
    [],
    [label(snapshot, "ملخص الفترة", "Period Summary")],
    [
      label(snapshot, "إجمالي المبيعات", "Total Sales"),
      money(snapshot.filteredReportTotal, snapshot.currency),
    ],
    [
      label(snapshot, "مجمل الربح", "Gross Profit"),
      money(snapshot.filteredReportProfitTotal, snapshot.currency),
    ],
    [label(snapshot, "هامش الربح", "Profit Margin"), `${snapshot.profitMargin.toFixed(1)}%`],
    [label(snapshot, "صافي المبيعات", "Net Sales"), money(snapshot.netSales, snapshot.currency)],
    [
      label(snapshot, "المرتجعات", "Returns"),
      money(snapshot.reportReturnsTotal, snapshot.currency),
    ],
    [
      label(snapshot, "الخصومات", "Discounts"),
      money(snapshot.filteredReportDiscountTotal, snapshot.currency),
    ],
    [label(snapshot, "التكاليف", "Costs"), money(snapshot.reportCostsTotal, snapshot.currency)],
    [
      label(snapshot, "صافي الربح بعد التكاليف", "Net Profit After Costs"),
      money(snapshot.netProfitAfterCosts, snapshot.currency),
    ],
    [label(snapshot, "عدد الفواتير", "Invoices"), snapshot.filteredReportInvoicesCount],
    [label(snapshot, "وحدات مباعة", "Units Sold"), snapshot.reportUnitsSold],
    [],
    [label(snapshot, "المبيعات حسب طريقة الدفع", "Sales by Payment Method")],
    [label(snapshot, "الطريقة", "Method"), label(snapshot, "الإجمالي", "Total")],
    ...["cash", "visa", "wallet", "credit"].map((method) => [
      snapshot.getPaymentLabel(method),
      money(snapshot.reportPaymentTotals[method] || 0, snapshot.currency),
    ]),
    [],
    [label(snapshot, "التكاليف حسب التصنيف", "Costs by Category")],
    [label(snapshot, "التصنيف", "Category"), label(snapshot, "الإجمالي", "Total")],
    ...snapshot.reportCostsByCategory.map((item) => [
      item.label,
      money(item.total, snapshot.currency),
    ]),
    [],
    [label(snapshot, "أداء الكاشير", "Cashier Performance")],
    [label(snapshot, "الكاشير", "Cashier"), label(snapshot, "المبيعات", "Sales")],
    ...Object.entries(snapshot.reportCashierTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => [name, money(total, snapshot.currency)]),
    [],
    [label(snapshot, "أكثر الأدوية مبيعًا", "Top Selling Medicines")],
    [
      "#",
      label(snapshot, "الصنف", "Item"),
      label(snapshot, "الكمية", "Qty"),
      label(snapshot, "الإجمالي", "Total"),
    ],
    ...snapshot.topSellingMedicines.map((item, index) => [
      index + 1,
      snapshot.isArabic ? item.name_ar : item.name_en,
      item.quantity,
      money(item.total, snapshot.currency),
    ]),
    [],
    [label(snapshot, "اتجاه المبيعات اليومي", "Daily Sales Trend")],
    [label(snapshot, "التاريخ", "Date"), label(snapshot, "المبيعات", "Sales")],
    ...snapshot.reportSalesTrend.map((point) => [
      point.date,
      money(point.total, snapshot.currency),
    ]),
  ];

  if (snapshot.branchReportRows.length > 0) {
    rows.push(
      [],
      [label(snapshot, "مقارنة الفروع", "Branch Comparison")],
      [
        label(snapshot, "الفرع", "Branch"),
        label(snapshot, "فواتير", "Invoices"),
        label(snapshot, "مبيعات", "Sales"),
        label(snapshot, "ربح", "Profit"),
        label(snapshot, "مرتجعات", "Returns"),
        label(snapshot, "تكاليف", "Costs"),
        label(snapshot, "صافي بعد التكاليف", "Net after costs"),
      ],
      ...snapshot.branchReportRows.map((row) => [
        row.branchLabel,
        row.invoiceCount,
        money(row.salesTotal, snapshot.currency),
        money(row.profitTotal, snapshot.currency),
        money(row.returnsTotal, snapshot.currency),
        money(row.costsTotal, snapshot.currency),
        money(row.netProfitAfterCosts, snapshot.currency),
      ]),
    );
  }

  rows.push(
    [],
    [label(snapshot, "المخزون الحالي", "Current Inventory")],
    [
      label(snapshot, "اسم عربي", "Arabic Name"),
      label(snapshot, "اسم إنجليزي", "English Name"),
      label(snapshot, "باركود", "Barcode"),
      label(snapshot, "كمية", "Qty"),
      label(snapshot, "سعر شراء", "Buy Price"),
      label(snapshot, "سعر بيع", "Sell Price"),
      label(snapshot, "صلاحية", "Expiry"),
    ],
    ...snapshot.medicines.map((medicine) => [
      medicine.name_ar,
      medicine.name_en,
      barcodeCSV(medicine.barcode),
      medicine.qty,
      Number(medicine.buyPrice || 0).toFixed(2),
      Number(medicine.price || 0).toFixed(2),
      medicine.expiry,
    ]),
  );

  downloadCsv(`financial-report-${snapshot.reportFrom}_${snapshot.reportTo}.csv`, rows);
}

export function downloadFinancialReportPdf(snapshot: ReportExportSnapshot) {
  const docPdf = new jsPDF();
  const margin = 10;
  const pageWidth = docPdf.internal.pageSize.getWidth();
  let y = addPdfHeader(docPdf, snapshot, label(snapshot, "التقرير المالي", "Financial Report"));

  const summaryLines: Array<[string, string]> = [
    [
      label(snapshot, "إجمالي المبيعات", "Total Sales"),
      money(snapshot.filteredReportTotal, snapshot.currency),
    ],
    [
      label(snapshot, "مجمل الربح", "Gross Profit"),
      money(snapshot.filteredReportProfitTotal, snapshot.currency),
    ],
    [label(snapshot, "هامش الربح", "Profit Margin"), `${snapshot.profitMargin.toFixed(1)}%`],
    [label(snapshot, "صافي المبيعات", "Net Sales"), money(snapshot.netSales, snapshot.currency)],
    [
      label(snapshot, "المرتجعات", "Returns"),
      money(snapshot.reportReturnsTotal, snapshot.currency),
    ],
    [label(snapshot, "التكاليف", "Costs"), money(snapshot.reportCostsTotal, snapshot.currency)],
    [
      label(snapshot, "صافي الربح بعد التكاليف", "Net Profit After Costs"),
      money(snapshot.netProfitAfterCosts, snapshot.currency),
    ],
    [label(snapshot, "عدد الفواتير", "Invoices"), String(snapshot.filteredReportInvoicesCount)],
    [label(snapshot, "وحدات مباعة", "Units Sold"), String(snapshot.reportUnitsSold)],
  ];

  docPdf.setFontSize(11);
  docPdf.text(label(snapshot, "ملخص الفترة", "Period Summary"), margin, y);
  y += 7;
  docPdf.setFontSize(9);
  summaryLines.forEach(([left, right]) => {
    y = ensurePageSpace(docPdf, y);
    docPdf.text(`${left}: ${right}`, margin, y);
    y += 6;
  });

  y += 4;
  y = ensurePageSpace(docPdf, y, 20);
  docPdf.setFontSize(11);
  docPdf.text(label(snapshot, "طرق الدفع", "Payment Methods"), margin, y);
  y += 7;
  docPdf.setFontSize(9);
  ["cash", "visa", "wallet", "credit"].forEach((method) => {
    y = ensurePageSpace(docPdf, y);
    docPdf.text(
      `${snapshot.getPaymentLabel(method)}: ${money(snapshot.reportPaymentTotals[method] || 0, snapshot.currency)}`,
      margin,
      y,
    );
    y += 6;
  });

  if (snapshot.reportCostsByCategory.length > 0) {
    y += 4;
    y = ensurePageSpace(docPdf, y, 20);
    docPdf.setFontSize(11);
    docPdf.text(label(snapshot, "التكاليف حسب التصنيف", "Costs by Category"), margin, y);
    y += 7;
    docPdf.setFontSize(9);
    snapshot.reportCostsByCategory.forEach((item) => {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(`${item.label}: ${money(item.total, snapshot.currency)}`, margin, y);
      y += 6;
    });
  }

  const cashierRows = Object.entries(snapshot.reportCashierTotals).sort((a, b) => b[1] - a[1]);
  if (cashierRows.length > 0) {
    y += 4;
    y = ensurePageSpace(docPdf, y, 20);
    docPdf.setFontSize(11);
    docPdf.text(label(snapshot, "أداء الكاشير", "Cashier Performance"), margin, y);
    y += 7;
    docPdf.setFontSize(9);
    cashierRows.slice(0, 12).forEach(([name, total]) => {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(`${name}: ${money(total, snapshot.currency)}`, margin, y);
      y += 6;
    });
  }

  if (snapshot.topSellingMedicines.length > 0) {
    y += 4;
    y = ensurePageSpace(docPdf, y, 24);
    docPdf.setFontSize(11);
    docPdf.text(label(snapshot, "أكثر الأدوية مبيعًا", "Top Selling Medicines"), margin, y);
    y += 8;
    docPdf.setFontSize(9);
    docPdf.text(label(snapshot, "الصنف", "Item"), margin, y);
    docPdf.text(label(snapshot, "الكمية", "Qty"), margin + 95, y);
    docPdf.text(label(snapshot, "الإجمالي", "Total"), margin + 125, y);
    y += 6;
    snapshot.topSellingMedicines.forEach((item) => {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(snapshot.isArabic ? item.name_ar : item.name_en, margin, y);
      docPdf.text(String(item.quantity), margin + 95, y);
      docPdf.text(money(item.total, snapshot.currency), margin + 125, y);
      y += 6;
    });
  }

  if (snapshot.branchReportRows.length > 1) {
    y += 4;
    y = ensurePageSpace(docPdf, y, 24);
    docPdf.setFontSize(11);
    docPdf.text(label(snapshot, "مقارنة الفروع", "Branch Comparison"), margin, y);
    y += 8;
    docPdf.setFontSize(8);
    const cols = [
      margin,
      margin + 42,
      margin + 62,
      margin + 82,
      margin + 102,
      margin + 122,
      margin + 142,
    ];
    docPdf.text(label(snapshot, "الفرع", "Branch"), cols[0], y);
    docPdf.text(label(snapshot, "فواتير", "Inv."), cols[1], y);
    docPdf.text(label(snapshot, "مبيعات", "Sales"), cols[2], y);
    docPdf.text(label(snapshot, "ربح", "Profit"), cols[3], y);
    docPdf.text(label(snapshot, "صافي", "Net"), cols[6], y);
    y += 6;
    snapshot.branchReportRows.forEach((row) => {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(row.branchLabel.slice(0, 18), cols[0], y);
      docPdf.text(String(row.invoiceCount), cols[1], y);
      docPdf.text(Number(row.salesTotal).toFixed(0), cols[2], y);
      docPdf.text(Number(row.profitTotal).toFixed(0), cols[3], y);
      docPdf.text(Number(row.netProfitAfterCosts).toFixed(0), cols[6], y);
      y += 6;
    });
  }

  if (snapshot.medicines.length > 0) {
    docPdf.addPage();
    y = 15;
    setupArabicPdfFont(docPdf, snapshot.isArabic);
    docPdf.setFontSize(11);
    docPdf.text(label(snapshot, "المخزون الحالي", "Current Inventory"), margin, y);
    y += 8;
    docPdf.setFontSize(8);
    docPdf.text(label(snapshot, "الصنف", "Item"), margin, y);
    docPdf.text(label(snapshot, "كمية", "Qty"), margin + 95, y);
    docPdf.text(label(snapshot, "بيع", "Sell"), margin + 115, y);
    docPdf.text(label(snapshot, "صلاحية", "Expiry"), margin + 140, y);
    y += 6;
    snapshot.medicines.slice(0, 80).forEach((medicine) => {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(
        (snapshot.isArabic ? medicine.name_ar : medicine.name_en).slice(0, 42),
        margin,
        y,
      );
      docPdf.text(String(medicine.qty), margin + 95, y);
      docPdf.text(Number(medicine.price || 0).toFixed(2), margin + 115, y);
      docPdf.text(String(medicine.expiry || "-").slice(0, 10), margin + 140, y);
      y += 5;
    });
    if (snapshot.medicines.length > 80) {
      y = ensurePageSpace(docPdf, y);
      docPdf.text(
        label(snapshot, "… والمزيد في ملف Excel", "… more rows in Excel export"),
        margin,
        y,
      );
    }
  }

  y = ensurePageSpace(docPdf, y, 16);
  docPdf.setFontSize(9);
  docPdf.text(snapshot.invoiceFooter || snapshot.pharmacyName, pageWidth / 2, y, {
    align: "center",
  });

  docPdf.save(`financial-report-${snapshot.reportFrom}_${snapshot.reportTo}.pdf`);
}
