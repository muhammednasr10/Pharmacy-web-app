import type {
  CustomerPayment,
  Invoice,
  Medicine,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
} from "../types";
import { barcodeCSV, downloadCSV } from "./csvExport";
import { formatDateInput } from "./date";

function safeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function label(isArabic: boolean, ar: string, en: string) {
  return isArabic ? ar : en;
}

export type PharmacyBackupExportInput = {
  isArabic: boolean;
  pharmacySettings: PharmacySettings | null;
  medicines: Medicine[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  purchases: PurchaseRecord[];
  customerPayments: CustomerPayment[];
  getPaymentLabel: (method: string) => string;
};

export function downloadPharmacyBackupCsv(input: PharmacyBackupExportInput) {
  const {
    isArabic,
    pharmacySettings,
    medicines,
    invoices,
    returns,
    purchases,
    customerPayments,
    getPaymentLabel,
  } = input;

  const rows = [
    [label(isArabic, "نسخة احتياطية", "Backup")],
    [label(isArabic, "الصيدلية", "Pharmacy"), pharmacySettings?.name || "-"],
    [
      label(isArabic, "خطة الاشتراك", "Subscription Plan"),
      pharmacySettings?.subscriptionPlan || "-",
    ],
    [
      label(isArabic, "تاريخ انتهاء الاشتراك", "Subscription End Date"),
      pharmacySettings?.subscriptionEndDate || "-",
    ],
    [label(isArabic, "تاريخ التصدير", "Export Date"), new Date().toLocaleString()],
    [],
    [label(isArabic, "المخزون", "Inventory")],
    [
      label(isArabic, "اسم عربي", "Arabic Name"),
      label(isArabic, "اسم إنجليزي", "English Name"),
      label(isArabic, "باركود", "Barcode"),
      label(isArabic, "كمية", "Qty"),
      label(isArabic, "سعر شراء", "Buy Price"),
      label(isArabic, "سعر بيع", "Sell Price"),
      label(isArabic, "صلاحية", "Expiry"),
    ],
    ...medicines.map((medicine) => [
      medicine.name_ar,
      medicine.name_en,
      barcodeCSV(medicine.barcode),
      medicine.qty,
      safeNumber(medicine.buyPrice).toFixed(2),
      safeNumber(medicine.price).toFixed(2),
      medicine.expiry,
    ]),
    [],
    [label(isArabic, "الفواتير", "Invoices")],
    [
      label(isArabic, "رقم الفاتورة", "Invoice No."),
      label(isArabic, "التاريخ", "Date"),
      label(isArabic, "طريقة الدفع", "Payment"),
      label(isArabic, "العميل", "Customer"),
      label(isArabic, "الكاشير", "Cashier"),
      label(isArabic, "الإجمالي", "Total"),
      label(isArabic, "الربح", "Profit"),
    ],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      getPaymentLabel(invoice.paymentMethod || "cash"),
      invoice.customerName || "-",
      invoice.cashierName || "-",
      safeNumber(invoice.total).toFixed(2),
      safeNumber(invoice.totalProfit).toFixed(2),
    ]),
    [],
    [label(isArabic, "المرتجعات", "Returns")],
    [
      label(isArabic, "رقم المرتجع", "Return No."),
      label(isArabic, "رقم الفاتورة", "Invoice No."),
      label(isArabic, "الإجمالي", "Total"),
      label(isArabic, "المستخدم", "User"),
      label(isArabic, "التاريخ", "Date"),
    ],
    ...returns.map((item) => [
      item.returnNumber,
      item.invoiceNumber,
      safeNumber(item.total).toFixed(2),
      item.userName || "-",
      item.date || "-",
    ]),
    [],
    [label(isArabic, "المشتريات", "Purchases")],
    [
      label(isArabic, "رقم التوريد", "Purchase No."),
      label(isArabic, "الصنف", "Item"),
      label(isArabic, "باركود", "Barcode"),
      label(isArabic, "كمية", "Qty"),
      label(isArabic, "تكلفة", "Cost"),
      label(isArabic, "مورد", "Supplier"),
      label(isArabic, "التاريخ", "Date"),
    ],
    ...purchases.map((purchase) => [
      purchase.purchaseNumber,
      isArabic ? purchase.medicineName_ar : purchase.medicineName_en,
      barcodeCSV(purchase.barcode),
      purchase.quantity,
      safeNumber(purchase.totalCost).toFixed(2),
      purchase.supplierName || "-",
      purchase.date || "-",
    ]),
    [],
    [label(isArabic, "تحصيلات العملاء", "Customer Payments")],
    [
      label(isArabic, "رقم التحصيل", "Payment No."),
      label(isArabic, "العميل", "Customer"),
      label(isArabic, "المبلغ", "Amount"),
      label(isArabic, "طريقة الدفع", "Payment Method"),
      label(isArabic, "المستخدم", "User"),
      label(isArabic, "التاريخ", "Date"),
    ],
    ...customerPayments.map((payment) => [
      payment.paymentNumber,
      payment.customerName,
      safeNumber(payment.amount).toFixed(2),
      getPaymentLabel(payment.paymentMethod),
      payment.userName || "-",
      payment.date || "-",
    ]),
  ];

  downloadCSV(`pharmacy-backup-${formatDateInput(new Date())}.csv`, rows);
}

export type InventoryExportInput = {
  isArabic: boolean;
  medicines: Medicine[];
  includeCostProfit?: boolean;
};

export function downloadInventoryCsv(input: InventoryExportInput) {
  const { isArabic, medicines, includeCostProfit = false } = input;
  const header = [
    label(isArabic, "اسم الدواء عربي", "Arabic Name"),
    label(isArabic, "اسم الدواء إنجليزي", "English Name"),
    label(isArabic, "الباركود", "Barcode"),
    label(isArabic, "الكمية", "Qty"),
  ];
  if (includeCostProfit) {
    header.push(
      label(isArabic, "سعر الشراء", "Buy Price"),
      label(isArabic, "سعر البيع", "Sell Price"),
      label(isArabic, "ربح الوحدة", "Unit Profit"),
    );
  } else {
    header.push(label(isArabic, "سعر البيع", "Sell Price"));
  }
  header.push(label(isArabic, "الصلاحية", "Expiry"));

  const rows = [
    header,
    ...medicines.map((medicine) => {
      const row = [
        medicine.name_ar,
        medicine.name_en,
        barcodeCSV(medicine.barcode),
        medicine.qty,
      ];
      if (includeCostProfit) {
        row.push(
          safeNumber(medicine.buyPrice).toFixed(2),
          safeNumber(medicine.price).toFixed(2),
          (safeNumber(medicine.price) - safeNumber(medicine.buyPrice)).toFixed(2),
        );
      } else {
        row.push(safeNumber(medicine.price).toFixed(2));
      }
      row.push(medicine.expiry);
      return row;
    }),
  ];

  downloadCSV(`inventory-${formatDateInput(new Date())}.csv`, rows);
}

export type InvoicesExportInput = {
  isArabic: boolean;
  invoices: Invoice[];
  getPaymentLabel: (method: string) => string;
};

export function downloadInvoicesCsv(input: InvoicesExportInput) {
  const { isArabic, invoices, getPaymentLabel } = input;
  const rows = [
    [
      label(isArabic, "رقم الفاتورة", "Invoice No."),
      label(isArabic, "التاريخ", "Date"),
      label(isArabic, "طريقة الدفع", "Payment Method"),
      label(isArabic, "العميل", "Customer"),
      label(isArabic, "الكاشير", "Cashier"),
      label(isArabic, "عدد الأصناف", "Items Count"),
      label(isArabic, "قبل الخصم", "Subtotal"),
      label(isArabic, "الخصم", "Discount"),
      label(isArabic, "الإجمالي", "Total"),
      label(isArabic, "التكلفة", "Cost"),
      label(isArabic, "صافي الربح", "Net Profit"),
    ],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber || `#${invoice.id}`,
      invoice.date || "-",
      getPaymentLabel(invoice.paymentMethod || "cash"),
      invoice.customerName || "-",
      invoice.cashierName || "-",
      Array.isArray(invoice.items) ? invoice.items.length : 0,
      safeNumber(invoice.subtotal || invoice.total).toFixed(2),
      safeNumber(invoice.discount).toFixed(2),
      safeNumber(invoice.total).toFixed(2),
      safeNumber(invoice.totalCost).toFixed(2),
      safeNumber(invoice.totalProfit).toFixed(2),
    ]),
  ];

  downloadCSV(`invoices-${formatDateInput(new Date())}.csv`, rows);
}

export type ReturnsExportInput = {
  isArabic: boolean;
  returns: ReturnRecord[];
  isViewingAllBranches: boolean;
  resolveBranchLabel: (branchId: string | undefined) => string;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  getReturnItemsSummary: (record: ReturnRecord) => string;
};

export function downloadReturnsCsv(input: ReturnsExportInput) {
  const {
    isArabic,
    returns,
    isViewingAllBranches,
    resolveBranchLabel,
    getReturnTypeLabel,
    getRefundMethodLabel,
    getReturnItemsSummary,
  } = input;

  const rows = [
    [
      ...(isViewingAllBranches ? [label(isArabic, "الفرع", "Branch")] : []),
      label(isArabic, "نوع المرتجع", "Return Type"),
      label(isArabic, "رقم المرتجع", "Return No."),
      label(isArabic, "الفاتورة الأصلية", "Original Invoice"),
      label(isArabic, "التاريخ", "Date"),
      label(isArabic, "الموظف", "Employee"),
      label(isArabic, "طريقة الاسترداد", "Refund Method"),
      label(isArabic, "الأصناف", "Items Summary"),
      label(isArabic, "المبلغ المسترد", "Refunded Amount"),
      label(isArabic, "السبب", "Reason"),
    ],
    ...returns.map((record) => [
      ...(isViewingAllBranches ? [resolveBranchLabel(record.pharmacyId)] : []),
      getReturnTypeLabel(record),
      record.returnNumber,
      record.invoiceNumber,
      record.date || "-",
      record.userName || "-",
      getRefundMethodLabel(record),
      getReturnItemsSummary(record),
      safeNumber(record.total).toFixed(2),
      record.reason || "-",
    ]),
  ];

  downloadCSV(`returns-${formatDateInput(new Date())}.csv`, rows);
}
