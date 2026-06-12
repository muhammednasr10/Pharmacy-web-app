import { jsPDF } from "jspdf";
import { ARABIC_FONT_BASE64 } from "../arabicFont";
import { LOGO_BASE64 } from "../logoBase64";
import type { PayrollRecord } from "../types";
import { sumPayrollAdditions, sumPayrollDeductions } from "../services/pharmacyService";

export type PayrollExportSnapshot = {
  isArabic: boolean;
  currency: string;
  pharmacyName: string;
  periodStart: string;
  periodEnd: string;
  records: PayrollRecord[];
  totalNetPay: number;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string) => string;
};

function label(snapshot: PayrollExportSnapshot, ar: string, en: string) {
  return snapshot.isArabic ? ar : en;
}

function money(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

function formatWorkMinutes(minutes: number, isArabic: boolean) {
  if (!minutes) return "0";
  const hours = minutes / 60;
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return isArabic ? `${hoursText}h` : `${hoursText}h`;
}

function payrollStatusLabel(status: string, isArabic: boolean) {
  if (status === "approved") return isArabic ? "معتمد" : "Approved";
  if (status === "paid") return isArabic ? "مدفوع" : "Paid";
  return isArabic ? "مسودة" : "Draft";
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

function ensurePageSpace(docPdf: jsPDF, y: number, needed = 10) {
  const pageHeight = docPdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 12) {
    docPdf.addPage();
    return 14;
  }
  return y;
}

function truncateText(value: string, max = 22) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function addHeader(docPdf: jsPDF, snapshot: PayrollExportSnapshot) {
  setupArabicPdfFont(docPdf, snapshot.isArabic);
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const margin = 10;
  let y = 12;

  try {
    docPdf.addImage(LOGO_BASE64, "PNG", pageWidth / 2 - 8, y - 6, 16, 16);
    y += 12;
  } catch {
    /* logo optional */
  }

  docPdf.setFontSize(14);
  docPdf.text(snapshot.pharmacyName, pageWidth / 2, y, { align: "center" });
  y += 7;

  docPdf.setFontSize(11);
  docPdf.text(label(snapshot, "كشف المرتبات", "Payroll Statement"), pageWidth / 2, y, {
    align: "center",
  });
  y += 6;

  docPdf.setFontSize(9);
  docPdf.text(
    `${label(snapshot, "من", "From")}: ${snapshot.periodStart}  |  ${label(snapshot, "إلى", "To")}: ${snapshot.periodEnd}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );
  y += 5;
  docPdf.text(
    `${label(snapshot, "تاريخ التصدير", "Exported")}: ${new Date().toLocaleString(snapshot.isArabic ? "ar-EG" : "en-GB")}`,
    pageWidth / 2,
    y,
    { align: "center" },
  );

  return y + 8;
}

export function downloadPayrollPdf(snapshot: PayrollExportSnapshot) {
  const docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 8;
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const tableWidth = pageWidth - margin * 2;
  let y = addHeader(docPdf, snapshot);

  const showBranch = snapshot.showBranchColumn && !!snapshot.getBranchLabel;
  const headers = [
    label(snapshot, "الموظف", "Employee"),
    ...(showBranch ? [label(snapshot, "الفرع", "Branch")] : []),
    label(snapshot, "أيام", "Days"),
    label(snapshot, "ساعات", "Hours"),
    label(snapshot, "حضور", "Present"),
    label(snapshot, "غياب", "Absent"),
    label(snapshot, "مرضي", "Sick"),
    label(snapshot, "إجازة", "Leave"),
    label(snapshot, "الأساسي", "Base"),
    label(snapshot, "المستحق", "Earned"),
    label(snapshot, "زيادات", "Add."),
    label(snapshot, "خصومات", "Ded."),
    label(snapshot, "الصافي", "Net"),
    label(snapshot, "الحالة", "Status"),
  ];

  const colWeights = showBranch
    ? [16, 11, 5, 6, 5, 5, 5, 5, 8, 8, 7, 7, 8, 7]
    : [18, 6, 7, 6, 6, 6, 6, 9, 9, 8, 8, 9, 7];
  const colWidths = colWeights.map(
    (weight) => (tableWidth * weight) / colWeights.reduce((a, b) => a + b, 0),
  );
  const xPositions: number[] = [];
  let x = margin;
  colWidths.forEach((width) => {
    xPositions.push(x);
    x += width;
  });

  docPdf.setFontSize(7);
  docPdf.setDrawColor(200);
  docPdf.line(margin, y, pageWidth - margin, y);
  y += 4;
  headers.forEach((header, index) => {
    docPdf.text(header, xPositions[index] + 0.5, y);
  });
  y += 3;
  docPdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  snapshot.records.forEach((record) => {
    y = ensurePageSpace(docPdf, y, 6);
    const branchId = record.pharmacyId || "";
    const row = [
      truncateText(record.userName, showBranch ? 18 : 24),
      ...(showBranch ? [truncateText(snapshot.getBranchLabel!(branchId) || branchId, 14)] : []),
      String(record.workingDays ?? 0),
      formatWorkMinutes(record.workMinutes ?? 0, snapshot.isArabic),
      String(record.presentDays ?? 0),
      String(record.absentDays ?? 0),
      String(record.sickDays ?? 0),
      String(record.leaveDays ?? 0),
      money(record.baseSalary ?? 0, snapshot.currency),
      money(record.calculatedSalary ?? 0, snapshot.currency),
      money(sumPayrollAdditions(record), snapshot.currency),
      money(sumPayrollDeductions(record), snapshot.currency),
      money(record.netPay ?? 0, snapshot.currency),
      payrollStatusLabel(record.status || "draft", snapshot.isArabic),
    ];

    row.forEach((cell, index) => {
      docPdf.text(String(cell), xPositions[index] + 0.5, y);
    });
    y += 5;
  });

  y = ensurePageSpace(docPdf, y, 14);
  y += 4;
  docPdf.setDrawColor(120);
  docPdf.line(margin, y, pageWidth - margin, y);
  y += 6;
  docPdf.setFontSize(9);
  docPdf.text(
    `${label(snapshot, "عدد الموظفين", "Employees")}: ${snapshot.records.length}`,
    margin,
    y,
  );
  y += 5;
  docPdf.text(
    `${label(snapshot, "إجمالي الصافي", "Total net pay")}: ${money(snapshot.totalNetPay, snapshot.currency)}`,
    margin,
    y,
  );

  docPdf.save(`payroll-${snapshot.periodStart}_${snapshot.periodEnd}.pdf`);
}
