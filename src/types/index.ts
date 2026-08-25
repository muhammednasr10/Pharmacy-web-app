export type Lang = "ar" | "en";

export type BuiltinUserRole =
  | "super_admin"
  | "pharmacy_admin"
  | "branch_manager"
  | "cashier"
  | "inventory"
  | "accountant";

/** Built-in roles plus pharmacy-defined keys like custom_pharmacist */
export type UserRole = BuiltinUserRole | (string & {});

export type AppUser = {
  uid: string;
  employeeId?: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemUser = AppUser;

export type WorkBreak = {
  start: string;
  end: string;
};

export type ShiftId = "A" | "B" | "C";

export type PharmacyShift = {
  id: ShiftId;
  label: string;
  labelAr: string;
  dayStart: string;
  dayEnd: string;
  breaks: WorkBreak[];
  allowedLateMinutes: number;
};

export type Employee = {
  id: string;
  pharmacyId: string;
  employeeCode?: string;
  photoBase64?: string;
  name: string;
  phone?: string;
  jobTitle?: string;
  salary: number;
  commissionRate: number;
  requiredWorkHours: number;
  useCustomWorkSchedule?: boolean;
  assignedShiftId?: ShiftId;
  workDayStart?: string;
  workDayEnd?: string;
  workBreaks?: WorkBreak[];
  hireDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ReportsTab = "financial" | "investment";

export type Page =
  | "dashboard"
  | "inventory"
  | "pos"
  | "invoices"
  | "returns"
  | "purchases"
  | "costs"
  | "customers"
  | "reports"
  | "stockMovements"
  | "activityLogs"
  | "users"
  | "tenants"
  | "sqlMigrations"
  | "branches"
  | "settings"
  | "userGuide"
  | "hr"
  | "employeePortal";

export type PaymentMethod = "cash" | "visa" | "wallet" | "credit";

export type Medicine = {
  id: number;
  name_ar: string;
  name_en: string;
  activeIngredient?: string;
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
  organizationId?: string;
  maxBranches?: number;
  maxUsers?: number;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  currency?: string;
  isActive?: boolean;
  invoiceFooter?: string;
  subscriptionPlan?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  subscriptionEndDate?: string;
  logoBase64?: string;
  lowStockThreshold?: number;
  expiringSoonDays?: number;
  expiryNotifyEnabled?: boolean;
  expiryNotifyPhone?: string;
  expiryNotifyEmail?: string;
  payrollPayDay?: number;
  payrollSickDeductionPercent?: number;
  payrollAbsentDeductionPercent?: number;
  payrollMaxLeaveDays?: number;
  payrollStandardWorkHours?: number;
  payrollOvertimePercent?: number;
  payrollDefaultTaxes?: number;
  payrollDefaultInsurance?: number;
  payrollWorkDayStart?: string;
  payrollWorkDayEnd?: string;
  payrollWorkBreaks?: WorkBreak[];
  workShifts?: PharmacyShift[];
  defaultShiftId?: ShiftId;
  createdAt?: string;
  updatedAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusM?: number;
};

export type NewMedicineForm = Omit<Medicine, "id">;

export type CartItem = Medicine & {
  cartQty: number;
};

export type InvoiceItem = {
  id?: number | string;
  invoiceId?: number | string;
  medicineId: number | string;
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
  shiftId?: ShiftId;
  cashierShiftId?: number;
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

export type CustomerSegment = "regular" | "vip" | "chronic" | "wholesale";

export type CrmCustomer = {
  id: number;
  pharmacyId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: string;
  gender?: "" | "male" | "female";
  segment: CustomerSegment;
  tags: string[];
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerActivityType = "note" | "call" | "follow_up" | "visit" | "whatsapp";

export type CustomerActivityStatus = "open" | "done" | "cancelled";

export type CustomerActivity = {
  id: number;
  pharmacyId?: string;
  customerId?: number;
  customerName?: string;
  activityType: CustomerActivityType;
  title?: string;
  body?: string;
  dueDate?: string;
  status: CustomerActivityStatus;
  createdByUid?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmCustomerProfile = CrmCustomer & {
  source: "registered" | "inferred";
  totalPurchases: number;
  purchaseCount: number;
  lastPurchaseDate?: string;
  averageOrderValue: number;
  totalDebt: number;
  paidAmount: number;
  remainingDebt: number;
  creditInvoicesCount: number;
  paymentsCount: number;
  openFollowUps: number;
};

export type PharmacyCost = {
  id: number;
  costNumber: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  notes?: string;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  date?: string;
  createdAt?: string;
};

export type PharmacyCostPlan = {
  id: number;
  pharmacyId?: string;
  planMonth: string;
  category: string;
  title: string;
  plannedAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type CashierShiftStatus = "open" | "closed";

export type CashierShift = {
  id: number;
  shiftNumber: string;
  pharmacyId: string;
  cashierId: string;
  cashierName?: string;
  workShiftId?: string;
  status: CashierShiftStatus;
  openingCash: number;
  expectedCash?: number;
  actualCash?: number;
  cashVariance?: number;
  totalSales: number;
  cashSales: number;
  visaSales: number;
  walletSales: number;
  creditSales: number;
  returnsTotal: number;
  customerPaymentsCash: number;
  customerPaymentsOther: number;
  invoiceCount: number;
  notes?: string;
  openedAt: string;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CashierShiftSummary = {
  totalSales: number;
  cashSales: number;
  visaSales: number;
  walletSales: number;
  creditSales: number;
  returnsTotal: number;
  customerPaymentsCash: number;
  customerPaymentsOther: number;
  invoiceCount: number;
  expectedCash: number;
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
  transferNumber?: string;
  supplierName?: string;
  notes?: string;
  pharmacyId?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
};

export type BranchStockTransferStatus = "pending" | "completed" | "rejected";

export type BranchStockTransfer = {
  id: string;
  organizationId?: string;
  transferNumber: string;
  fromPharmacyId: string;
  toPharmacyId: string;
  medicineId: number;
  targetMedicineId?: number;
  barcode?: string;
  medicineName_ar?: string;
  medicineName_en?: string;
  quantity: number;
  status?: BranchStockTransferStatus;
  notes?: string;
  userId?: string;
  userName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
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

export type LoginAccountRequest = {
  id: number;
  requestNumber: string;
  pharmacyId: string;
  pharmacyName?: string;
  employeeId?: string;
  employeeName?: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
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

export type PharmacyLoginAccountStatus = "pending" | "approved" | "rejected";

export type RolePermissionFlags = Partial<
  Record<
    | "delete_medicines"
    | "delete_returns"
    | "delete_purchases"
    | "delete_customer_payments"
    | "manage_users"
    | "edit_org_settings"
    | "edit_branch_settings"
    | "view_org_activity_logs"
    | "export_backup"
    | "manage_org_branches"
    | "review_branch_transfers"
    | "view_inventory_cost_profit"
    | "view_pos_cost_profit",
    boolean
  >
>;

export type PharmacyCustomRole = {
  id: string;
  pharmacyId: string;
  roleKey: string;
  nameAr: string;
  nameEn: string;
  baseRole: BuiltinUserRole;
  allowedPages: Page[];
  permissions?: RolePermissionFlags;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PharmacyRoleConfig = {
  id: string;
  pharmacyId: string;
  roleKey: string;
  allowedPages: Page[];
  permissions: RolePermissionFlags;
  labelAr?: string;
  labelEn?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PharmacyLoginAccount = {
  id: string;
  pharmacyId: string;
  email: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
  isActive: boolean;
  status: PharmacyLoginAccountStatus;
  requestedBy?: string;
  requestedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  editPending?: boolean;
  pendingEmail?: string;
  pendingPassword?: string;
  pendingRole?: UserRole;
  editRequestedBy?: string;
  editRequestedByName?: string;
  editRequestedAt?: string;
  linkRequestPending?: boolean;
  linkRequestedBy?: string;
  linkRequestedByName?: string;
  linkRequestedAt?: string;
};

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

/** Public «new pharmacy» signup waiting for Super Admin approval. */
export type PharmacySignupRequest = {
  id: string;
  requestNumber: string;
  pharmacyName: string;
  adminName: string;
  email: string;
  phone?: string;
  address?: string;
  status: SubscriptionRequestStatus;
  pharmacyId?: string;
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
  currency?: string;
  organizationId?: string;
  maxBranches?: number;
  maxUsers?: number;
  subscriptionTier?: string;
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

export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "sick";

export type EmployeeProfile = {
  id: number;
  pharmacyId?: string;
  userId: string;
  userName: string;
  baseSalary: number;
  createdAt?: string;
  updatedAt?: string;
};

export type EarlyLeaveOutcome = "permission" | "deduction";

export type AttendanceRecord = {
  id: number;
  pharmacyId?: string;
  userId: string;
  userName: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  shiftId?: ShiftId;
  earlyLeaveOutcome?: EarlyLeaveOutcome;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkInDistanceM?: number | null;
  checkOutDistanceM?: number | null;
};

export type PayrollRecord = {
  id: number;
  pharmacyId?: string;
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  sickDays?: number;
  leaveDays?: number;
  workMinutes?: number;
  baseSalary: number;
  calculatedSalary: number;
  specialAllowances?: number;
  bonuses: number;
  incentives?: number;
  commission?: number;
  deductions: number;
  taxes?: number;
  insurance?: number;
  netPay: number;
  status: "draft" | "approved" | "paid";
  notes?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PayrollAdditionField = "specialAllowances" | "bonuses" | "incentives" | "commission";

export type PayrollEditableField = PayrollAdditionField | "deductions" | "taxes" | "insurance";

export type EmployeeRequestType = "leave" | "permission";

export type EmployeeRequestStatus = "pending" | "approved" | "rejected";

export type EmployeeRequest = {
  id: number;
  pharmacyId?: string;
  requestNumber: string;
  employeeId: string;
  userId?: string;
  employeeName: string;
  requestType: EmployeeRequestType;
  workDate: string;
  endDate?: string;
  requestedTime?: string;
  reason?: string;
  status: EmployeeRequestStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
