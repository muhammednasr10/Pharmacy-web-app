export type Lang = "ar" | "en";

export type UserRole =
  | "super_admin"
  | "admin"
  | "cashier"
  | "inventory"
  | "accountant";

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemUser = AppUser;

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
  | "tenants"
  | "branches"
  | "settings";

export type PaymentMethod = "cash" | "visa" | "wallet" | "credit";

export type Medicine = {
  id: number;
  name_ar: string;
  name_en: string;
  barcode: string;
  qty: number;
  price: number;
  expiry: string;
  buyPrice?: number;
  pharmacyId?: string;
  createdAt?: string;
};

export type PharmacySettings = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency?: string;
  isActive?: boolean;
  invoiceFooter?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  subscriptionEndDate?: string;
  logoBase64?: string;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type NewMedicineForm = Omit<Medicine, "id">;

export type CartItem = Medicine & {
  cartQty: number;
};

export type InvoiceItem = {
  id?: number;
  invoiceId?: number;
  medicineId: number;
  name_ar: string;
  name_en: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  buyPrice?: number;
  costTotal: number;
  profit?: number;
  pharmacyId?: string;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  cashierId?: string;
  cashierName?: string;
  pharmacyId?: string;
  totalCost?: number;
  totalProfit?: number;
  items: InvoiceItem[];
  paymentMethodLabel?: string;
  customerPhone?: string;
  status?: string;
  paid?: number;
  remaining?: number;
  createdBy?: string;
  updatedAt?: string;
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
  customerPhone?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  date?: string;
  createdAt?: string;
};

export type ReturnItem = {
  medicineId: number | string;
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
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  date?: string;
  createdAt?: string;
  items?: ReturnItem[];
  total?: number;
  reason?: string;
  refundMethod?: "cash" | "deduct_from_cart";
  isInstant?: boolean;
};

export type HeldInvoice = {
  id: string;
  pharmacyId: string;
  holdNumber: string;
  customerName?: string;
  customerPhone?: string;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: "held" | "resumed" | "deleted";
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InstantSaleReturnInput = {
  invoice: Invoice;
  items: Array<{
    medicineId: number;
    quantity: number;
    unitPrice: number;
    buyPrice?: number;
    name_ar: string;
    name_en: string;
    barcode: string;
  }>;
  reason: string;
  refundMethod: "cash" | "deduct_from_cart";
  userId?: string;
  userName?: string;
};

export type PurchaseRecord = {
  id: number;
  purchaseNumber: string;
  supplierName?: string;
  medicineId: number;
  medicineName_ar?: string;
  medicineName_en?: string;
  barcode?: string;
  quantity: number;
  buyPrice?: number;
  sellPrice?: number;
  totalCost?: number;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  date?: string;
  createdAt?: string;
  notes?: string;
};

export type StockMovement = {
  id?: number;
  type: string;
  medicineId: number;
  medicineName_ar?: string;
  medicineName_en?: string;
  barcode?: string;
  quantityChange: number;
  qtyBefore: number;
  qtyAfter: number;
  invoiceNumber?: string;
  returnNumber?: string;
  purchaseNumber?: string;
  supplierName?: string;
  notes?: string;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
};

export type ActivityLog = {
  id: number;
  type: string;
  title: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
};

export type SubscriptionRequestStatus = "pending" | "approved" | "rejected";

export type SubscriptionRequest = {
  id: number;
  requestNumber: string;
  pharmacyId: string;
  pharmacyName?: string;
  plan: string;
  days: number;
  amount: number;
  currency?: string;
  status: SubscriptionRequestStatus;
  requestedBy?: string;
  requestedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewedAt?: string;
};

export type CreatePharmacyInput = {
  id: string;
  name: string;
  name_en?: string;
  phone?: string;
  address?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
};

export type CreatePharmacyUserInput = {
  uid?: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  pharmacyId: string;
};
