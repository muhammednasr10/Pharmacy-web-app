export type Lang = "ar" | "en";
export type AppUser = {
  name: string;
  email: string;
  role: "admin" | "cashier" | "inventory" | "manager";
  pharmacyId: string;
  isActive: boolean;
};

export type SystemUser = AppUser & {
  uid: string;
};

export type Page =
  | "dashboard"
  | "inventory"
  | "pos"
  | "invoices"
  | "returns"
  | "purchases"
  | "customers"
  | "reports"
  | "stockMovements"
  | "activityLogs"
  | "users"
  | "settings";

export type PaymentMethod = "cash" | "visa" | "wallet" | "credit";

export type Medicine = {
  id: number;
  name_ar: string;
  name_en: string;
  barcode: string;
  buyPrice: number;
  qty: number;
  price: number;
  expiry: string;
};

export type PharmacySettings = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency: string;
  isActive: boolean;
  invoiceFooter: string;
  subscriptionPlan?: string;
  subscriptionEndDate?: string;
  logoBase64?: string;
};

export type NewMedicineForm = Omit<Medicine, "id">;

export type CartItem = Medicine & {
  cartQty: number;
};

export type InvoiceItem = {
  invoiceId: number;
  medicineId: number;
  name_ar: string;
  name_en: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  unitPrice: number;
  lineTotal: number;
  costTotal: number;
  profit: number;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost?: number;
  totalProfit?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
};

export type CustomerDebt = {
  customerName: string;
  totalDebt: number;
  paidAmount?: number;
  remainingDebt?: number;
  invoicesCount: number;
  lastInvoiceDate: string;
  invoices: Invoice[];
};

export type CustomerPayment = {
  id: number;
  paymentNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  pharmacyId: string;
  userId: string;
  userName: string;
  date: string;
  createdAt: string;
};

export type ReturnItem = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  buyPrice?: number;
  costTotal?: number;
  profit?: number;
};

export type ReturnRecord = {
  id: number;
  returnNumber: string;
  invoiceNumber: string;
  originalInvoiceId: number;
  pharmacyId: string;
  userId: string;
  userName: string;
  date: string;
  createdAt: string;
  items: ReturnItem[];
  total: number;
};

export type PurchaseRecord = {
  id: number;
  purchaseNumber: string;
  medicineId: number;
  medicineName_ar: string;
  medicineName_en: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  totalCost: number;
  supplierName: string;
  notes: string;
  pharmacyId: string;
  userId: string;
  userName: string;
  date: string;
  createdAt: string;
};

export type StockMovement = {
  type: string;
  medicineId: number;
  medicineName_ar: string;
  medicineName_en: string;
  barcode: string;
  quantityChange: number;
  qtyBefore: number;
  qtyAfter: number;
  invoiceNumber?: string;
  returnNumber?: string;
  purchaseNumber?: string;
  supplierName?: string;
  notes?: string;
  pharmacyId: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export type ActivityLog = {
  id: number;
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId: string;
  userId: string;
  userName: string;
  createdAt: string;
};
