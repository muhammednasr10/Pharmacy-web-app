import { createEphemeralSupabase, supabase } from "./supabaseClient";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isPharmacyManager,
  isSuperAdmin,
  normalizeAppUser,
  normalizeRole,
} from "../utils/roles";
import { ALL_BRANCHES_ID } from "../constants/branches";
import { notifySuperAdminOfSubscriptionRequest } from "../utils/superAdminNotify";
import {
  isActiveSubscriptionStatus,
  TRIAL_SUBSCRIPTION_DAYS,
} from "../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../config/subscriptionTiers";
import type {
  ActivityLog,
  AppUser,
  SubscriptionRequest,
  SubscriptionRequestStatus,
  LoginAccountRequest,
  PharmacyLoginAccount,
  CartItem,
  CreatePharmacyInput,
  CreatePharmacyUserInput,
  CustomerPayment,
  HeldInvoice,
  InstantSaleReturnInput,
  Invoice,
  InvoiceItem,
  Medicine,
  PharmacySettings,
  PharmacyCost,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  BranchStockTransfer,
  SystemUser,
  UserRole,
  EmployeeProfile,
  AttendanceRecord,
  AttendanceStatus,
  PayrollRecord,
  Employee,
  WorkBreak,
  ShiftId,
  PharmacyShift,
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
  CashierShift,
  CashierShiftSummary,
} from "../types";
import {
  WORK_SCHEDULE_DEFAULTS,
  DEFAULT_PHARMACY_SHIFTS,
  DEFAULT_ALLOWED_LATE_MINUTES,
  clonePharmacyShifts,
  computeWorkHoursFromSchedule,
  inferShiftIdFromTime,
  isCheckInLate,
  normalizeTimeValue,
  parsePharmacyShifts,
  parseWorkBreaks,
  resolveWorkSchedule,
  type WorkSchedule,
} from "../utils/workSchedule";
import { extractCopyableBranchSettings } from "../utils/copyBranchSettings";
import {
  computeCashierCommissionFromInvoices,
  currentMonthPeriodBounds,
} from "../utils/cashierCommission";

const camelKeyMap: Record<string, string> = {
  pharmacy_id: "pharmacyId",
  customer_name: "customerName",
  customer_phone: "customerPhone",
  created_at: "createdAt",
  updated_at: "updatedAt",
  invoice_number: "invoiceNumber",
  invoice_id: "invoiceId",
  payment_method: "paymentMethod",
  cashier_id: "cashierId",
  cashier_name: "cashierName",
  buy_price: "buyPrice",
  sell_price: "sellPrice",
  total_cost: "totalCost",
  total_profit: "totalProfit",
  quantity_change: "quantityChange",
  qty_before: "qtyBefore",
  qty_after: "qtyAfter",
  return_number: "returnNumber",
  purchase_number: "purchaseNumber",
  cost_number: "costNumber",
  original_invoice_id: "originalInvoiceId",
  user_id: "userId",
  user_name: "userName",
  reference_type: "referenceType",
  reference_id: "referenceId",
  is_active: "isActive",
  name_ar: "name_ar",
  name_en: "name_en",
  medicine_id: "medicineId",
  medicine_name_ar: "medicineName_ar",
  medicine_name_en: "medicineName_en",
  medicine_name: "name_ar",
  unit_price: "unitPrice",
  line_total: "lineTotal",
  cost_total: "costTotal",
  movement_type: "type",
  subscription_plan: "subscriptionPlan",
  subscription_status: "subscriptionStatus",
  subscription_started_at: "subscriptionStartedAt",
  subscription_ends_at: "subscriptionEndsAt",
  subscription_end_date: "subscriptionEndDate",
  hold_number: "holdNumber",
  cart_items: "cartItems",
  created_by: "createdBy",
  created_by_name: "createdByName",
  refund_method: "refundMethod",
  is_instant: "isInstant",
  low_stock_threshold: "lowStockThreshold",
  expiring_soon_days: "expiringSoonDays",
  expiry_notify_enabled: "expiryNotifyEnabled",
  expiry_notify_phone: "expiryNotifyPhone",
  expiry_notify_email: "expiryNotifyEmail",
  payroll_pay_day: "payrollPayDay",
  payroll_sick_deduction_percent: "payrollSickDeductionPercent",
  payroll_absent_deduction_percent: "payrollAbsentDeductionPercent",
  payroll_leave_deduction_percent: "payrollLeaveDeductionPercent",
  payroll_max_leave_days: "payrollMaxLeaveDays",
  payroll_standard_work_hours: "payrollStandardWorkHours",
  payroll_overtime_percent: "payrollOvertimePercent",
  payroll_work_day_start: "payrollWorkDayStart",
  payroll_work_day_end: "payrollWorkDayEnd",
  payroll_work_breaks: "payrollWorkBreaks",
  work_shifts: "workShifts",
  default_shift_id: "defaultShiftId",
  assigned_shift_id: "assignedShiftId",
  shift_id: "shiftId",
  cashier_shift_id: "cashierShiftId",
  shift_number: "shiftNumber",
  opening_cash: "openingCash",
  expected_cash: "expectedCash",
  actual_cash: "actualCash",
  cash_variance: "cashVariance",
  cash_sales: "cashSales",
  visa_sales: "visaSales",
  wallet_sales: "walletSales",
  credit_sales: "creditSales",
  returns_total: "returnsTotal",
  customer_payments_cash: "customerPaymentsCash",
  customer_payments_other: "customerPaymentsOther",
  invoice_count: "invoiceCount",
  opened_at: "openedAt",
  closed_at: "closedAt",
  closed_by_id: "closedById",
  closed_by_name: "closedByName",
  work_shift_id: "workShiftId",
  early_leave_outcome: "earlyLeaveOutcome",
  request_number: "requestNumber",
  pharmacy_name: "pharmacyName",
  requested_by: "requestedBy",
  requested_by_name: "requestedByName",
  reviewed_by: "reviewedBy",
  reviewed_by_name: "reviewedByName",
  review_note: "reviewNote",
  reviewed_at: "reviewedAt",
  employee_id: "employeeId",
  employee_code: "employeeCode",
  photo_base64: "photoBase64",
  required_work_hours: "requiredWorkHours",
  use_custom_work_schedule: "useCustomWorkSchedule",
  work_day_start: "workDayStart",
  work_day_end: "workDayEnd",
  work_breaks: "workBreaks",
  employee_name: "employeeName",
  job_title: "jobTitle",
  commission_rate: "commissionRate",
  hire_date: "hireDate",
  last_login_at: "lastLoginAt",
  request_type: "requestType",
  end_date: "endDate",
  requested_time: "requestedTime",
};

const snakeKeyMap: Record<string, string> = {
  buyPrice: "buy_price",
  sellPrice: "sell_price",
  totalCost: "total_cost",
  totalProfit: "total_profit",
  quantityChange: "quantity_change",
  qtyBefore: "qty_before",
  qtyAfter: "qty_after",
  invoiceNumber: "invoice_number",
  invoiceId: "invoice_id",
  paymentMethod: "payment_method",
  cashierId: "cashier_id",
  cashierName: "cashier_name",
  customerName: "customer_name",
  customerPhone: "customer_phone",
  pharmacyId: "pharmacy_id",
  returnNumber: "return_number",
  purchaseNumber: "purchase_number",
  originalInvoiceId: "original_invoice_id",
  userId: "user_id",
  userName: "user_name",
  referenceType: "reference_type",
  referenceId: "reference_id",
  paymentNumber: "payment_number",
  createdAt: "created_at",
  updatedAt: "updated_at",
  isActive: "is_active",
  medicineName_ar: "medicine_name_ar",
  medicineName_en: "medicine_name_en",
  subscriptionPlan: "subscription_plan",
  subscriptionStatus: "subscription_status",
  subscriptionStartedAt: "subscription_started_at",
  subscriptionEndsAt: "subscription_ends_at",
  subscriptionEndDate: "subscription_end_date",
  holdNumber: "hold_number",
  cartItems: "cart_items",
  createdBy: "created_by",
  createdByName: "created_by_name",
  refundMethod: "refund_method",
  isInstant: "is_instant",
  lowStockThreshold: "low_stock_threshold",
  expiringSoonDays: "expiring_soon_days",
  expiryNotifyEnabled: "expiry_notify_enabled",
  expiryNotifyPhone: "expiry_notify_phone",
  expiryNotifyEmail: "expiry_notify_email",
  payrollPayDay: "payroll_pay_day",
  payrollSickDeductionPercent: "payroll_sick_deduction_percent",
  payrollAbsentDeductionPercent: "payroll_absent_deduction_percent",
  payrollLeaveDeductionPercent: "payroll_leave_deduction_percent",
  payrollMaxLeaveDays: "payroll_max_leave_days",
  payrollStandardWorkHours: "payroll_standard_work_hours",
  payrollOvertimePercent: "payroll_overtime_percent",
  payrollWorkDayStart: "payroll_work_day_start",
  payrollWorkDayEnd: "payroll_work_day_end",
  payrollWorkBreaks: "payroll_work_breaks",
  workShifts: "work_shifts",
  defaultShiftId: "default_shift_id",
  assignedShiftId: "assigned_shift_id",
  shiftId: "shift_id",
  earlyLeaveOutcome: "early_leave_outcome",
  useCustomWorkSchedule: "use_custom_work_schedule",
  workDayStart: "work_day_start",
  workDayEnd: "work_day_end",
  workBreaks: "work_breaks",
  requestNumber: "request_number",
  pharmacyName: "pharmacy_name",
  requestedBy: "requested_by",
  requestedByName: "requested_by_name",
  reviewedBy: "reviewed_by",
  reviewedByName: "reviewed_by_name",
  reviewNote: "review_note",
  reviewedAt: "reviewed_at",
  employeeId: "employee_id",
  employeeCode: "employee_code",
  photoBase64: "photo_base64",
  requiredWorkHours: "required_work_hours",
  employeeName: "employee_name",
  jobTitle: "job_title",
  commissionRate: "commission_rate",
  hireDate: "hire_date",
  lastLoginAt: "last_login_at",
  requestType: "request_type",
  endDate: "end_date",
  requestedTime: "requested_time",
  baseSalary: "base_salary",
  workDate: "work_date",
  checkIn: "check_in",
  checkOut: "check_out",
  periodStart: "period_start",
  periodEnd: "period_end",
  workingDays: "working_days",
  presentDays: "present_days",
  absentDays: "absent_days",
  sickDays: "sick_days",
  leaveDays: "leave_days",
  workMinutes: "work_minutes",
  specialAllowances: "special_allowances",
  incentives: "incentives",
  commission: "commission",
  taxes: "taxes",
  insurance: "insurance",
  calculatedSalary: "calculated_salary",
  netPay: "net_pay",
  paidAt: "paid_at",
};

function toCamelCase<T>(row: Record<string, any>): T {
  if (!row || typeof row !== "object") return row as T;

  return Object.entries(row).reduce((acc, [key, value]) => {
    const camelKey = camelKeyMap[key] || key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    acc[camelKey] = value;
    return acc;
  }, {} as Record<string, any>) as T;
}

function toSnakeCase<T>(data: T): Record<string, any> {
  if (!data || typeof data !== "object") return data as unknown as Record<string, any>;

  return Object.entries(data as Record<string, any>).reduce((acc, [key, value]) => {
    const snakeKey = snakeKeyMap[key] || key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
    acc[snakeKey] = value;
    return acc;
  }, {} as Record<string, any>);
}

function prepareMedicinePayload(medicine: Partial<Medicine>): Record<string, any> {
  return stampPharmacy(
    toSnakeCase({
      id: medicine.id,
      name_ar: medicine.name_ar,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      qty: medicine.qty,
      price: medicine.price,
      buyPrice: medicine.buyPrice,
      expiry: medicine.expiry,
    } as Partial<Medicine>)
  );
}

function prepareInvoicePayload(invoice: Invoice): Record<string, any> {
  return toSnakeCase({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    total: invoice.total,
    paymentMethod: invoice.paymentMethod,
    customerName: invoice.customerName || "",
    cashierId: invoice.cashierId,
    cashierName: invoice.cashierName,
    pharmacyId: invoice.pharmacyId,
    totalCost: invoice.totalCost,
    totalProfit: invoice.totalProfit,
    createdAt: invoice.createdAt,
    shiftId: invoice.shiftId,
    cashierShiftId: invoice.cashierShiftId,
  } as Partial<Invoice>);
}

function prepareInvoiceItemPayload(
  item: InvoiceItem,
  invoiceId: number,
  lineIndex = 0
): Record<string, any> {
  const displayName = item.name_ar || item.name_en || "";
  const payload = toSnakeCase({
    id: item.id ?? Date.now() + lineIndex,
    invoiceId,
    medicineId: item.medicineId,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    buyPrice: item.buyPrice,
    costTotal: item.costTotal,
    profit: item.profit,
  } as Partial<InvoiceItem>);

  // دعم الجداول القديمة التي تستخدم medicine_name بدل name_ar/name_en
  payload.medicine_name = displayName;

  return payload;
}

// Active tenant scope for reads/writes. Super admin may set this to view a tenant.
let activePharmacyId: string | null = null;
let organizationBranchIds: string[] = [];
let currentAppUser: AppUser | null = null;

export function setActivePharmacy(pharmacyId: string | null) {
  activePharmacyId = pharmacyId;
}

export function getActivePharmacy() {
  return activePharmacyId;
}

export function setOrganizationBranchIds(branchIds: string[]) {
  organizationBranchIds = [...new Set(branchIds.filter(Boolean))];
}

export function getOrganizationBranchIds() {
  return organizationBranchIds;
}

export function setCurrentAppUser(user: AppUser | null) {
  currentAppUser = user ? normalizeAppUser(user) : null;
}

export function getCurrentAppUser() {
  return currentAppUser;
}

export { isSuperAdmin };

type PharmacyScopedQuery<T> = T & {
  eq: (col: string, val: string) => T;
  in?: (col: string, vals: string[]) => T;
};

function shouldQueryAllOrganizationBranches(appUser: AppUser | null): boolean {
  return (
    activePharmacyId === ALL_BRANCHES_ID &&
    organizationBranchIds.length > 0 &&
    (isOrgPharmacyAdmin(appUser) || isAccountant(appUser) || isSuperAdmin(appUser))
  );
}

function applyPharmacyScopeFilter<T extends PharmacyScopedQuery<T>>(
  query: T,
  pharmacyIds?: string[],
  appUser: AppUser | null = currentAppUser
): T {
  const ids = [...new Set((pharmacyIds || []).filter(Boolean))];
  if (ids.length > 0) {
    if (ids.length === 1) {
      return query.eq("pharmacy_id", ids[0]);
    }
    if (query.in) {
      return query.in("pharmacy_id", ids);
    }
  }
  return applyPharmacyFilter(query, appUser);
}

export function applyPharmacyFilter<T extends PharmacyScopedQuery<T>>(
  query: T,
  appUser: AppUser | null = currentAppUser
): T {
  if (isSuperAdmin(appUser)) {
    if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
      return query.eq("pharmacy_id", activePharmacyId);
    }
    return query;
  }

  if (shouldQueryAllOrganizationBranches(appUser)) {
    if (organizationBranchIds.length === 1) {
      return query.eq("pharmacy_id", organizationBranchIds[0]);
    }
    if (query.in) {
      return query.in("pharmacy_id", organizationBranchIds);
    }
  }

  const pharmacyId =
    activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID
      ? activePharmacyId
      : appUser?.pharmacyId;
  if (pharmacyId) {
    return query.eq("pharmacy_id", pharmacyId);
  }
  return query;
}

function resolveStampPharmacyId(): string {
  if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
    return activePharmacyId;
  }
  return currentAppUser?.pharmacyId || "main";
}

function resolveHeldInvoicesPharmacyId(pharmacyId?: string): string | null {
  if (pharmacyId) return pharmacyId;
  if (activePharmacyId) return activePharmacyId;
  if (currentAppUser?.pharmacyId) return currentAppUser.pharmacyId;
  return "main";
}

function stampPharmacy(payload: Record<string, any>): Record<string, any> {
  if (payload.pharmacy_id) {
    return { ...payload };
  }
  return { ...payload, pharmacy_id: resolveStampPharmacyId() };
}

function prepareMedicinePayloadForPharmacy(
  medicine: Partial<Medicine>,
  pharmacyId: string
): Record<string, any> {
  return {
    ...toSnakeCase({
      id: medicine.id,
      name_ar: medicine.name_ar,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      qty: medicine.qty,
      price: medicine.price,
      buyPrice: medicine.buyPrice,
      expiry: medicine.expiry,
    } as Partial<Medicine>),
    pharmacy_id: pharmacyId,
  };
}

async function getRows<T>(
  table: string,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown },
  pharmacyScoped = false
): Promise<T[]> {
  let query = supabase.from(table).select("*");

  if (pharmacyScoped) {
    query = applyPharmacyFilter(query);
  }

  if (filter) {
    query = query.eq(filter.column, filter.value as string);
  }

  if (limit) {
    query = query.limit(limit);
  }

  query = query.order(orderBy, { ascending: !desc });

  const { data, error } = await query;

  if (error) {
    console.error(`Supabase getRows ${table} error:`, error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<T>(row));
}

let realtimeChannelSeq = 0;

function subscribeTable<T>(
  table: string,
  callback: (rows: T[]) => void,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown },
  pharmacyScoped = false
) {
  const channelName = `realtime-${table}-${++realtimeChannelSeq}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => {
        void getRows<T>(table, orderBy, desc, limit, filter, pharmacyScoped).then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Resolve username or email to the Auth email address */
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  const { data, error } = await supabase.rpc("resolve_login_email", {
    login_identifier: trimmed,
  });

  if (error) {
    if (
      error.message.includes("resolve_login_email") &&
      (error.message.includes("does not exist") || error.code === "42883")
    ) {
      throw new Error("username_login_not_configured");
    }
    console.error("resolveLoginEmail error:", error.message);
    return null;
  }

  return typeof data === "string" && data ? data : null;
}

export async function signInWithUsernameOrEmail(identifier: string, password: string) {
  const email = await resolveLoginEmail(identifier);
  if (!email) {
    return { data: { user: null, session: null }, error: { message: "invalid_login_identifier" } as Error };
  }
  return signInWithPassword(email, password);
}

function getAuthRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export function getAuthProvider(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
}): string | undefined {
  const fromMeta = user.app_metadata?.provider;
  if (typeof fromMeta === "string") return fromMeta;
  return user.identities?.[0]?.provider;
}

export async function ensureGoogleAppUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<AppUser | null> {
  return getAppUserByUid(user.id);
}

export function signOutUser() {
  return supabase.auth.signOut();
}

export function getAuthSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getCurrentAppUserByUid(uid: string): Promise<AppUser | null> {
  return getAppUserByUid(uid);
}

export async function getAppUserByUid(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("getAppUserByUid called with empty uid");
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .maybeSingle();

  if (error) {
    console.error("getAppUserByUid error", {
      uid,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!data) {
    console.warn("getAppUserByUid returned no row", { uid });
    return null;
  }

  return normalizeAppUser(toCamelCase<AppUser>(data));
}

export async function getCurrentPharmacy(pharmacyId: string): Promise<PharmacySettings | null> {
  return getPharmacySettings(pharmacyId);
}

function isSubscriptionEndDatePassed(endDate?: string | null) {
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
}

export async function isPharmacyAccessAllowed(pharmacyId: string): Promise<boolean> {
  const pharmacy = await getPharmacySettings(pharmacyId);
  if (!pharmacy) return false;
  if (pharmacy.isActive === false) return false;
  if (!isActiveSubscriptionStatus(pharmacy.subscriptionStatus)) return false;
  if (isSubscriptionEndDatePassed(pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt)) {
    return false;
  }
  return true;
}

export type TrialProvisionResult = {
  pharmacyId: string;
  organizationId: string;
  subscriptionEndDate: string;
  trialDays: number;
};

export async function provisionTrialPharmacy(pharmacyName: string): Promise<TrialProvisionResult> {
  const name = pharmacyName.trim();
  if (name.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  const { data, error } = await supabase.rpc("provision_trial_pharmacy", {
    p_pharmacy_name: name,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data || {}) as Record<string, unknown>;
  return {
    pharmacyId: String(row.pharmacy_id || ""),
    organizationId: String(row.organization_id || ""),
    subscriptionEndDate: String(row.subscription_end_date || ""),
    trialDays: Number(row.trial_days) || TRIAL_SUBSCRIPTION_DAYS,
  };
}

export async function ensureTrialPharmacyFromAuth(authUser: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const meta = authUser.user_metadata || {};
  if (meta.signup_type !== "trial_pharmacy") return false;

  const pharmacyName = String(meta.pharmacy_name || "").trim();
  if (!pharmacyName) return false;

  const existing = await getAppUserByUid(authUser.id);
  if (existing?.pharmacyId && existing.pharmacyId !== "main") {
    return false;
  }

  await provisionTrialPharmacy(pharmacyName);
  return true;
}

export async function getPharmacySettings(pharmacyId: string): Promise<PharmacySettings | null> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error) {
    console.error("getPharmacySettings error:", error.message);
    return null;
  }

  return data ? toCamelCase<PharmacySettings>(data) : null;
}

export async function updatePharmacySettings(
  pharmacyId: string,
  updates: Partial<PharmacySettings>
) {
  const payload = toSnakeCase(updates);
  delete payload.id;

  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);

  if (error) {
    throw new Error(error.message);
  }
}

export const PAYROLL_DEFAULTS = {
  payDay: 30,
  sickDeductionPercent: 25,
  absentDeductionPercent: 100,
  maxLeaveDays: 2,
  standardWorkHours: 8,
  overtimePercent: 150,
  defaultTaxes: 0,
  defaultInsurance: 0,
  workDayStart: WORK_SCHEDULE_DEFAULTS.dayStart,
  workDayEnd: WORK_SCHEDULE_DEFAULTS.dayEnd,
  workBreaks: [] as WorkBreak[],
  workShifts: clonePharmacyShifts(DEFAULT_PHARMACY_SHIFTS),
  defaultShiftId: "A" as ShiftId,
} as const;

export type PayrollSettingsValues = {
  payDay: number;
  sickDeductionPercent: number;
  absentDeductionPercent: number;
  maxLeaveDays: number;
  standardWorkHours: number;
  overtimePercent: number;
  defaultTaxes: number;
  defaultInsurance: number;
  workDayStart: string;
  workDayEnd: string;
  workBreaks: WorkBreak[];
  workShifts: PharmacyShift[];
  defaultShiftId: ShiftId;
};

export function resolvePharmacyWorkSchedule(
  settings: Partial<PharmacySettings> | null | undefined
): WorkSchedule {
  const shifts = resolvePharmacyShifts(settings);
  const shiftA = shifts.find((item) => item.id === "A") || shifts[0];
  return {
    dayStart: shiftA.dayStart,
    dayEnd: shiftA.dayEnd,
    breaks: shiftA.breaks.map((item) => ({ ...item })),
  };
}

export function resolvePharmacyShifts(
  settings: Partial<PharmacySettings> | null | undefined
): PharmacyShift[] {
  const legacy = {
    dayStart: normalizeTimeValue(settings?.payrollWorkDayStart, WORK_SCHEDULE_DEFAULTS.dayStart),
    dayEnd: normalizeTimeValue(settings?.payrollWorkDayEnd, WORK_SCHEDULE_DEFAULTS.dayEnd),
    breaks: parseWorkBreaks(settings?.payrollWorkBreaks),
  };
  const hasStoredShifts = Array.isArray(settings?.workShifts) && settings!.workShifts!.length >= 3;
  const parsed = parsePharmacyShifts(
    hasStoredShifts ? settings?.workShifts : settings?.workShifts,
    legacy
  );
  return clonePharmacyShifts(parsed);
}

export async function resolveWorkShiftForUser(
  appUser: AppUser | null | undefined
): Promise<{ shiftId: ShiftId; schedule: WorkSchedule; shifts: PharmacyShift[] } | null> {
  if (!appUser?.pharmacyId) return null;

  const [settings, employees] = await Promise.all([
    loadPayrollSettings(appUser.pharmacyId),
    getEmployees(),
  ]);

  const employee =
    employees.find((item) => item.id === appUser.employeeId) ||
    (await resolveLinkedEmployeeForAppUser(appUser));

  if (employee) {
    const resolved = resolveWorkSchedule(employee, settings.workShifts, settings.defaultShiftId);
    return {
      shiftId: resolved.shiftId,
      schedule: {
        dayStart: resolved.dayStart,
        dayEnd: resolved.dayEnd,
        breaks: resolved.breaks,
      },
      shifts: settings.workShifts,
    };
  }

  const inferredId = inferShiftIdFromTime(new Date(), settings.workShifts);
  const inferredShift =
    settings.workShifts.find((item) => item.id === inferredId) || settings.workShifts[0];

  return {
    shiftId: inferredId,
    schedule: {
      dayStart: inferredShift.dayStart,
      dayEnd: inferredShift.dayEnd,
      breaks: inferredShift.breaks.map((item) => ({ ...item })),
    },
    shifts: settings.workShifts,
  };
}

export { resolveWorkSchedule, computeWorkHoursFromSchedule, isCheckInLate };

export function applyMaxLeavePolicy(
  rawLeaveDays: number,
  rawAbsentDays: number,
  maxLeaveDays: number
): { leaveDays: number; absentDays: number; excessLeaveDays: number } {
  const allowed = Math.max(0, Math.floor(Number(maxLeaveDays) || 0));
  const rawLeave = Math.max(0, Number(rawLeaveDays) || 0);
  const rawAbsent = Math.max(0, Number(rawAbsentDays) || 0);
  const leaveDays = Math.min(rawLeave, allowed);
  const excessLeaveDays = Math.max(0, rawLeave - allowed);
  return {
    leaveDays,
    absentDays: rawAbsent + excessLeaveDays,
    excessLeaveDays,
  };
}

export type AttendanceDeductionBreakdown = {
  dailyRate: number;
  absentDays: number;
  sickDays: number;
  leaveDays: number;
  absentAmount: number;
  sickAmount: number;
  leaveAmount: number;
  attendanceTotal: number;
};

export function computeAttendanceDeductionBreakdown(
  record: Partial<PayrollRecord>,
  rates: { absentPct: number; sickPct: number }
): AttendanceDeductionBreakdown {
  const baseSalary = Number(record.baseSalary ?? 0);
  const dailyRate = baseSalary / 30;
  const absentDays = Number(record.absentDays ?? 0);
  const sickDays = Number(record.sickDays ?? 0);
  const leaveDays = Number(record.leaveDays ?? 0);
  const absentAmount =
    Math.round(dailyRate * absentDays * (Number(rates.absentPct) / 100) * 100) / 100;
  const sickAmount =
    Math.round(dailyRate * sickDays * (Number(rates.sickPct) / 100) * 100) / 100;
  const leaveAmount = 0;
  const attendanceTotal =
    Math.round((absentAmount + sickAmount + leaveAmount) * 100) / 100;
  return {
    dailyRate,
    absentDays,
    sickDays,
    leaveDays,
    absentAmount,
    sickAmount,
    leaveAmount,
    attendanceTotal,
  };
}

export function computeTaxInsuranceFromPercent(
  record: Partial<PayrollRecord>,
  taxesPercent: number,
  insurancePercent: number
): { taxes: number; insurance: number } {
  const gross = Number(record.calculatedSalary ?? 0) + sumPayrollAdditions(record);
  const taxPct = Math.min(100, Math.max(0, Number(taxesPercent) || 0));
  const insPct = Math.min(100, Math.max(0, Number(insurancePercent) || 0));
  return {
    taxes: Math.round(gross * (taxPct / 100) * 100) / 100,
    insurance: Math.round(gross * (insPct / 100) * 100) / 100,
  };
}

export function sumPayrollDeductions(record: Partial<PayrollRecord>): number {
  return (
    Number(record.deductions ?? 0) +
    Number(record.taxes ?? 0) +
    Number(record.insurance ?? 0)
  );
}

function isLegacyPayrollDefaults(settings: Partial<PharmacySettings>) {
  return settings.payrollPayDay === 1 && Number(settings.payrollSickDeductionPercent ?? 0) === 0;
}

export function resolvePayrollSettings(
  settings: Partial<PharmacySettings> | null | undefined
): PayrollSettingsValues {
  const payDay = settings?.payrollPayDay;
  const sick = settings?.payrollSickDeductionPercent;
  const absent = settings?.payrollAbsentDeductionPercent;
  const maxLeave = settings?.payrollMaxLeaveDays;
  const standardHours = settings?.payrollStandardWorkHours;
  const overtime = settings?.payrollOvertimePercent;
  const taxes = settings?.payrollDefaultTaxes;
  const insurance = settings?.payrollDefaultInsurance;
  const workSchedule = resolvePharmacyWorkSchedule(settings);
  const workShifts = resolvePharmacyShifts(settings);
  const defaultShiftId = (settings?.defaultShiftId as ShiftId) || PAYROLL_DEFAULTS.defaultShiftId;

  if (
    payDay == null &&
    sick == null &&
    absent == null &&
    maxLeave == null &&
    standardHours == null &&
    overtime == null &&
    taxes == null &&
    insurance == null &&
    settings?.payrollWorkDayStart == null &&
    settings?.payrollWorkDayEnd == null &&
    settings?.payrollWorkBreaks == null &&
    settings?.workShifts == null
  ) {
    return {
      ...PAYROLL_DEFAULTS,
      workBreaks: [...PAYROLL_DEFAULTS.workBreaks],
      workShifts: clonePharmacyShifts(PAYROLL_DEFAULTS.workShifts),
    };
  }

  if (isLegacyPayrollDefaults(settings || {})) {
    return {
      ...PAYROLL_DEFAULTS,
      workBreaks: [...PAYROLL_DEFAULTS.workBreaks],
      workShifts: clonePharmacyShifts(PAYROLL_DEFAULTS.workShifts),
    };
  }

  return {
    payDay: Math.min(31, Math.max(1, Number(payDay ?? PAYROLL_DEFAULTS.payDay))),
    sickDeductionPercent: Math.min(
      100,
      Math.max(0, Number(sick ?? PAYROLL_DEFAULTS.sickDeductionPercent))
    ),
    absentDeductionPercent: Math.min(
      100,
      Math.max(0, Number(absent ?? PAYROLL_DEFAULTS.absentDeductionPercent))
    ),
    maxLeaveDays: Math.max(0, Math.floor(Number(maxLeave ?? PAYROLL_DEFAULTS.maxLeaveDays))),
    standardWorkHours: Math.max(0, Number(standardHours ?? PAYROLL_DEFAULTS.standardWorkHours)),
    overtimePercent: Math.max(0, Number(overtime ?? PAYROLL_DEFAULTS.overtimePercent)),
    defaultTaxes: Math.min(
      100,
      Math.max(0, Number(taxes ?? PAYROLL_DEFAULTS.defaultTaxes))
    ),
    defaultInsurance: Math.min(
      100,
      Math.max(0, Number(insurance ?? PAYROLL_DEFAULTS.defaultInsurance))
    ),
    workDayStart: workSchedule.dayStart,
    workDayEnd: workSchedule.dayEnd,
    workBreaks: workSchedule.breaks.map((item) => ({ ...item })),
    workShifts: clonePharmacyShifts(workShifts),
    defaultShiftId,
  };
}

export async function loadPayrollSettings(pharmacyId: string): Promise<PayrollSettingsValues> {
  const settings = await getPharmacySettings(pharmacyId);
  const resolved = resolvePayrollSettings(settings);

  const shouldPersist =
    settings &&
    (settings.payrollPayDay == null ||
      settings.payrollSickDeductionPercent == null ||
      settings.payrollAbsentDeductionPercent == null ||
      settings.payrollMaxLeaveDays == null ||
      settings.payrollStandardWorkHours == null ||
      settings.payrollOvertimePercent == null ||
      settings.payrollDefaultTaxes == null ||
      settings.payrollDefaultInsurance == null ||
      settings.payrollWorkDayStart == null ||
      settings.payrollWorkDayEnd == null ||
      settings.payrollWorkBreaks == null ||
      settings.workShifts == null ||
      settings.defaultShiftId == null ||
      isLegacyPayrollDefaults(settings));

  if (shouldPersist) {
    try {
      const shiftA = resolved.workShifts.find((item) => item.id === "A") || resolved.workShifts[0];
      await updatePharmacySettings(pharmacyId, {
        payrollPayDay: resolved.payDay,
        payrollSickDeductionPercent: resolved.sickDeductionPercent,
        payrollAbsentDeductionPercent: resolved.absentDeductionPercent,
        payrollMaxLeaveDays: resolved.maxLeaveDays,
        payrollStandardWorkHours: resolved.standardWorkHours,
        payrollOvertimePercent: resolved.overtimePercent,
        payrollDefaultTaxes: resolved.defaultTaxes,
        payrollDefaultInsurance: resolved.defaultInsurance,
        payrollWorkDayStart: shiftA.dayStart,
        payrollWorkDayEnd: shiftA.dayEnd,
        payrollWorkBreaks: shiftA.breaks,
        workShifts: resolved.workShifts,
        defaultShiftId: resolved.defaultShiftId,
      });
    } catch (error) {
      console.error("loadPayrollSettings persist error:", error);
    }
  }

  return resolved;
}

export async function upsertPharmacySettings(
  pharmacyId: string,
  updates: Partial<PharmacySettings>
) {
  const existing = await getPharmacySettings(pharmacyId);
  if (existing) {
    await updatePharmacySettings(pharmacyId, updates);
    return;
  }

  const payload = toSnakeCase({
    id: pharmacyId,
    name: updates.name || pharmacyId,
    name_en: updates.name_en || updates.name || pharmacyId,
    phone: updates.phone || "",
    address: updates.address || "",
    currency: updates.currency || "ج.م",
    isActive: updates.isActive ?? true,
    ...updates,
  });

  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribePharmacySettings(
  pharmacyId: string,
  callback: (settings: PharmacySettings) => void
) {
  const channel = supabase
    .channel(`realtime-pharmacies-${pharmacyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pharmacies",
        filter: `id=eq.${pharmacyId}`,
      },
      (payload) => {
        const row = payload.new || payload.old;
        if (row) {
          callback(toCamelCase<PharmacySettings>(row));
        }
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function getMedicines(): Promise<Medicine[]> {
  return getRows<Medicine>("medicines", "id", false, 500, undefined, true);
}

export async function getMedicinesForPharmacy(pharmacyId: string): Promise<Medicine[]> {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("id", { ascending: true });

  if (error) {
    console.error("getMedicinesForPharmacy error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Medicine>(row));
}

export async function getMedicinesForPharmacies(pharmacyIds: string[]): Promise<Medicine[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getMedicines();
  if (ids.length === 1) return getMedicinesForPharmacy(ids[0]);

  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .in("pharmacy_id", ids)
    .order("id", { ascending: true })
    .limit(3000);

  if (error) {
    console.error("getMedicinesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Medicine>(row));
}

export async function runWithPharmacyScope<T>(
  pharmacyId: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = activePharmacyId;
  activePharmacyId = pharmacyId;
  try {
    return await fn();
  } finally {
    activePharmacyId = previous;
  }
}

export async function getPurchasesForPharmacies(pharmacyIds: string[]): Promise<PurchaseRecord[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getPurchases();

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .in("pharmacy_id", ids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("getPurchasesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PurchaseRecord>(row));
}

export type PurchaseBatchItem = {
  barcode: string;
  name_ar: string;
  name_en: string;
  qty: number;
  buyPrice: number;
  price: number;
  expiry: string;
};

function formatPurchaseError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("purchases") && lower.includes("barcode") && lower.includes("schema")) {
    return "عمود barcode غير موجود في جدول purchases. شغّل supabase/add-purchases-columns.sql في Supabase SQL Editor ثم أعد المحاولة.";
  }
  if (lower.includes("column") && lower.includes("does not exist") && lower.includes("purchases")) {
    return "أعمدة جدول purchases ناقصة. شغّل supabase/add-purchases-columns.sql في Supabase SQL Editor.";
  }
  if (lower.includes("medicine_name") && lower.includes("not-null")) {
    return "عمود medicine_name مطلوب في جدول purchases. حدّث التطبيق (refresh) أو شغّل add-purchases-columns.sql.";
  }
  if (
    lower.includes("medicines_barcode_key") ||
    lower.includes("medicines_pharmacy_barcode_unique") ||
    (lower.includes("duplicate key") && lower.includes("barcode"))
  ) {
    return "الباركود مسجّل مسبقاً في هذا الفرع أو فرع آخر. تأكد من الباركود أو شغّل supabase/fix-purchases-complete.sql.";
  }
  if (lower.includes("purchases_purchase_number_key")) {
    return "رقم التوريد مربوط بقيد فريد في قاعدة البيانات. شغّل supabase/fix-purchases-complete.sql في Supabase (قسم إزالة unique على purchase_number).";
  }
  if (lower.includes("duplicate key")) {
    return `تعارض في رقم السجل: ${message}`;
  }
  if (lower.includes("already_saved")) {
    return "تم حفظ أصناف هذا التوريد مسبقاً بنفس رقم التوريد";
  }
  if (lower.includes("invalid_item")) {
    return "بيانات الصنف غير مكتملة (الباركود أو الاسم أو الصلاحية)";
  }
  if (lower.includes("empty_items")) {
    return "لا توجد أصناف في التوريد";
  }
  if (lower.includes("not_authorized")) {
    return "غير مصرح بحفظ التوريد لهذا الفرع";
  }
  if (lower.includes("complete_purchase_with_stock_addition")) {
    return "دالة حفظ التوريد غير مفعّلة في قاعدة البيانات. شغّل supabase/complete-purchase-rpc.sql في Supabase SQL Editor.";
  }
  return message;
}

function parsePurchaseRpcError(message: string): string {
  const known = [
    "pharmacy_required",
    "purchase_number_required",
    "not_authorized",
    "empty_items",
    "invalid_item",
    "already_saved",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message;
}

async function createIdAllocator(table: string) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    console.error(`createIdAllocator ${table}:`, error.message);
  }

  let cursor = Number(data?.[0]?.id) || 0;
  return () => {
    cursor += 1 + Math.floor(Math.random() * 17);
    return cursor;
  };
}

export async function savePurchaseBatch(params: {
  pharmacyId: string;
  purchaseNumber: string;
  supplierName?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  items: PurchaseBatchItem[];
}) {
  if (!params.items.length) {
    throw new Error("No purchase items");
  }

  if (!params.pharmacyId) {
    throw new Error("Target pharmacy is required");
  }

  const itemsPayload = params.items.map((item) => ({
    barcode: String(item.barcode ?? "").trim(),
    name_ar: String(item.name_ar ?? "").trim(),
    name_en: String(item.name_en ?? "").trim(),
    qty: Number(item.qty),
    buy_price: Number(item.buyPrice),
    sell_price: Number(item.price),
    expiry: item.expiry,
  }));

  const { error } = await supabase.rpc("complete_purchase_with_stock_addition", {
    p_pharmacy_id: params.pharmacyId,
    p_purchase_number: params.purchaseNumber,
    p_supplier_name: params.supplierName || null,
    p_notes: params.notes || null,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
    p_items: itemsPayload,
  });

  if (error) {
    const code = parsePurchaseRpcError(error.message);
    if (code === "already_saved") {
      throw new Error("تم حفظ أصناف هذا التوريد مسبقاً بنفس رقم التوريد");
    }
    if (code === "invalid_item") {
      throw new Error("بيانات الصنف غير مكتملة (الباركود أو الاسم أو الصلاحية)");
    }
    if (code === "empty_items") {
      throw new Error("No purchase items");
    }
    if (code === "pharmacy_required") {
      throw new Error("Target pharmacy is required");
    }
    if (code === "not_authorized") {
      throw new Error("غير مصرح بحفظ التوريد لهذا الفرع");
    }
    throw new Error(formatPurchaseError(error.message));
  }
}

export async function deletePurchaseBatch(
  purchaseNumber: string,
  pharmacyId: string,
  userId?: string,
  userName?: string
) {
  if (!purchaseNumber || !pharmacyId) {
    throw new Error("Purchase number and pharmacy are required");
  }

  await runWithPharmacyScope(pharmacyId, async () => {
    const { data: rows, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("purchase_number", purchaseNumber)
      .eq("pharmacy_id", pharmacyId);

    if (error) {
      throw new Error(error.message);
    }

    if (!rows?.length) {
      return;
    }

    const branchMedicines = await getMedicinesForPharmacy(pharmacyId);
    const nextMovementId = await createIdAllocator("stock_movements");
    const nowIso = new Date().toISOString();

    for (const row of rows) {
      const purchase = toCamelCase<PurchaseRecord>(row);
      const barcode = String(purchase.barcode ?? "").trim();
      const purchaseQty = Number(purchase.quantity) || 0;

      const medicine =
        branchMedicines.find((item) => String(item.barcode ?? "").trim() === barcode) ||
        branchMedicines.find((item) => item.id === purchase.medicineId);

      if (medicine && purchaseQty > 0) {
        const qtyBefore = medicine.qty || 0;
        const qtyAfter = Math.max(0, qtyBefore - purchaseQty);
        await updateMedicine(medicine.id, { ...medicine, qty: qtyAfter }, pharmacyId);
        medicine.qty = qtyAfter;

        await addStockMovement({
          id: nextMovementId(),
          type: "purchase_delete",
          purchaseNumber,
          medicineId: medicine.id,
          medicineName_ar: medicine.name_ar,
          medicineName_en: medicine.name_en,
          barcode: medicine.barcode,
          quantityChange: -purchaseQty,
          qtyBefore,
          qtyAfter,
          supplierName: purchase.supplierName,
          notes: purchase.notes,
          pharmacyId,
          userId,
          userName,
          createdAt: nowIso,
        });
      }

      const { error: deleteError } = await supabase.from("purchases").delete().eq("id", row.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }
  });
}

export async function replacePurchaseBatch(params: {
  pharmacyId: string;
  purchaseNumber: string;
  supplierName?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  items: PurchaseBatchItem[];
}) {
  await deletePurchaseBatch(
    params.purchaseNumber,
    params.pharmacyId,
    params.userId,
    params.userName
  );
  await savePurchaseBatch(params);
}

export function subscribeMedicines(callback: (medicines: Medicine[]) => void) {
  const channel = supabase
    .channel("realtime-medicines")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "medicines" },
      () => {
        void getMedicines().then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function addMedicine(medicine: Medicine, pharmacyId?: string) {
  const payload = pharmacyId
    ? prepareMedicinePayloadForPharmacy(medicine, pharmacyId)
    : prepareMedicinePayload(medicine);
  const { error } = await supabase.from("medicines").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicine(
  id: number,
  medicine: Partial<Medicine>,
  pharmacyId?: string
) {
  const payload = pharmacyId
    ? prepareMedicinePayloadForPharmacy(medicine, pharmacyId)
    : prepareMedicinePayload(medicine);
  delete payload.id;

  let query = supabase.from("medicines").update(payload).eq("id", id);
  if (pharmacyId) {
    query = query.eq("pharmacy_id", pharmacyId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteMedicine(id: number) {
  const { error } = await supabase.from("medicines").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicineStock(medicineId: number, newQty: number) {
  const { error } = await supabase.from("medicines").update({ qty: newQty }).eq("id", medicineId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function applyStockCountAdjustments(params: {
  pharmacyId: string;
  userId?: string;
  userName?: string;
  notes?: string;
  lines: Array<{
    medicineId: number;
    medicineName_ar?: string;
    medicineName_en?: string;
    barcode?: string;
    systemQty: number;
    countedQty: number;
  }>;
}) {
  const varianceLines = params.lines.filter((line) => line.countedQty !== line.systemQty);
  if (varianceLines.length === 0) return { adjustedCount: 0, totalVariance: 0 };

  for (const line of varianceLines) {
    const variance = line.countedQty - line.systemQty;
    await updateMedicine(line.medicineId, { qty: line.countedQty }, params.pharmacyId);
    await addStockMovement({
      id: Date.now() + line.medicineId,
      type: "stock_count",
      medicineId: line.medicineId,
      medicineName_ar: line.medicineName_ar,
      medicineName_en: line.medicineName_en,
      barcode: line.barcode,
      quantityChange: variance,
      qtyBefore: line.systemQty,
      qtyAfter: line.countedQty,
      notes: params.notes || undefined,
      pharmacyId: params.pharmacyId,
      userId: params.userId,
      userName: params.userName,
      createdAt: new Date().toISOString(),
    });
  }

  const totalVariance = varianceLines.reduce(
    (sum, line) => sum + (line.countedQty - line.systemQty),
    0
  );

  return { adjustedCount: varianceLines.length, totalVariance };
}

export async function addActivityLog(log: ActivityLog) {
  const payload = toSnakeCase(log);
  if (!payload.pharmacy_id) {
    Object.assign(payload, stampPharmacy({}));
  }
  const { error } = await supabase.from("activity_logs").insert([payload]);

  if (error) {
    console.error("addActivityLog error:", error.message);
  }
}

export async function addStockMovement(movement: StockMovement) {
  const movementType = movement.type || "adjustment";
  const payload = stampPharmacy(
    toSnakeCase({
      ...movement,
      type: movementType,
      id: movement.id ?? Date.now(),
    })
  );

  // دعم الجداول القديمة التي تستخدم movement_type بدل type
  payload.movement_type = movementType;

  if (!payload.medicine_name_ar && !payload.medicine_name) {
    payload.medicine_name =
      movement.medicineName_ar || movement.medicineName_en || "";
  }

  const { error } = await supabase.from("stock_movements").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

async function attachInvoiceItems(invoices: Invoice[]): Promise<Invoice[]> {
  const invoiceIds = invoices.map((invoice) => invoice.id);
  if (invoiceIds.length === 0) {
    return invoices.map((invoice) => ({ ...invoice, items: invoice.items || [] }));
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .in("invoice_id", invoiceIds)
    .order("id", { ascending: true });

  if (itemsError) {
    console.error("attachInvoiceItems error:", itemsError.message);
    return invoices.map((invoice) => ({ ...invoice, items: invoice.items || [] }));
  }

  const items = (itemsData || []).map((row) => normalizeInvoiceItem(row));
  const itemsByInvoiceId = items.reduce((acc, item) => {
    if (item.invoiceId !== undefined) {
      acc[item.invoiceId] = acc[item.invoiceId] || [];
      acc[item.invoiceId].push(item);
    }
    return acc;
  }, {} as Record<number, InvoiceItem[]>);

  return invoices.map((invoice) => ({
    ...invoice,
    items: itemsByInvoiceId[invoice.id] || [],
  }));
}

export async function getInvoices(limit = 100): Promise<Invoice[]> {
  let invoiceQuery = applyPharmacyFilter(supabase.from("invoices").select("*"));

  const { data, error } = await invoiceQuery
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getInvoices error:", error.message);
    return [];
  }

  const invoices = (data || []).map((row) => toCamelCase<Invoice>(row));
  return attachInvoiceItems(invoices);
}

export async function getInvoicesForPeriod(
  periodStart: string,
  periodEnd: string,
  pharmacyIds?: string[]
): Promise<Invoice[]> {
  const startIso = `${periodStart}T00:00:00`;
  const endIso = `${periodEnd}T23:59:59.999`;
  const ids = [...new Set((pharmacyIds || []).filter(Boolean))];

  let query = supabase
    .from("invoices")
    .select("*")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false });

  if (ids.length > 1) {
    query = query.in("pharmacy_id", ids);
  } else if (ids.length === 1) {
    query = query.eq("pharmacy_id", ids[0]);
  } else {
    query = applyPharmacyFilter(query);
  }

  const { data, error } = await query.limit(2000);
  if (error) {
    console.error("getInvoicesForPeriod error:", error.message);
    return [];
  }

  const invoices = (data || []).map((row) => toCamelCase<Invoice>(row));
  return attachInvoiceItems(invoices);
}

export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  const channel = supabase
    .channel("realtime-invoices")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "invoices" },
      () => {
        void getInvoices().then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function createInvoice(invoice: Invoice) {
  const invoiceRow = stampPharmacy(prepareInvoicePayload(invoice));

  const { data: insertedInvoice, error: insertError } = await supabase
    .from("invoices")
    .insert([invoiceRow])
    .select("*")
    .single();

  if (insertError) {
    console.error("createInvoice error:", insertError.message);
    throw new Error(insertError.message);
  }

  if (!invoice.items?.length) {
    return toCamelCase<Invoice>(insertedInvoice);
  }

  const invoiceItems = invoice.items.map((item, index) =>
    stampPharmacy(prepareInvoiceItemPayload(item, insertedInvoice.id, index))
  );

  const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);

  if (itemsError) {
    console.error("createInvoice invoice_items error:", itemsError.message);
    throw new Error(itemsError.message);
  }

  return toCamelCase<Invoice>(insertedInvoice);
}

function parseSaleRpcError(message: string): string {
  const known = [
    "pharmacy_required",
    "not_authorized",
    "empty_cart",
    "invoice_required",
    "medicine_not_found",
    "insufficient_stock",
    "cashier_shift_invalid",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message;
}

function normalizeCashierShift(row: Record<string, unknown>): CashierShift {
  const shift = toCamelCase<CashierShift>(row as Record<string, any>);
  return {
    ...shift,
    openingCash: Number(shift.openingCash ?? 0),
    expectedCash: shift.expectedCash !== undefined ? Number(shift.expectedCash) : undefined,
    actualCash: shift.actualCash !== undefined ? Number(shift.actualCash) : undefined,
    cashVariance: shift.cashVariance !== undefined ? Number(shift.cashVariance) : undefined,
    totalSales: Number(shift.totalSales ?? 0),
    cashSales: Number(shift.cashSales ?? 0),
    visaSales: Number(shift.visaSales ?? 0),
    walletSales: Number(shift.walletSales ?? 0),
    creditSales: Number(shift.creditSales ?? 0),
    returnsTotal: Number(shift.returnsTotal ?? 0),
    customerPaymentsCash: Number(shift.customerPaymentsCash ?? 0),
    customerPaymentsOther: Number(shift.customerPaymentsOther ?? 0),
    invoiceCount: Number(shift.invoiceCount ?? 0),
    status: (shift.status || "open") as CashierShift["status"],
  };
}

function sumByPaymentMethod(
  rows: Array<{ total?: number | string | null; payment_method?: string | null; paymentMethod?: string }>,
  method: string
) {
  return rows.reduce((sum, row) => {
    const rowMethod = String(row.payment_method ?? row.paymentMethod ?? "cash").toLowerCase();
    if (rowMethod !== method) return sum;
    return sum + Number(row.total ?? 0);
  }, 0);
}

export async function getOpenCashierShift(
  pharmacyId: string,
  cashierId: string
): Promise<CashierShift | null> {
  if (!pharmacyId || !cashierId) return null;

  const { data, error } = await supabase
    .from("cashier_shifts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("cashier_id", cashierId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("getOpenCashierShift:", error.message);
    return null;
  }

  const row = data?.[0];
  return row ? normalizeCashierShift(row) : null;
}

export async function openCashierShift(params: {
  pharmacyId: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  workShiftId?: string;
}): Promise<CashierShift> {
  if (!params.pharmacyId || !params.cashierId) {
    throw new Error("pharmacy_required");
  }

  const existing = await getOpenCashierShift(params.pharmacyId, params.cashierId);
  if (existing) {
    throw new Error("shift_already_open");
  }

  const nextId = await createIdAllocator("cashier_shifts");
  const payload = {
    id: nextId(),
    shift_number: `CSH-${Date.now()}`,
    pharmacy_id: params.pharmacyId,
    cashier_id: params.cashierId,
    cashier_name: params.cashierName,
    work_shift_id: params.workShiftId || null,
    status: "open",
    opening_cash: Number(params.openingCash) || 0,
    opened_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("cashier_shifts")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("cashier_shifts_one_open_per_cashier")) {
      throw new Error("shift_already_open");
    }
    throw new Error(error.message);
  }

  return normalizeCashierShift(data);
}

export async function computeCashierShiftSummary(
  shift: CashierShift
): Promise<CashierShiftSummary> {
  const endAt = shift.closedAt || new Date().toISOString();

  const [invoicesResult, paymentsResult, returnsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("total, payment_method")
      .eq("cashier_shift_id", shift.id),
    supabase
      .from("customer_payments")
      .select("amount, payment_method")
      .eq("pharmacy_id", shift.pharmacyId)
      .eq("user_id", shift.cashierId)
      .gte("created_at", shift.openedAt)
      .lte("created_at", endAt),
    supabase
      .from("returns")
      .select("total")
      .eq("pharmacy_id", shift.pharmacyId)
      .eq("user_id", shift.cashierId)
      .gte("created_at", shift.openedAt)
      .lte("created_at", endAt),
  ]);

  const invoices = invoicesResult.data || [];
  const payments = paymentsResult.data || [];
  const returns = returnsResult.data || [];

  const cashSales = sumByPaymentMethod(invoices, "cash");
  const visaSales = sumByPaymentMethod(invoices, "visa");
  const walletSales = sumByPaymentMethod(invoices, "wallet");
  const creditSales = sumByPaymentMethod(invoices, "credit");
  const totalSales = invoices.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const invoiceCount = invoices.length;

  const customerPaymentsCash = payments.reduce((sum, row) => {
    const method = String(row.payment_method ?? "cash").toLowerCase();
    if (method !== "cash") return sum;
    return sum + Number(row.amount ?? 0);
  }, 0);

  const customerPaymentsOther = payments.reduce((sum, row) => {
    const method = String(row.payment_method ?? "cash").toLowerCase();
    if (method === "cash") return sum;
    return sum + Number(row.amount ?? 0);
  }, 0);

  const returnsTotal = returns.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const expectedCash =
    Number(shift.openingCash ?? 0) +
    cashSales +
    customerPaymentsCash -
    returnsTotal;

  return {
    totalSales,
    cashSales,
    visaSales,
    walletSales,
    creditSales,
    returnsTotal,
    customerPaymentsCash,
    customerPaymentsOther,
    invoiceCount,
    expectedCash,
  };
}

export async function closeCashierShift(params: {
  shiftId: number;
  actualCash: number;
  notes?: string;
  closedById?: string;
  closedByName?: string;
}): Promise<CashierShift> {
  const { data: row, error: fetchError } = await supabase
    .from("cashier_shifts")
    .select("*")
    .eq("id", params.shiftId)
    .single();

  if (fetchError || !row) {
    throw new Error("shift_not_found");
  }

  const shift = normalizeCashierShift(row);
  if (shift.status !== "open") {
    throw new Error("shift_already_closed");
  }

  const summary = await computeCashierShiftSummary(shift);
  const actualCash = Number(params.actualCash);
  const cashVariance = actualCash - summary.expectedCash;
  const closedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("cashier_shifts")
    .update({
      status: "closed",
      expected_cash: summary.expectedCash,
      actual_cash: actualCash,
      cash_variance: cashVariance,
      total_sales: summary.totalSales,
      cash_sales: summary.cashSales,
      visa_sales: summary.visaSales,
      wallet_sales: summary.walletSales,
      credit_sales: summary.creditSales,
      returns_total: summary.returnsTotal,
      customer_payments_cash: summary.customerPaymentsCash,
      customer_payments_other: summary.customerPaymentsOther,
      invoice_count: summary.invoiceCount,
      notes: params.notes || shift.notes || "",
      closed_at: closedAt,
      closed_by_id: params.closedById || null,
      closed_by_name: params.closedByName || null,
      updated_at: closedAt,
    })
    .eq("id", params.shiftId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCashierShift(data);
}

export async function listCashierShifts(
  pharmacyId: string,
  options?: {
    from?: string;
    to?: string;
    cashierId?: string;
    status?: CashierShift["status"];
    limit?: number;
  }
): Promise<CashierShift[]> {
  if (!pharmacyId) return [];

  let query = supabase
    .from("cashier_shifts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("opened_at", { ascending: false });

  if (options?.cashierId) {
    query = query.eq("cashier_id", options.cashierId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.from) {
    query = query.gte("opened_at", options.from);
  }
  if (options?.to) {
    query = query.lte("opened_at", options.to);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listCashierShifts:", error.message);
    return [];
  }

  return (data || []).map((item) => normalizeCashierShift(item));
}

export async function completeSaleWithStockDeduction(
  cart: CartItem[],
  invoice: Invoice,
  _stockMovements?: StockMovement[]
) {
  if (!cart.length || !invoice.items?.length) {
    throw new Error("empty_cart");
  }

  const pharmacyId =
    invoice.pharmacyId || resolveStampPharmacyId() || currentAppUser?.pharmacyId || "";
  if (!pharmacyId) {
    throw new Error("pharmacy_required");
  }

  const invoicePayload = stampPharmacy(prepareInvoicePayload(invoice));
  const itemsPayload = invoice.items.map((item, index) =>
    stampPharmacy(prepareInvoiceItemPayload(item, invoice.id, index))
  );

  const { error } = await supabase.rpc("complete_sale_with_stock_deduction", {
    p_pharmacy_id: pharmacyId,
    p_invoice: invoicePayload,
    p_items: itemsPayload,
  });

  if (error) {
    const code = parseSaleRpcError(error.message);
    if (code === "insufficient_stock") {
      const shortItem = cart.find((item) => item.cartQty > item.qty);
      throw new Error(
        shortItem ? `Not enough stock: ${shortItem.name_en}` : "insufficient_stock"
      );
    }
    if (code === "medicine_not_found") {
      throw new Error("Medicine not found");
    }
    if (code === "cashier_shift_invalid") {
      throw new Error("cashier_shift_invalid");
    }
    throw new Error(code);
  }
}

function resolveMedicineIdValue(raw: unknown): number | string {
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && String(asNumber) === trimmed) {
      return asNumber;
    }
    return trimmed;
  }

  const asNumber = Number(raw);
  return Number.isNaN(asNumber) ? 0 : asNumber;
}

function hasValidMedicineId(medicineId: number | string): boolean {
  if (typeof medicineId === "string") {
    return medicineId.length > 0;
  }
  return medicineId > 0;
}

function normalizeInvoiceItem(row: Record<string, unknown>): InvoiceItem {
  const item = toCamelCase<InvoiceItem>(row as Record<string, any>);
  const medicineId = Number(item.medicineId ?? row.medicine_id ?? 0);
  const quantity = Number(item.quantity ?? row.quantity ?? 0);
  const unitPrice = Number(item.unitPrice ?? row.unit_price ?? 0);

  return {
    ...item,
    medicineId,
    name_ar: String(item.name_ar ?? row.name_ar ?? row.medicine_name ?? ""),
    name_en: String(item.name_en ?? row.name_en ?? ""),
    barcode: String(item.barcode ?? row.barcode ?? ""),
    quantity,
    unitPrice,
    lineTotal: Number(item.lineTotal ?? row.line_total ?? unitPrice * quantity),
    buyPrice: Number(item.buyPrice ?? row.buy_price ?? 0),
    costTotal: Number(item.costTotal ?? row.cost_total ?? 0),
    profit: Number(item.profit ?? row.profit ?? 0),
  };
}

function normalizeReturnItems(items: unknown): ReturnRecord["items"] {
  let parsed = items;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === "object") {
      parsed = Object.values(parsed as Record<string, unknown>);
    } else {
      return [];
    }
  }

  return (parsed as Record<string, unknown>[])
    .map((raw) => {
      const medicineId = resolveMedicineIdValue(
        raw.medicineId ?? raw.medicine_id ?? raw.medicineID ?? raw.id ?? 0
      );
      const quantity = Number(
        raw.quantity ?? raw.qty ?? raw.return_qty ?? raw.returnQuantity ?? 0
      );
      const unitPrice = Number(raw.unitPrice ?? raw.unit_price ?? 0);
      const lineTotal = Number(raw.lineTotal ?? raw.line_total ?? unitPrice * quantity);

      return {
        medicineId,
        name_ar: String(raw.name_ar ?? raw.nameAr ?? raw.medicine_name ?? ""),
        name_en: String(raw.name_en ?? raw.nameEn ?? ""),
        barcode: String(raw.barcode ?? ""),
        quantity,
        unitPrice: unitPrice || (quantity > 0 ? lineTotal / quantity : 0),
        lineTotal,
        buyPrice: Number(raw.buyPrice ?? raw.buy_price ?? 0),
        costTotal: Number(raw.costTotal ?? raw.cost_total ?? 0),
        profit: Number(raw.profit ?? 0),
      };
    })
    .filter(
      (item) =>
        item.quantity > 0 &&
        (hasValidMedicineId(item.medicineId) || Boolean(item.name_ar) || Boolean(item.name_en))
    );
}

function rebuildReturnItemsFromMovements(
  returnRecord: ReturnRecord,
  movements: StockMovement[]
): ReturnRecord["items"] {
  const related = movements.filter(
    (movement) =>
      movement.returnNumber === returnRecord.returnNumber &&
      (movement.type === "return" || movement.type === "sale_return")
  );

  if (related.length === 0) {
    return [];
  }

  const recordTotal = Number(returnRecord.total ?? 0);
  const totalQty = related.reduce(
    (sum, movement) => sum + Math.abs(Number(movement.quantityChange ?? 0)),
    0
  );

  return related.map((movement) => {
    const movementRow = movement as StockMovement & { name_ar?: string; name_en?: string };
    const quantity = Math.abs(Number(movement.quantityChange ?? 0));
    const unitPrice =
      quantity > 0 && related.length === 1 && recordTotal > 0
        ? recordTotal / quantity
        : 0;

    return {
      medicineId: Number(movement.medicineId ?? 0),
      name_ar: movement.medicineName_ar || movementRow.name_ar || "",
      name_en: movement.medicineName_en || movementRow.name_en || "",
      barcode: movement.barcode || "",
      quantity,
      unitPrice,
      lineTotal: unitPrice > 0 ? unitPrice * quantity : 0,
      buyPrice: 0,
      costTotal: 0,
      profit: 0,
    };
  });
}

function normalizeReturnRecord(row: Record<string, any>): ReturnRecord {
  const record = toCamelCase<ReturnRecord>(row);
  record.items = normalizeReturnItems(row.items ?? record.items);
  record.invoiceNumber = record.invoiceNumber || row.invoice_number || "";
  record.returnNumber = record.returnNumber || row.return_number || "";
  record.reason = record.reason || row.reason || "";
  record.refundMethod = record.refundMethod || row.refund_method;
  record.isInstant = Boolean(record.isInstant ?? row.is_instant ?? false);
  record.total = Number(record.total ?? row.total ?? 0);
  return record;
}

export async function getReturns(): Promise<ReturnRecord[]> {
  let query = supabase.from("returns").select("*");
  query = applyPharmacyFilter(query);
  query = query.order("id", { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) {
    console.error("getReturns error:", error.message);
    return [];
  }

  const records = (data || []).map((row) =>
    normalizeReturnRecord(row as Record<string, any>)
  );

  const emptyReturnNumbers = records
    .filter((record) => (!record.items || record.items.length === 0) && record.returnNumber)
    .map((record) => record.returnNumber);

  if (emptyReturnNumbers.length === 0) {
    return records;
  }

  let movementQuery = supabase
    .from("stock_movements")
    .select("*")
    .in("return_number", emptyReturnNumbers);

  movementQuery = applyPharmacyFilter(movementQuery);

  const { data: movementRows, error: movementError } = await movementQuery;

  if (movementError) {
    console.error("getReturns stock_movements recovery error:", movementError.message);
    return records;
  }

  const movements = (movementRows || []).map((row) => toCamelCase<StockMovement>(row));

  return records.map((record) => {
    if (record.items && record.items.length > 0) {
      return record;
    }

    const recoveredItems = rebuildReturnItemsFromMovements(record, movements);
    if (recoveredItems.length === 0) {
      return record;
    }

    return {
      ...record,
      items: recoveredItems,
    };
  });
}

export function subscribeReturns(callback: (returnsData: ReturnRecord[]) => void) {
  const channel = supabase
    .channel("realtime-returns")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "returns" },
      () => {
        void getReturns().then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function getPurchases(): Promise<PurchaseRecord[]> {
  return getRows<PurchaseRecord>("purchases", "id", false, 100, undefined, true);
}

export function subscribePurchases(callback: (purchases: PurchaseRecord[]) => void) {
  return subscribeTable<PurchaseRecord>("purchases", callback, "id", false, 100, undefined, true);
}

function normalizePharmacyCost(row: PharmacyCost): PharmacyCost {
  const id = Number(row.id) || Date.now();
  const costNumber = String(row.costNumber ?? "").trim();

  return {
    ...row,
    id,
    costNumber: costNumber || `COST-${id}`,
    title: String(row.title ?? "").trim(),
    category: String(row.category ?? "other"),
    amount: Number(row.amount) || 0,
    paymentMethod: String(row.paymentMethod ?? "cash"),
    notes: String(row.notes ?? ""),
  };
}

export async function getPharmacyCosts(): Promise<PharmacyCost[]> {
  const rows = await getRows<PharmacyCost>("pharmacy_costs", "created_at", false, 500, undefined, true);
  return rows.map(normalizePharmacyCost);
}

export function subscribePharmacyCosts(callback: (costs: PharmacyCost[]) => void) {
  return subscribeTable<PharmacyCost>(
    "pharmacy_costs",
    (rows) => callback(rows.map(normalizePharmacyCost)),
    "created_at",
    false,
    500,
    undefined,
    true
  );
}

export async function savePharmacyCost(cost: PharmacyCost) {
  const payload = stampPharmacy(toSnakeCase(cost));
  const { error } = await supabase.from("pharmacy_costs").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePharmacyCost(id: number, updates: Partial<PharmacyCost>) {
  const payload = stampPharmacy(toSnakeCase(updates));
  const { error } = await supabase.from("pharmacy_costs").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyCost(id: number) {
  const { error } = await supabase.from("pharmacy_costs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  return getRows<CustomerPayment>("customer_payments", "id", false, 100, undefined, true);
}

export function subscribeCustomerPayments(callback: (payments: CustomerPayment[]) => void) {
  return subscribeTable<CustomerPayment>("customer_payments", callback, "id", false, 100, undefined, true);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return getRows<StockMovement>("stock_movements", "created_at", false, 100, undefined, true);
}

export async function getStockMovementsForMedicine(
  medicineId: number,
  pharmacyId?: string
): Promise<StockMovement[]> {
  let query = supabase
    .from("stock_movements")
    .select("*")
    .eq("medicine_id", medicineId)
    .order("created_at", { ascending: false })
    .limit(300);

  if (pharmacyId) {
    query = query.eq("pharmacy_id", pharmacyId);
  } else {
    query = applyPharmacyFilter(query);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getStockMovementsForMedicine error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<StockMovement>(row));
}

export function subscribeStockMovements(callback: (movements: StockMovement[]) => void) {
  return subscribeTable<StockMovement>("stock_movements", callback, "created_at", false, 100, undefined, true);
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return getRows<ActivityLog>("activity_logs", "created_at", false, 300, undefined, true);
}

export async function getActivityLogsForPharmacies(
  pharmacyIds: string[],
  limit = 500
): Promise<ActivityLog[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getActivityLogs();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .in("pharmacy_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getActivityLogsForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<ActivityLog>(row));
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  return subscribeTable<ActivityLog>("activity_logs", callback, "created_at", false, 300, undefined, true);
}

async function attachOrganizationBranchLimits(
  pharmacies: PharmacySettings[]
): Promise<PharmacySettings[]> {
  const organizationIds = [
    ...new Set(pharmacies.map((pharmacy) => pharmacy.organizationId).filter(Boolean)),
  ] as string[];

  if (organizationIds.length === 0) {
    return pharmacies.map((pharmacy) => ({ ...pharmacy, maxBranches: pharmacy.maxBranches ?? 1 }));
  }

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, max_branches")
    .in("id", organizationIds);

  if (error) {
    console.error("attachOrganizationBranchLimits error:", error.message);
    return pharmacies;
  }

  const maxByOrg = new Map(
    (organizations || []).map((row) => [String(row.id), Number(row.max_branches) || 1])
  );

  return pharmacies.map((pharmacy) => {
    const fromPharmacy = Number(pharmacy.maxBranches);
    const fromOrg = pharmacy.organizationId ? maxByOrg.get(pharmacy.organizationId) : undefined;
    const tierDefault = getSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan
    ).maxBranches;
    const resolved =
      Number.isFinite(fromPharmacy) && fromPharmacy > 0
        ? fromPharmacy
        : fromOrg ?? tierDefault;
    const subscriptionTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan
    );
    return { ...pharmacy, subscriptionTier, maxBranches: resolved };
  });
}

export async function getPharmacies(): Promise<PharmacySettings[]> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("getPharmacies error:", error.message);
    return [];
  }

  const pharmacies = (data || []).map((row) => toCamelCase<PharmacySettings>(row));
  return attachOrganizationBranchLimits(pharmacies);
}

export async function updateOrganizationMaxBranches(
  organizationId: string,
  maxBranches: number,
  actingUser: AppUser | null = getCurrentAppUser()
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const normalized = Math.max(1, Math.floor(Number(maxBranches)));
  const { error: rpcError } = await supabase.rpc("set_organization_max_branches", {
    target_organization_id: organizationId,
    new_max_branches: normalized,
  });

  if (!rpcError) {
    return;
  }

  const rpcMessage = rpcError.message || "";
  const rpcMissing =
    rpcMessage.includes("set_organization_max_branches") &&
    (rpcMessage.includes("does not exist") || rpcMessage.includes("Could not find"));

  if (!rpcMissing && !rpcMessage.includes("forbidden")) {
    throw new Error(rpcMessage);
  }

  const { data: updatedPharmacies, error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({ max_branches: normalized })
    .eq("organization_id", organizationId)
    .select("id");

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("max_branches") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  if (!updatedPharmacies || updatedPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  await supabase
    .from("organizations")
    .update({ max_branches: normalized })
    .eq("id", organizationId);
}

export async function updateOrganizationSubscriptionTier(
  organizationId: string,
  tier: SubscriptionTier,
  actingUser: AppUser | null = getCurrentAppUser()
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const tierConfig = getSubscriptionTier(tier);
  const maxBranches = tierConfig.maxBranches;

  const { data: orgPharmacies, error: fetchError } = await supabase
    .from("pharmacies")
    .select("id")
    .eq("organization_id", organizationId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!orgPharmacies || orgPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  if (orgPharmacies.length > maxBranches) {
    throw new Error("below_current_branches");
  }

  const { error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
    })
    .eq("organization_id", organizationId);

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("subscription_tier") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  await supabase
    .from("organizations")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
    })
    .eq("id", organizationId);
}

export function subscribePharmacies(callback: (rows: PharmacySettings[]) => void) {
  const channel = supabase
    .channel("realtime-pharmacies-all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pharmacies" },
      () => {
        void getPharmacies().then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

function buildSubscriptionRequestNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${stamp}-${random}`;
}

export async function getAllSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getAllSubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export async function getPharmacySubscriptionRequests(
  pharmacyId: string
): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getPharmacySubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export function subscribeSubscriptionRequests(callback: (rows: SubscriptionRequest[]) => void) {
  const channel = supabase
    .channel("realtime-subscription-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscription_requests" },
      () => {
        void getAllSubscriptionRequests().then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function createSubscriptionRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  plan: string;
  days: number;
  amount: number;
  currency?: string;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<SubscriptionRequest> {
  const payload = toSnakeCase({
    requestNumber: buildSubscriptionRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    plan: input.plan,
    days: input.days,
    amount: input.amount,
    currency: input.currency || "EGP",
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("subscription_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<SubscriptionRequest>(data);
  void notifySuperAdminOfSubscriptionRequest(created).catch((notifyError) => {
    console.error("notifySuperAdminOfSubscriptionRequest:", notifyError);
  });

  return created;
}

export async function updateSubscriptionRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
  }
) {
  const payload = toSnakeCase({
    status: updates.status,
    reviewedBy: updates.reviewedBy,
    reviewedByName: updates.reviewedByName,
    reviewNote: updates.reviewNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("subscription_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildLoginAccountRequestNumber() {
  return `ACC-${Date.now()}`;
}

export async function getAllLoginAccountRequests(options?: {
  includePendingPasswords?: boolean;
}): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllLoginAccountRequests error:", error.message, error.code);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    if (!options?.includePendingPasswords || req.status !== "pending") {
      delete req.password;
    }
    return req;
  });
}

export async function getPharmacyLoginAccountRequests(
  pharmacyId: string
): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPharmacyLoginAccountRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    delete req.password;
    return req;
  });
}

export async function getLoginAccountRequestById(id: number): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCamelCase<LoginAccountRequest>(data);
}

export async function getPendingLoginAccountRequestForEmployee(
  employeeId: string
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export async function getPendingLoginAccountRequestForEmail(
  pharmacyId: string,
  email: string
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export function subscribeLoginAccountRequests(
  callback: (rows: LoginAccountRequest[]) => void,
  options?: { includePendingPasswords?: boolean }
) {
  const channel = supabase.channel("realtime-login-account-requests").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "login_account_requests" },
    () => {
      void getAllLoginAccountRequests(options).then(callback);
    }
  );

  void channel.subscribe();
  return () => {
    void channel.unsubscribe();
  };
}

export async function createLoginAccountRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  employeeId?: string;
  employeeName?: string;
  email: string;
  username?: string;
  password: string;
  role: UserRole;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<LoginAccountRequest> {
  const email = input.email.trim().toLowerCase();
  const existingEmail = await getPendingLoginAccountRequestForEmail(input.pharmacyId, email);
  if (existingEmail) {
    throw new Error("pending_login_request_exists");
  }
  if (input.employeeId) {
    const existingEmployee = await getPendingLoginAccountRequestForEmployee(input.employeeId);
    if (existingEmployee) {
      throw new Error("pending_login_request_exists");
    }
  }

  const payload = toSnakeCase({
    requestNumber: buildLoginAccountRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    employeeId: input.employeeId || null,
    employeeName: input.employeeName || null,
    email,
    username: (input.username || email.split("@")[0] || email).trim(),
    password: input.password,
    role: normalizeRole(input.role),
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("login_account_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<LoginAccountRequest>(data);
  delete created.password;
  return created;
}

export async function updateLoginAccountRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
    clearPassword?: boolean;
  }
) {
  const payload: Record<string, unknown> = {
    status: updates.status,
    reviewed_by: updates.reviewedBy,
    reviewed_by_name: updates.reviewedByName,
    review_note: updates.reviewNote,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (updates.clearPassword) {
    // Column may still be NOT NULL on older DBs — empty string satisfies the constraint.
    payload.password = "";
  }

  const { error } = await supabase
    .from("login_account_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPharmacyLoginAccounts(pharmacyId: string): Promise<PharmacyLoginAccount[]> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("email", { ascending: true });

  if (error) {
    console.error("getPharmacyLoginAccounts error:", error.message);
    return [];
  }

  return (data || []).map((row) => normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)));
}

export async function getPharmacyLoginAccountsForPharmacies(
  pharmacyIds: string[]
): Promise<PharmacyLoginAccount[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getPharmacyLoginAccounts(ids[0]);

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .in("pharmacy_id", ids)
    .order("pharmacy_id", { ascending: true })
    .order("email", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getPharmacyLoginAccountsForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)));
}

function normalizePharmacyLoginAccount(row: PharmacyLoginAccount): PharmacyLoginAccount {
  return {
    ...row,
    role: normalizeRole(row.role),
    email: row.email.trim().toLowerCase(),
    status: row.status || "approved",
    editPending: Boolean(row.editPending),
    linkRequestPending: Boolean(row.linkRequestPending),
    pendingEmail: row.pendingEmail?.trim().toLowerCase(),
    pendingRole: row.pendingRole ? normalizeRole(row.pendingRole) : undefined,
  };
}

export async function getAllPharmacyLoginAccounts(options?: {
  status?: PharmacyLoginAccount["status"];
  pendingApproval?: boolean;
}): Promise<PharmacyLoginAccount[]> {
  let query = supabase.from("pharmacy_login_accounts").select("*").order("created_at", {
    ascending: false,
  });
  if (options?.pendingApproval) {
    query = query.or("status.eq.pending,edit_pending.eq.true,link_request_pending.eq.true");
  } else if (options?.status) {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getAllPharmacyLoginAccounts error:", error.message);
    return [];
  }
  return (data || []).map((row) => normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)));
}

export async function getPharmacyLoginAccountById(id: string): Promise<PharmacyLoginAccount | null> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function createPharmacyLoginAccount(input: {
  pharmacyId: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  status?: PharmacyLoginAccount["status"];
  requestedBy?: string;
  requestedByName?: string;
}): Promise<PharmacyLoginAccount> {
  const status =
    input.status ?? (isSuperAdmin(getCurrentAppUser()) ? "approved" : "pending");

  const payload = stampPharmacy(
    toSnakeCase({
      id: crypto.randomUUID(),
      pharmacyId: input.pharmacyId,
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: normalizeRole(input.role),
      employeeId: input.employeeId || null,
      isActive: true,
      status,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  );

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function superAdminApprovePharmacyLoginAccountCatalog(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status === "approved") {
    throw new Error("account_already_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
  const employees = await getEmployees();
  const employee = approved.employeeId
    ? employees.find((item) => item.id === approved.employeeId)
    : undefined;
  await syncPharmacyLoginAccountToUser(approved, { name: employee?.name }).catch(() => undefined);

  return approved;
}

export async function approvePharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || account.status !== "pending") {
    throw new Error("account_not_pending");
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  await syncPharmacyLoginAccountToUser(approved).catch(() => undefined);

  return approved;
}

export async function rejectPharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee_id: null,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitPharmacyLoginAccountEditRequest(
  id: string,
  changes: { email: string; password: string; role: UserRole },
  requestedBy?: string,
  requestedByName?: string
) {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: changes.email.trim().toLowerCase(),
      pending_password: changes.password,
      pending_role: normalizeRole(changes.role),
      edit_pending: true,
      edit_requested_by: requestedBy || null,
      edit_requested_by_name: requestedByName || null,
      edit_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.editPending) {
    throw new Error("account_edit_not_pending");
  }

  const email = (account.pendingEmail || account.email).trim().toLowerCase();
  const password = account.pendingPassword ?? account.password ?? "";
  const role = account.pendingRole ? normalizeRole(account.pendingRole) : account.role;

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      email,
      password,
      role,
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  const employees = await getEmployees();
  const employee = approved.employeeId
    ? employees.find((item) => item.id === approved.employeeId)
    : undefined;
  await syncPharmacyLoginAccountToUser(approved, { name: employee?.name }).catch(() => undefined);

  return approved;
}

export async function rejectPharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("edit_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitPharmacyLoginAccountLinkRequest(
  id: string,
  requestedBy?: string,
  requestedByName?: string
) {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }
  if (account.linkRequestPending) {
    throw new Error("link_request_already_pending");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: true,
      link_requested_by: requestedBy || null,
      link_requested_by_name: requestedByName || null,
      link_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.linkRequestPending) {
    throw new Error("link_request_not_pending");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }

  const employees = await getEmployees();
  const employee = account.employeeId
    ? employees.find((item) => item.id === account.employeeId)
    : undefined;

  await syncPharmacyLoginAccountToUser(account, { name: employee?.name });

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function rejectPharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("link_request_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePharmacyLoginAccount(
  id: string,
  updates: Partial<
    Pick<PharmacyLoginAccount, "email" | "password" | "role" | "employeeId" | "isActive" | "status">
  >
) {
  const payload = toSnakeCase({
    ...updates,
    email: updates.email?.trim().toLowerCase(),
    role: updates.role ? normalizeRole(updates.role) : undefined,
    updatedAt: new Date().toISOString(),
  });
  if (updates.role === undefined) {
    delete payload.role;
  }

  const { error } = await supabase.from("pharmacy_login_accounts").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyLoginAccount(id: string) {
  const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function assignPharmacyLoginAccountToEmployee(
  accountId: string | null,
  employeeId: string | null,
  pharmacyId: string
) {
  if (employeeId) {
    await supabase
      .from("pharmacy_login_accounts")
      .update({ employee_id: null, updated_at: new Date().toISOString() })
      .eq("pharmacy_id", pharmacyId)
      .eq("employee_id", employeeId);
  }

  if (!accountId) return;

  const { data: account, error: loadError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (loadError || !account) {
    throw new Error("login_account_not_found");
  }

  const catalogAccount = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(account));
  if (catalogAccount.status !== "approved") {
    throw new Error("login_account_not_approved");
  }

  if (account.employee_id && account.employee_id !== employeeId) {
    throw new Error("login_account_already_assigned");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      employee_id: employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  if (employeeId) {
    const employees = await getEmployees();
    const employee = employees.find((item) => item.id === employeeId);
    await syncPharmacyLoginAccountToUser(
      { ...catalogAccount, employeeId },
      { name: employee?.name }
    ).catch(() => undefined);
  } else {
    await syncPharmacyLoginAccountToUser(catalogAccount).catch(() => undefined);
  }
}

export async function createPharmacyLoginAccountFromRequest(
  request: LoginAccountRequest,
  password?: string
): Promise<PharmacyLoginAccount> {
  const existing = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("pharmacy_id", request.pharmacyId)
    .eq("email", request.email.trim().toLowerCase())
    .maybeSingle();

  if (existing.data?.id) {
    const { data } = await supabase
      .from("pharmacy_login_accounts")
      .select("*")
      .eq("id", existing.data.id)
      .single();
    return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
  }

  return createPharmacyLoginAccount({
    pharmacyId: request.pharmacyId,
    email: request.email,
    password: password || request.password || "",
    role: request.role,
    employeeId: request.employeeId,
  });
}

export async function createPharmacy(data: CreatePharmacyInput) {
  const organizationId = data.organizationId || `org-${data.id}`;
  const orgName = data.name || data.id;
  const subscriptionTier = parseSubscriptionTier(data.subscriptionTier);
  const tierConfig = getSubscriptionTier(subscriptionTier);
  const maxBranches = Math.max(
    1,
    Math.floor(Number(data.maxBranches) || tierConfig.maxBranches)
  );

  await supabase
    .from("organizations")
    .upsert(
      {
        id: organizationId,
        name: orgName,
        max_branches: maxBranches,
        subscription_tier: subscriptionTier,
      },
      { onConflict: "id" }
    );

  const payload = toSnakeCase({
    id: data.id,
    name: data.name,
    name_en: data.name_en || data.name,
    phone: data.phone || "",
    address: data.address || "",
    currency: data.currency || "ج.م",
    isActive: true,
    organizationId,
    maxBranches,
    subscriptionTier,
    subscriptionPlan: data.subscriptionPlan || "monthly",
    subscriptionStatus: data.subscriptionStatus || "active",
  });
  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

async function resolveOrganizationIdForScope(pharmacyId: string): Promise<string> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("organization_id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error || !data?.organization_id) {
    return `org-${pharmacyId}`;
  }
  return String(data.organization_id);
}

/** @deprecated use createPharmacy — kept for branch UI compatibility */
export async function createPharmacyBranch(branch: Partial<PharmacySettings> & { id: string }) {
  const scopeId = resolveStampPharmacyId();
  const organizationId = await resolveOrganizationIdForScope(scopeId);
  const pharmacies = await getPharmacies();
  const branchCount = pharmacies.filter((row) => row.organizationId === organizationId).length;
  const maxBranches =
    pharmacies.find((row) => row.organizationId === organizationId)?.maxBranches ?? 1;
  if (branchCount >= maxBranches) {
    throw new Error("branch_limit_reached");
  }
  return createPharmacy({
    id: branch.id,
    name: branch.name || branch.id,
    name_en: branch.name_en,
    phone: branch.phone,
    address: branch.address,
    currency: branch.currency,
    organizationId,
  });
}

export async function copyPharmacySettingsFromBranch(
  sourceBranchId: string,
  targetBranchId: string
) {
  if (!sourceBranchId || sourceBranchId === targetBranchId) return;

  const source = await getPharmacySettings(sourceBranchId);
  if (!source) {
    throw new Error("source_branch_not_found");
  }

  await updatePharmacySettings(targetBranchId, extractCopyableBranchSettings(source));
}

export async function updatePharmacyStatus(
  pharmacyId: string,
  status: { isActive?: boolean; subscriptionStatus?: string; subscriptionPlan?: string }
) {
  const payload = toSnakeCase({ id: pharmacyId, ...status });
  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function linkPharmacyUser(params: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
}) {
  const { error } = await supabase.from("users").insert([
    {
      uid: params.uid,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createPharmacyUser(params: CreatePharmacyUserInput): Promise<string> {
  if (params.uid) {
    await linkPharmacyUser({
      uid: params.uid,
      name: params.name,
      email: params.email,
      role: params.role,
      pharmacyId: params.pharmacyId,
    });
    return params.uid;
  }
  if (!params.password) {
    throw new Error("password_required");
  }
  return createSystemUser({
    email: params.email,
    password: params.password,
    name: params.name,
    role: params.role,
    pharmacyId: params.pharmacyId,
  });
}

export async function deletePharmacy(id: string) {
  const { error } = await supabase.from("pharmacies").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

// Cross-branch availability: looks up the same medicine across ALL branches,
// intentionally ignoring the active-branch filter. Matches by barcode when
// available, otherwise by name.
export async function getBranchAvailability(medicine: Partial<Medicine>): Promise<
  Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>
> {
  let query = supabase.from("medicines").select("pharmacy_id, qty, expiry, price");

  if (isSuperAdmin(currentAppUser)) {
    if (activePharmacyId && activePharmacyId !== ALL_BRANCHES_ID) {
      query = query.eq("pharmacy_id", activePharmacyId);
    }
  } else if (shouldQueryAllOrganizationBranches(currentAppUser)) {
    if (organizationBranchIds.length === 1) {
      query = query.eq("pharmacy_id", organizationBranchIds[0]);
    } else if (organizationBranchIds.length > 1 && query.in) {
      query = query.in("pharmacy_id", organizationBranchIds);
    }
  } else {
    const scopeId = activePharmacyId || currentAppUser?.pharmacyId;
    if (scopeId && scopeId !== ALL_BRANCHES_ID) {
      query = query.eq("pharmacy_id", scopeId);
    }
  }

  const barcode = (medicine.barcode || "").trim();
  if (barcode) {
    query = query.eq("barcode", barcode);
  } else {
    const orParts: string[] = [];
    if (medicine.name_ar) orParts.push(`name_ar.eq.${medicine.name_ar}`);
    if (medicine.name_en) orParts.push(`name_en.eq.${medicine.name_en}`);
    if (orParts.length === 0) return [];
    query = query.or(orParts.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("getBranchAvailability error:", error.message);
    return [];
  }

  const totals = new Map<string, { pharmacyId: string; qty: number; expiry?: string; price?: number }>();
  for (const row of data || []) {
    const pharmacyId = (row as any).pharmacy_id || "main";
    const existing = totals.get(pharmacyId);
    if (existing) {
      existing.qty += Number((row as any).qty) || 0;
    } else {
      totals.set(pharmacyId, {
        pharmacyId,
        qty: Number((row as any).qty) || 0,
        expiry: (row as any).expiry || undefined,
        price: Number((row as any).price) || undefined,
      });
    }
  }

  return Array.from(totals.values());
}

function buildBranchTransferNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TR-${stamp}-${random}`;
}

function parseBranchTransferRpcError(message: string): string {
  const known = [
    "branch_required",
    "same_branch",
    "empty_items",
    "medicine_not_found",
    "insufficient_stock",
    "transfer_not_found",
    "not_pending",
    "not_authorized",
    "invalid_quantity",
    "transfer_number_required",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message;
}

function normalizeBranchTransferRpcRows(data: unknown): BranchStockTransfer[] {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => toCamelCase<BranchStockTransfer>(row as Record<string, unknown>));
}

export async function getBranchStockTransfers(limit = 50): Promise<BranchStockTransfer[]> {
  const branchIds = organizationBranchIds.length > 0 ? organizationBranchIds : [];
  let query = supabase
    .from("branch_stock_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!isSuperAdmin(currentAppUser) && branchIds.length > 0) {
    query = query.or(
      `from_pharmacy_id.in.(${branchIds.join(",")}),to_pharmacy_id.in.(${branchIds.join(",")})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("getBranchStockTransfers error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}

export async function executeBranchStockTransfer(params: {
  fromPharmacyId: string;
  toPharmacyId: string;
  medicineId: number;
  quantity: number;
  notes?: string;
  userId?: string;
  userName?: string;
}): Promise<BranchStockTransfer> {
  const [record] = await executeBranchStockTransferBatch({
    fromPharmacyId: params.fromPharmacyId,
    toPharmacyId: params.toPharmacyId,
    items: [{ medicineId: params.medicineId, quantity: params.quantity }],
    notes: params.notes,
    userId: params.userId,
    userName: params.userName,
  });
  return record;
}

export async function executeBranchStockTransferBatch(params: {
  fromPharmacyId: string;
  toPharmacyId: string;
  items: Array<{ medicineId: number; quantity: number }>;
  notes?: string;
  userId?: string;
  userName?: string;
  requireApproval?: boolean;
}): Promise<BranchStockTransfer[]> {
  if (!params.fromPharmacyId || !params.toPharmacyId) {
    throw new Error("branch_required");
  }
  if (params.fromPharmacyId === params.toPharmacyId) {
    throw new Error("same_branch");
  }

  const normalizedItems = params.items
    .map((item) => ({
      medicineId: Number(item.medicineId),
      quantity: Math.floor(Number(item.quantity)),
    }))
    .filter((item) => item.medicineId > 0 && item.quantity > 0);

  if (normalizedItems.length === 0) {
    throw new Error("empty_items");
  }

  const mergedByMedicine = new Map<number, number>();
  for (const item of normalizedItems) {
    mergedByMedicine.set(item.medicineId, (mergedByMedicine.get(item.medicineId) || 0) + item.quantity);
  }
  const items = Array.from(mergedByMedicine.entries()).map(([medicineId, quantity]) => ({
    medicineId,
    quantity,
  }));

  const transferNumber = buildBranchTransferNumber();
  const { data, error } = await supabase.rpc("execute_branch_stock_transfer_batch", {
    p_from_pharmacy_id: params.fromPharmacyId,
    p_to_pharmacy_id: params.toPharmacyId,
    p_items: items.map((item) => ({
      medicine_id: item.medicineId,
      quantity: item.quantity,
    })),
    p_transfer_number: transferNumber,
    p_notes: params.notes?.trim() || null,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
    p_require_approval: Boolean(params.requireApproval),
  });

  if (error) {
    throw new Error(parseBranchTransferRpcError(error.message));
  }

  return normalizeBranchTransferRpcRows(data);
}

export async function approveBranchStockTransferBatch(params: {
  transferNumber: string;
  userId?: string;
  userName?: string;
}): Promise<BranchStockTransfer[]> {
  const { data, error } = await supabase.rpc("approve_branch_stock_transfer_batch", {
    p_transfer_number: params.transferNumber,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
  });

  if (error) {
    throw new Error(parseBranchTransferRpcError(error.message));
  }

  return normalizeBranchTransferRpcRows(data);
}

export async function rejectBranchStockTransferBatch(params: {
  transferNumber: string;
  userId?: string;
  userName?: string;
  rejectionReason?: string;
}): Promise<BranchStockTransfer[]> {
  const rows = await getBranchStockTransferLines(params.transferNumber);
  if (rows.length === 0) {
    throw new Error("transfer_not_found");
  }
  if (rows.some((row) => row.status !== "pending")) {
    throw new Error("not_pending");
  }

  const { data, error } = await supabase
    .from("branch_stock_transfers")
    .update(
      toSnakeCase({
        status: "rejected",
        reviewedBy: params.userId,
        reviewedByName: params.userName,
        reviewedAt: new Date().toISOString(),
        rejectionReason: params.rejectionReason?.trim() || null,
      })
    )
    .eq("transfer_number", params.transferNumber)
    .eq("status", "pending")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}

async function getBranchStockTransferLines(transferNumber: string): Promise<BranchStockTransfer[]> {
  const { data, error } = await supabase
    .from("branch_stock_transfers")
    .select("*")
    .eq("transfer_number", transferNumber)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}

export async function getAllSystemUsers(): Promise<SystemUser[]> {
  if (!isSuperAdmin(currentAppUser)) {
    return [];
  }
  const { data, error } = await supabase.from("users").select("*").order("email", { ascending: true });
  if (error) {
    console.error("getAllSystemUsers error:", error.message);
    return [];
  }
  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export async function getSystemUsers(pharmacyId: string): Promise<SystemUser[]> {
  const rows = await getRows<SystemUser>("users", "uid", false, 100, {
    column: "pharmacy_id",
    value: pharmacyId,
  });
  return rows.map((row) => normalizeAppUser(row));
}

export async function getSystemUsersForPharmacies(pharmacyIds: string[]): Promise<SystemUser[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getSystemUsers(ids[0]);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("pharmacy_id", ids)
    .order("uid", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getSystemUsersForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export function subscribeUsers(pharmacyId: string, callback: (users: SystemUser[]) => void) {
  return subscribeTable<SystemUser>(
    "users",
    (rows) => callback(rows.map((row) => normalizeAppUser(row))),
    "uid",
    false,
    100,
    {
      column: "pharmacy_id",
      value: pharmacyId,
    }
  );
}

export async function updateSystemUser(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase(updates);
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function validateNewUserEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return "invalid_format";
  }
  return null;
}

export async function createSystemUser(params: {
  email: string;
  password: string;
  name: string;
  role: AppUser["role"];
  pharmacyId: string;
  employeeId?: string;
  username?: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const role = normalizeRole(params.role);

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  const ephemeral = createEphemeralSupabase();

  const { data: authData, error: authError } = await ephemeral.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name.trim(),
        role,
        pharmacy_id: params.pharmacyId,
      },
    },
  });

  if (authError) {
    const code = (authError as { code?: string }).code || "";
    if (code === "email_address_invalid") {
      throw new Error("email_domain_rejected");
    }
    if (code === "email_address_not_authorized") {
      throw new Error("email_not_authorized");
    }
    if (code === "over_email_send_rate_limit") {
      throw new Error("over_email_send_rate_limit");
    }
    throw new Error(authError.message);
  }

  const uid = authData.user?.id;
  if (!uid) {
    throw new Error("auth_pending_confirmation");
  }

  const { error: insertError } = await supabase.from("users").insert([
    {
      uid,
      employee_id: params.employeeId || null,
      username: params.username?.trim() || null,
      name: params.name.trim(),
      email,
      role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);

  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    throw new Error(insertError.message);
  }

  if (insertError?.message.toLowerCase().includes("duplicate") && params.employeeId) {
    await linkUserToEmployee(uid, params.employeeId);
  }

  return uid;
}

export async function registerPublicUser(params: {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const pharmacyName = params.pharmacyName.trim();
  const password = params.password;

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  if (!name) {
    throw new Error("name_required");
  }

  if (pharmacyName.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  if (!password || password.length < 6) {
    throw new Error("password_too_short");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "pharmacy_admin",
        signup_type: "trial_pharmacy",
        pharmacy_name: pharmacyName,
      },
    },
  });

  if (authError) {
    const code = (authError as { code?: string }).code || "";
    if (code === "email_address_invalid") {
      throw new Error("email_domain_rejected");
    }
    if (code === "email_address_not_authorized") {
      throw new Error("email_not_authorized");
    }
    if (code === "over_email_send_rate_limit") {
      throw new Error("over_email_send_rate_limit");
    }
    throw new Error(authError.message);
  }

  if (!authData.user?.id) {
    throw new Error("auth_pending_confirmation");
  }

  if (authData.session) {
    await provisionTrialPharmacy(pharmacyName);
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
}

export async function sendPasswordResetEmail(email: string) {
  const base = import.meta.env.BASE_URL || "/";
  const redirectTo = `${window.location.origin}${base}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSystemUser(uid: string) {
  const { error } = await supabase.from("users").delete().eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function unlinkLoginAccountFromSystem(
  uid: string,
  accountId?: string,
  revokedBy?: string
) {
  const { error } = await supabase.rpc("revoke_user_app_access", {
    p_uid: uid,
    p_account_id: accountId || null,
    p_revoked_by: revokedBy || null,
    p_reason: "unlink",
  });

  if (error) {
    if (error.message.includes("revoke_user_app_access") && error.message.includes("does not exist")) {
      throw new Error("revoke_rpc_not_configured");
    }
    throw new Error(error.message);
  }
}

export function subscribeUserAccessRevocation(uid: string, onRevoked: () => void) {
  const channel = supabase
    .channel(`user-access-revoke-${uid}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_session_revocations",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked()
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "user_session_revocations",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked()
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "users",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked()
    );

  void channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function isAppUserStillActive(uid: string): Promise<boolean> {
  const user = await getAppUserByUid(uid);
  return Boolean(user?.isActive);
}

export async function saveCustomerPayment(payment: CustomerPayment) {
  const payload = stampPharmacy(toSnakeCase(payment));
  const { error } = await supabase.from("customer_payments").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCustomerPayment(paymentNumber: string) {
  const { error } = await supabase
    .from("customer_payments")
    .delete()
    .eq("payment_number", paymentNumber);

  if (error) {
    throw new Error(error.message);
  }
}

function preparePurchasePayload(purchase: PurchaseRecord): Record<string, any> {
  const medicineNameAr = purchase.medicineName_ar || "";
  const medicineNameEn = purchase.medicineName_en || "";
  const medicineName = medicineNameAr || medicineNameEn || "—";

  return stampPharmacy({
    id: purchase.id,
    purchase_number: purchase.purchaseNumber,
    medicine_id: purchase.medicineId,
    medicine_name: medicineName,
    medicine_name_ar: medicineNameAr,
    medicine_name_en: medicineNameEn,
    barcode: purchase.barcode || "",
    quantity: purchase.quantity,
    buy_price: purchase.buyPrice ?? 0,
    sell_price: purchase.sellPrice ?? 0,
    total_cost: purchase.totalCost ?? 0,
    supplier_name: purchase.supplierName || "",
    notes: purchase.notes || "",
    pharmacy_id: purchase.pharmacyId,
    user_id: purchase.userId || "",
    user_name: purchase.userName || "",
    date: purchase.date || new Date().toLocaleString(),
    created_at: purchase.createdAt || new Date().toISOString(),
  });
}

export async function createPurchase(purchase: PurchaseRecord) {
  const payload = preparePurchasePayload(purchase);
  const { error } = await supabase.from("purchases").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

function prepareReturnPayload(returnRecord: ReturnRecord): Record<string, any> {
  const returnDate = returnRecord.date || new Date().toLocaleString();
  const normalizedItems = (returnRecord.items || [])
    .map((item) => {
      const medicineId = resolveMedicineIdValue(
        item.medicineId ?? (item as { medicine_id?: number | string }).medicine_id ?? 0
      );
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? (item as { unit_price?: number }).unit_price ?? 0);
      const lineTotal = Number(item.lineTotal ?? unitPrice * quantity);

      return {
        medicine_id: medicineId,
        name_ar: item.name_ar || "",
        name_en: item.name_en || "",
        barcode: item.barcode || "",
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        buy_price: Number(item.buyPrice ?? 0),
        cost_total: Number(item.costTotal ?? 0),
        profit: Number(item.profit ?? 0),
      };
    })
    .filter((item) => item.quantity > 0);

  return stampPharmacy({
    id: returnRecord.id ?? Date.now(),
    return_number: returnRecord.returnNumber,
    invoice_number: returnRecord.invoiceNumber,
    original_invoice_id: returnRecord.originalInvoiceId,
    user_id: returnRecord.userId || "",
    user_name: returnRecord.userName || "",
    date: returnDate,
    created_at: returnRecord.createdAt || new Date().toISOString(),
    items: normalizedItems,
    total: returnRecord.total ?? 0,
    reason: returnRecord.reason || null,
    refund_method: returnRecord.refundMethod || null,
    is_instant: Boolean(returnRecord.isInstant),
  });
}

export async function createReturn(returnRecord: ReturnRecord) {
  const payload = prepareReturnPayload(returnRecord);
  const { error } = await supabase.from("returns").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteReturn(id: number | string) {
  const { error } = await supabase.from("returns").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// --- Held invoices (POS) ---

export type HoldInvoiceInput = {
  holdNumber: string;
  customerName?: string;
  customerPhone?: string;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  createdBy?: string;
  createdByName?: string;
};

export async function holdInvoice(data: HoldInvoiceInput): Promise<HeldInvoice> {
  const payload = stampPharmacy(
    toSnakeCase({
      holdNumber: data.holdNumber,
      customerName: data.customerName || "",
      customerPhone: data.customerPhone || "",
      cartItems: data.cartItems,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax ?? 0,
      total: data.total,
      paymentMethod: data.paymentMethod,
      status: "held",
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      updatedAt: new Date().toISOString(),
    })
  );

  const { data: row, error } = await supabase
    .from("held_invoices")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    if (
      error.message.includes("held_invoices") &&
      (error.message.includes("does not exist") || error.code === "42P01")
    ) {
      throw new Error("held_invoices_table_missing");
    }
    throw new Error(error.message);
  }

  return normalizeHeldInvoice(row);
}

function normalizeHeldInvoice(row: Record<string, any>): HeldInvoice {
  const held = toCamelCase<HeldInvoice>(row);
  let items = held.cartItems ?? row.cart_items;

  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }

  held.cartItems = Array.isArray(items) ? items : [];
  held.status = (held.status || row.status || "held") as HeldInvoice["status"];
  held.id = String(held.id || row.id || "");
  held.holdNumber = held.holdNumber || row.hold_number || "";
  held.discount = Number(held.discount ?? row.discount ?? 0);
  held.total = Number(held.total ?? row.total ?? 0);
  held.subtotal = Number(held.subtotal ?? row.subtotal ?? held.total);
  held.paymentMethod = (held.paymentMethod || row.payment_method || "cash") as HeldInvoice["paymentMethod"];

  return held;
}

export async function getHeldInvoices(pharmacyId?: string): Promise<HeldInvoice[]> {
  const scopeId = resolveHeldInvoicesPharmacyId(pharmacyId);

  let query = supabase.from("held_invoices").select("*").eq("status", "held");

  if (!(isSuperAdmin(currentAppUser) && !pharmacyId && !activePharmacyId)) {
    query = query.eq("pharmacy_id", scopeId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("getHeldInvoices error:", error.message);
    if (
      error.message.includes("held_invoices") &&
      (error.message.includes("does not exist") || error.code === "42P01")
    ) {
      throw new Error("held_invoices_table_missing");
    }
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizeHeldInvoice(row));
}

export async function getHeldInvoiceById(id: string): Promise<HeldInvoice | null> {
  if (!id) return null;

  const { data, error } = await supabase.from("held_invoices").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("getHeldInvoiceById error:", error.message);
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return normalizeHeldInvoice(data);
}

export async function updateHeldInvoiceStatus(id: string, status: string) {
  const payload: Record<string, string> = { status };
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase.from("held_invoices").update(payload).eq("id", id);

  if (error) {
    if (error.message.includes("updated_at")) {
      const { error: retryError } = await supabase
        .from("held_invoices")
        .update({ status })
        .eq("id", id);
      if (retryError) {
        throw new Error(retryError.message);
      }
      return;
    }
    throw new Error(error.message);
  }
}

export async function resumeHeldInvoice(
  id: string,
  source?: HeldInvoice | null
): Promise<HeldInvoice> {
  const invoiceId = String(id || source?.id || "").trim();
  if (!invoiceId) {
    throw new Error("held_invoice_id_missing");
  }

  let held =
    source && (source.id || source.holdNumber)
      ? normalizeHeldInvoice(source as unknown as Record<string, any>)
      : null;

  if (!held) {
    held = await getHeldInvoiceById(invoiceId);
  }

  if (!held) {
    throw new Error("held_invoice_not_found");
  }

  const status = String(held.status || "held").toLowerCase();
  if (status !== "held") {
    throw new Error("held_invoice_not_active");
  }

  await updateHeldInvoiceStatus(invoiceId, "resumed");
  held.status = "resumed";
  return held;
}

export async function deleteHeldInvoice(id: string) {
  const { error } = await supabase.from("held_invoices").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeHeldInvoices(callback: (rows: HeldInvoice[]) => void, pharmacyId?: string) {
  const channel = supabase.channel("realtime-held-invoices").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "held_invoices" },
    () => {
      void getHeldInvoices(pharmacyId)
        .then(callback)
        .catch((error) => console.error("subscribeHeldInvoices refresh error:", error));
    }
  );

  void channel.subscribe();
  return () => {
    void channel.unsubscribe();
  };
}

// --- Instant sale return (POS) ---

export async function getInvoiceById(invoiceId: number): Promise<Invoice | null> {
  let query = applyPharmacyFilter(supabase.from("invoices").select("*").eq("id", invoiceId));
  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  const invoice = toCamelCase<Invoice>(data);
  const { data: itemsData, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);

  if (itemsError) {
    invoice.items = [];
    return invoice;
  }

  invoice.items = (itemsData || []).map((row) => toCamelCase<InvoiceItem>(row));
  return invoice;
}

function invoiceHasBarcode(invoice: Invoice, barcode: string) {
  const clean = barcode.trim();
  if (!clean) return false;
  return (invoice.items || []).some(
    (item) => String(item.barcode ?? "").trim() === clean
  );
}

export async function searchInvoicesForReturnByBarcode(barcode: string): Promise<Invoice[]> {
  const clean = barcode.trim();
  if (!clean) return [];

  const invoices = await getInvoices(300);
  return invoices.filter((invoice) => invoiceHasBarcode(invoice, clean)).slice(0, 20);
}

export async function searchInvoiceForReturn(queryText: string): Promise<Invoice[]> {
  const q = queryText.trim().toLowerCase();
  if (!q) return [];

  const invoices = await getInvoices(200);
  const matches = invoices.filter((invoice) => {
    const number = (invoice.invoiceNumber || "").toLowerCase();
    const customer = (invoice.customerName || "").toLowerCase();
    const phone = (invoice.customerPhone || "").toLowerCase();
    const barcodeMatch = (invoice.items || []).some((item) =>
      (item.barcode || "").toLowerCase().includes(q)
    );
    const nameMatch = (invoice.items || []).some((item) => {
      const ar = (item.name_ar || "").toLowerCase();
      const en = (item.name_en || "").toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
    return (
      number.includes(q) ||
      customer.includes(q) ||
      phone.includes(q) ||
      barcodeMatch ||
      nameMatch
    );
  });

  return matches.slice(0, 20);
}

export async function getInvoiceItemsForReturn(invoiceId: number): Promise<InvoiceItem[]> {
  const invoice = await getInvoiceById(invoiceId);
  return invoice?.items || [];
}

export async function calculateAvailableReturnQuantity(
  invoiceNumber: string,
  medicineId: number,
  soldQuantity: number
): Promise<number> {
  const allReturns = await getReturns();
  const alreadyReturned = allReturns
    .filter((r) => r.invoiceNumber === invoiceNumber)
    .flatMap((r) => r.items || [])
    .filter((item) => item.medicineId === medicineId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  return Math.max(0, soldQuantity - alreadyReturned);
}

export async function createInstantSaleReturn(
  input: InstantSaleReturnInput
): Promise<{ returnRecord: ReturnRecord; returnTotal: number }> {
  const selectedItems = input.items.filter((item) => item.quantity > 0);
  if (selectedItems.length === 0) {
    throw new Error("no_return_items");
  }

  for (const item of selectedItems) {
    const original = input.invoice.items?.find((i) => i.medicineId === item.medicineId);
    if (!original) {
      throw new Error("item_not_in_invoice");
    }
    const available = await calculateAvailableReturnQuantity(
      input.invoice.invoiceNumber,
      item.medicineId,
      original.quantity
    );
    if (item.quantity > available) {
      throw new Error(`qty_exceeds_available:${item.medicineId}:${available}`);
    }
  }

  const returnId = Date.now();
  const returnNumber = `RET-${returnId}`;
  const returnItems = selectedItems.map((item) => ({
    medicineId: item.medicineId,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.unitPrice * item.quantity,
    buyPrice: item.buyPrice || 0,
    costTotal: (item.buyPrice || 0) * item.quantity,
    profit: item.unitPrice * item.quantity - (item.buyPrice || 0) * item.quantity,
  }));

  const returnTotal = returnItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const returnRecord: ReturnRecord = {
    id: returnId,
    returnNumber,
    invoiceNumber: input.invoice.invoiceNumber,
    originalInvoiceId: input.invoice.id,
    pharmacyId: input.invoice.pharmacyId,
    userId: input.userId,
    userName: input.userName,
    date: new Date().toLocaleString(),
    createdAt: new Date().toISOString(),
    items: returnItems,
    total: returnTotal,
    reason: input.reason,
    refundMethod: input.refundMethod,
    isInstant: true,
  };

  const currentMedicines = await getMedicines();

  for (const item of returnItems) {
    const currentMedicine = currentMedicines.find((m) => m.id === item.medicineId);
    if (!currentMedicine) {
      throw new Error("medicine_not_found");
    }
    await updateMedicineStock(item.medicineId, currentMedicine.qty + item.quantity);

    await addStockMovement({
      id: Date.now() + item.medicineId,
      type: "sale_return",
      medicineId: item.medicineId,
      medicineName_ar: item.name_ar,
      medicineName_en: item.name_en,
      barcode: item.barcode,
      quantityChange: item.quantity,
      qtyBefore: currentMedicine.qty,
      qtyAfter: currentMedicine.qty + item.quantity,
      invoiceNumber: input.invoice.invoiceNumber,
      returnNumber,
      pharmacyId: input.invoice.pharmacyId,
      userId: input.userId,
      userName: input.userName,
      notes: input.reason,
      createdAt: new Date().toISOString(),
    });
  }

  await createReturn(returnRecord);

  return { returnRecord, returnTotal };
}

export function applyReturnToCurrentCart(currentDiscount: number, returnAmount: number) {
  return Math.max(0, currentDiscount + returnAmount);
}

// --- HR: employee profiles, attendance, payroll ---

export function combineWorkDateTime(
  workDate: string,
  time: string,
  dayOffset = 0
): string | undefined {
  if (!time) return undefined;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  const d = new Date(`${workDate}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function isOvernightTimePair(checkInTime: string, checkOutTime: string): boolean {
  const [inH, inM] = checkInTime.split(":").map(Number);
  const [outH, outM] = checkOutTime.split(":").map(Number);
  if (!Number.isFinite(inH) || !Number.isFinite(outH)) return false;
  const inMinutes = inH * 60 + (Number.isFinite(inM) ? inM : 0);
  const outMinutes = outH * 60 + (Number.isFinite(outM) ? outM : 0);
  return outMinutes <= inMinutes;
}

export function buildAttendanceCheckInIso(workDate: string, checkInTime: string): string | undefined {
  return combineWorkDateTime(workDate, checkInTime, 0);
}

export function buildAttendanceCheckOutIso(
  workDate: string,
  checkInTime: string,
  checkOutTime: string
): string | undefined {
  if (!checkOutTime) return undefined;
  const dayOffset =
    checkInTime && isOvernightTimePair(checkInTime, checkOutTime) ? 1 : 0;
  return combineWorkDateTime(workDate, checkOutTime, dayOffset);
}

export function calcAttendanceWorkedMinutes(
  checkIn?: string,
  checkOut?: string
): number | null {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  let end = new Date(checkOut);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 86400000);
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function calcAttendanceWorkedHours(checkIn?: string, checkOut?: string): number | null {
  const minutes = calcAttendanceWorkedMinutes(checkIn, checkOut);
  return minutes === null ? null : minutes / 60;
}

function countDaysInclusive(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

function sumAttendanceWorkMinutes(
  records: Array<{ checkIn?: string; checkOut?: string }>
): number {
  return records.reduce((sum, rec) => {
    const minutes = calcAttendanceWorkedMinutes(rec.checkIn, rec.checkOut);
    return sum + (minutes ?? 0);
  }, 0);
}

export function computeHourlyRate(baseSalary: number, requiredWorkHoursPerDay = 8): number {
  const dailyHours = Math.max(1, Number(requiredWorkHoursPerDay) || 8);
  return Number(baseSalary) / 30 / dailyHours;
}

export function splitRegularAndOvertimeMinutes(
  records: Array<{ checkIn?: string; checkOut?: string }>,
  standardWorkHoursPerDay: number
): { regularMinutes: number; overtimeMinutes: number; totalMinutes: number } {
  const standardMinutes = Math.max(0, Number(standardWorkHoursPerDay) || 0) * 60;
  let regularMinutes = 0;
  let overtimeMinutes = 0;

  for (const rec of records) {
    const dayMinutes = calcAttendanceWorkedMinutes(rec.checkIn, rec.checkOut) ?? 0;
    if (standardMinutes <= 0) {
      regularMinutes += dayMinutes;
      continue;
    }
    regularMinutes += Math.min(dayMinutes, standardMinutes);
    overtimeMinutes += Math.max(0, dayMinutes - standardMinutes);
  }

  return {
    regularMinutes,
    overtimeMinutes,
    totalMinutes: regularMinutes + overtimeMinutes,
  };
}

export function computePayrollEarnedFromAttendance(
  baseSalary: number,
  records: Array<{ checkIn?: string; checkOut?: string }>,
  requiredWorkHoursPerDay: number,
  standardWorkHoursPerDay: number,
  overtimePercent: number
): { calculatedSalary: number; overtimePay: number; workMinutes: number } {
  const { regularMinutes, overtimeMinutes, totalMinutes } = splitRegularAndOvertimeMinutes(
    records,
    standardWorkHoursPerDay
  );
  const hourlyRate = computeHourlyRate(baseSalary, requiredWorkHoursPerDay);
  const calculatedSalary = Math.round(hourlyRate * (regularMinutes / 60) * 100) / 100;
  const overtimePay =
    overtimeMinutes > 0
      ? Math.round(hourlyRate * (overtimePercent / 100) * (overtimeMinutes / 60) * 100) / 100
      : 0;

  return { calculatedSalary, overtimePay, workMinutes: totalMinutes };
}

export function computeEmployeeOvertimeIncentives(
  baseSalary: number,
  records: Array<{ checkIn?: string; checkOut?: string }>,
  requiredWorkHoursPerDay: number,
  overtimePercent: number
) {
  const dailyHours = Math.max(1, Number(requiredWorkHoursPerDay) || 8);
  const split = splitRegularAndOvertimeMinutes(records, dailyHours);
  const earned = computePayrollEarnedFromAttendance(
    baseSalary,
    records,
    dailyHours,
    dailyHours,
    overtimePercent
  );
  const hourlyRate = computeHourlyRate(baseSalary, dailyHours);
  return {
    regularMinutes: split.regularMinutes,
    overtimeMinutes: split.overtimeMinutes,
    totalMinutes: split.totalMinutes,
    overtimePay: earned.overtimePay,
    hourlyRate,
    overtimePercent,
  };
}

export function computeEarnedSalary(
  baseSalary: number,
  workMinutes: number,
  requiredWorkHoursPerDay = 8
): number {
  const hourlyRate = computeHourlyRate(baseSalary, requiredWorkHoursPerDay);
  const workHours = Math.max(0, Number(workMinutes) || 0) / 60;
  return Math.round(hourlyRate * workHours * 100) / 100;
}

export function sumPayrollAdditions(record: Partial<PayrollRecord>): number {
  return (
    Number(record.specialAllowances ?? 0) +
    Number(record.bonuses ?? 0) +
    Number(record.incentives ?? 0) +
    Number(record.commission ?? 0)
  );
}

export function filterAttendanceForEmployee(
  attendance: Array<{ userId: string }>,
  userId: string,
  employeeId?: string
) {
  return attendance.filter(
    (row) => row.userId === userId || (employeeId ? row.userId === employeeId : false)
  );
}

export function computePayrollNet(record: Partial<PayrollRecord>): number {
  const calculatedSalary = Number(record.calculatedSalary ?? 0);
  const additions = sumPayrollAdditions(record);
  const deductions = Number(record.deductions ?? 0);
  const taxes = Number(record.taxes ?? 0);
  const insurance = Number(record.insurance ?? 0);
  return Math.round((calculatedSalary + additions - deductions - taxes - insurance) * 100) / 100;
}

export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  return getRows<EmployeeProfile>("employee_profiles", "user_name", false, 500, undefined, true);
}

export async function upsertEmployeeProfile(
  profile: Partial<EmployeeProfile> & { userId: string; userName: string }
) {
  const id = profile.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...profile,
      id,
      baseSalary: Number(profile.baseSalary ?? 0),
      updatedAt: new Date().toISOString(),
    })
  );
  const { error } = await supabase
    .from("employee_profiles")
    .upsert([payload], { onConflict: "pharmacy_id,user_id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getAttendanceRecords(
  fromDate: string,
  toDate: string,
  pharmacyIds?: string[]
): Promise<AttendanceRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("attendance_records").select("*"), pharmacyIds)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("getAttendanceRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<AttendanceRecord>(row));
}

export async function upsertAttendanceRecord(
  record: Partial<AttendanceRecord> & { userId: string; userName: string; workDate: string }
) {
  const id = record.id ?? Date.now();
  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      status: record.status || "present",
      updatedAt: new Date().toISOString(),
    })
  );
  const { error } = await supabase
    .from("attendance_records")
    .upsert([payload], { onConflict: "pharmacy_id,user_id,work_date" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAttendanceRecord(id: number) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

async function getAttendanceForDay(userId: string, workDate: string): Promise<AttendanceRecord | null> {
  let query = applyPharmacyFilter(
    supabase.from("attendance_records").select("*").eq("user_id", userId).eq("work_date", workDate)
  );
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<AttendanceRecord>(data);
}

export async function recordCheckIn(
  userId: string,
  userName: string,
  workDate?: string,
  options?: {
    expectedSchedule?: WorkSchedule;
    shiftId?: ShiftId;
    graceMinutes?: number;
  }
) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (existing?.checkIn) {
    throw new Error("already_checked_in");
  }

  const checkIn = new Date().toISOString();
  let status: AttendanceStatus =
    existing?.status && existing.status !== "absent" ? existing.status : "present";

  if (
    options?.expectedSchedule &&
    isCheckInLate(
      checkIn,
      options.expectedSchedule,
      options.graceMinutes ?? DEFAULT_ALLOWED_LATE_MINUTES
    )
  ) {
    status = "late";
  }

  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate: date,
    checkIn,
    status,
    shiftId: options?.shiftId ?? existing?.shiftId,
  });
}

export async function recordCheckOut(userId: string, userName: string, workDate?: string) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  const existing = await getAttendanceForDay(userId, date);
  if (!existing?.checkIn) {
    throw new Error("check_in_required");
  }
  if (existing.checkOut) {
    throw new Error("already_checked_out");
  }
  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate: date,
    checkOut: new Date().toISOString(),
  });
}

export async function setAttendanceStatus(
  userId: string,
  userName: string,
  workDate: string,
  status: AttendanceStatus,
  notes?: string
) {
  const existing = await getAttendanceForDay(userId, workDate);
  await upsertAttendanceRecord({
    ...existing,
    userId,
    userName,
    workDate,
    status,
    notes: notes ?? existing?.notes,
    checkIn: status === "absent" || status === "leave" || status === "sick" ? undefined : existing?.checkIn,
    checkOut: status === "absent" || status === "leave" || status === "sick" ? undefined : existing?.checkOut,
  });
}

export async function getPayrollRecords(
  periodStart: string,
  periodEnd: string,
  pharmacyIds?: string[]
): Promise<PayrollRecord[]> {
  let query = applyPharmacyScopeFilter(supabase.from("payroll_records").select("*"), pharmacyIds)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .order("user_name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("getPayrollRecords error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<PayrollRecord>(row));
}

export async function upsertPayrollRecord(
  record: Partial<PayrollRecord> & { userId: string; periodStart: string; periodEnd: string }
) {
  const calculatedSalary = Number(record.calculatedSalary ?? 0);
  const bonuses = Number(record.bonuses ?? 0);
  const deductions = Number(record.deductions ?? 0);
  const netPay = Number(record.netPay ?? computePayrollNet(record));
  const id = record.id ?? Date.now();

  const payload = stampPharmacy(
    toSnakeCase({
      ...record,
      id,
      calculatedSalary,
      bonuses,
      deductions,
      netPay,
      updatedAt: new Date().toISOString(),
    })
  );

  const { error } = await supabase.from("payroll_records").upsert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePayrollRecord(id: number, updates: Partial<PayrollRecord>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  if (updates.netPay === undefined) {
    const financialKeys: (keyof PayrollRecord)[] = [
      "calculatedSalary",
      "specialAllowances",
      "bonuses",
      "incentives",
      "commission",
      "deductions",
      "taxes",
      "insurance",
    ];
    if (financialKeys.some((key) => updates[key] !== undefined)) {
      payload.net_pay = computePayrollNet(updates as Partial<PayrollRecord>);
    }
  }
  const { error } = await supabase.from("payroll_records").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function generatePayroll(
  periodStart: string,
  periodEnd: string,
  employees: Array<{ uid: string; name: string; isActive?: boolean; salary?: number }>,
  options: {
    sickDeductionPercent?: number;
    absentDeductionPercent?: number;
    maxLeaveDays?: number;
    standardWorkHours?: number;
    overtimePercent?: number;
    defaultTaxes?: number;
    defaultInsurance?: number;
    workShifts?: PharmacyShift[];
    defaultShiftId?: ShiftId;
  } = {}
): Promise<PayrollRecord[]> {
  const dbEmployees = await getEmployees();
  const profiles = await getEmployeeProfiles();
  const attendance = await getAttendanceRecords(periodStart, periodEnd);
  const existingPayroll = await getPayrollRecords(periodStart, periodEnd);
  const periodInvoices = await getInvoicesForPeriod(periodStart, periodEnd);
  const workingDays = countDaysInclusive(periodStart, periodEnd);
  const sickPct = Number(options.sickDeductionPercent ?? 25);
  const absentPct = Number(options.absentDeductionPercent ?? 100);
  const maxLeaveDays = Math.max(0, Math.floor(Number(options.maxLeaveDays ?? PAYROLL_DEFAULTS.maxLeaveDays)));
  const standardWorkHours = Math.max(0, Number(options.standardWorkHours ?? PAYROLL_DEFAULTS.standardWorkHours));
  const overtimePercent = Math.max(0, Number(options.overtimePercent ?? PAYROLL_DEFAULTS.overtimePercent));
  const defaultTaxesPercent = Math.min(
    100,
    Math.max(0, Number(options.defaultTaxes ?? PAYROLL_DEFAULTS.defaultTaxes))
  );
  const defaultInsurancePercent = Math.min(
    100,
    Math.max(0, Number(options.defaultInsurance ?? PAYROLL_DEFAULTS.defaultInsurance))
  );
  const results: PayrollRecord[] = [];

  for (const emp of employees.filter((e) => e.isActive !== false)) {
    const dbEmployee =
      dbEmployees.find((e) => e.id === emp.uid) ||
      dbEmployees.find((e) => e.name === emp.name);
    const existing = existingPayroll.find(
      (p) => p.userId === emp.uid || (dbEmployee ? p.userId === dbEmployee.id : false)
    );
    if (existing && existing.status === "paid") {
      results.push(existing);
      continue;
    }

    const profile = profiles.find((p) => p.userId === emp.uid);
    const baseSalary = Number(emp.salary ?? dbEmployee?.salary ?? profile?.baseSalary ?? 0);
    const empAttendance = filterAttendanceForEmployee(
      attendance,
      emp.uid,
      dbEmployee?.id
    );
    const presentDays = empAttendance.filter(
      (a) =>
        a.status === "present" ||
        a.status === "late" ||
        (a.checkIn && a.status !== "absent" && a.status !== "leave" && a.status !== "sick")
    ).length;
    const sickDays = empAttendance.filter((a) => a.status === "sick").length;
    const rawAbsentDays = empAttendance.filter((a) => a.status === "absent").length;
    const rawLeaveDays = empAttendance.filter((a) => a.status === "leave").length;
    const leavePolicy = applyMaxLeavePolicy(rawLeaveDays, rawAbsentDays, maxLeaveDays);
    const absentDays = leavePolicy.absentDays;
    const leaveDays = leavePolicy.leaveDays;
    const requiredWorkHours = dbEmployee
      ? Math.max(
          1,
          computeWorkHoursFromSchedule(
            resolveWorkSchedule(
              dbEmployee,
              options.workShifts || PAYROLL_DEFAULTS.workShifts,
              options.defaultShiftId || "A"
            )
          ) || Number(dbEmployee.requiredWorkHours ?? 8)
        )
      : 8;
    const earned = computePayrollEarnedFromAttendance(
      baseSalary,
      empAttendance,
      requiredWorkHours,
      requiredWorkHours,
      overtimePercent
    );
    const calculatedSalary = earned.calculatedSalary;
    const workMinutesFinal = earned.workMinutes;
    const attendanceBreakdown = computeAttendanceDeductionBreakdown(
      { baseSalary, absentDays, sickDays, leaveDays },
      { absentPct, sickPct }
    );
    const autoDeductions = attendanceBreakdown.attendanceTotal;
    const specialAllowances = existing?.specialAllowances ?? 0;
    const bonuses = existing?.bonuses ?? 0;
    const incentives = earned.overtimePay;
    const commissionRate = Number(dbEmployee?.commissionRate ?? 0);
    const commission =
      commissionRate > 0
        ? computeCashierCommissionFromInvoices(
            periodInvoices,
            {
              userId: emp.uid,
              employeeId: dbEmployee?.id,
              userName: emp.name,
            },
            commissionRate,
            { periodStart, periodEnd }
          ).commission
        : existing?.commission ?? 0;
    const draftForTax: Partial<PayrollRecord> = {
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
    };
    const { taxes, insurance } = computeTaxInsuranceFromPercent(
      draftForTax,
      defaultTaxesPercent,
      defaultInsurancePercent
    );
    const deductions = autoDeductions;
    const draftRecord: PayrollRecord = {
      id: existing?.id ?? Date.now() + results.length,
      userId: emp.uid,
      userName: emp.name,
      periodStart,
      periodEnd,
      workingDays,
      presentDays,
      absentDays,
      sickDays,
      leaveDays,
      workMinutes: workMinutesFinal,
      baseSalary,
      calculatedSalary,
      specialAllowances,
      bonuses,
      incentives,
      commission,
      deductions,
      taxes,
      insurance,
      netPay: 0,
      status: existing?.status === "paid" ? "paid" : "draft",
      notes: existing?.notes,
    };
    draftRecord.netPay = computePayrollNet(draftRecord);

    const record = draftRecord;

    await upsertPayrollRecord(record);
    results.push(record);
  }

  return results;
}

export async function resolvePayrollSalesCommission(
  record: Partial<PayrollRecord> & { userId: string; userName?: string },
  employee: Pick<Employee, "id" | "commissionRate"> | null | undefined,
  periodStart: string,
  periodEnd: string,
  pharmacyId?: string
) {
  const rate = Number(employee?.commissionRate ?? 0);
  if (!(rate > 0)) {
    return {
      commission: Number(record.commission ?? 0),
      salesTotal: 0,
      profitTotal: 0,
      invoiceCount: 0,
      commissionRate: 0,
    };
  }

  const invoices = await getInvoicesForPeriod(
    periodStart,
    periodEnd,
    pharmacyId ? [pharmacyId] : undefined
  );

  return computeCashierCommissionFromInvoices(
    invoices,
    {
      userId: record.userId,
      employeeId: employee?.id,
      userName: record.userName,
    },
    rate,
    { periodStart, periodEnd }
  );
}

export async function syncCashierPayrollCommissionAfterSale(params: {
  cashierUserId: string;
  cashierName?: string;
  pharmacyId?: string;
}) {
  if (!params.cashierUserId) return;

  const appUser = {
    uid: params.cashierUserId,
    name: params.cashierName || "",
    pharmacyId: params.pharmacyId || resolveStampPharmacyId(),
  } as AppUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee || !(Number(employee.commissionRate) > 0)) return;

  const { periodStart, periodEnd } = currentMonthPeriodBounds();
  const sales = await resolvePayrollSalesCommission(
    { userId: params.cashierUserId, userName: params.cashierName, commission: 0 },
    employee,
    periodStart,
    periodEnd,
    employee.pharmacyId
  );

  const payrollRows = await getPayrollRecords(periodStart, periodEnd);
  const existing = payrollRows.find(
    (row) =>
      row.userId === params.cashierUserId ||
      row.userId === employee.id ||
      row.userName === employee.name
  );

  if (!existing?.id || existing.status === "paid") return;

  const payrollSettings = await loadPayrollSettings(employee.pharmacyId);
  const merged = { ...existing, commission: sales.commission };
  const { taxes, insurance } = computeTaxInsuranceFromPercent(
    merged,
    payrollSettings.defaultTaxes,
    payrollSettings.defaultInsurance
  );
  const netPay = computePayrollNet({ ...merged, taxes, insurance });

  await updatePayrollRecord(existing.id, {
    commission: sales.commission,
    taxes,
    insurance,
    netPay,
  });
}

// --- Employees (HR staff records, separate from login accounts) ---

export async function getEmployees(): Promise<Employee[]> {
  return getRows<Employee>("employees", "employee_code", false, 500, undefined, true);
}

export async function getEmployeesForPharmacies(pharmacyIds: string[]): Promise<Employee[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return getEmployees();
  if (ids.length === 1) {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("pharmacy_id", ids[0])
      .order("employee_code", { ascending: true })
      .limit(500);
    if (error) {
      console.error("getEmployeesForPharmacies error:", error.message);
      return [];
    }
    return (data || []).map((row) => toCamelCase<Employee>(row));
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .in("pharmacy_id", ids)
    .order("employee_code", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("getEmployeesForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<Employee>(row));
}

export async function suggestNextEmployeeCode(pharmacyId?: string): Promise<string> {
  const scopeId = pharmacyId || resolveStampPharmacyId();
  const employees = await getEmployees();
  const scoped = employees.filter((e) => e.pharmacyId === scopeId);
  let maxNum = 0;
  for (const emp of scoped) {
    const code = (emp.employeeCode || "").trim();
    const match = code.match(/(\d+)\s*$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  let query = applyPharmacyFilter(supabase.from("employees").select("*").eq("id", id));
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return toCamelCase<Employee>(data);
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Employee> {
  const id = input.id || crypto.randomUUID();
  const pharmacyId = input.pharmacyId || resolveStampPharmacyId();
  let employeeCode = (input.employeeCode || "").trim();
  if (!employeeCode) {
    employeeCode = await suggestNextEmployeeCode(pharmacyId);
  }
  const payload = stampPharmacy(
    toSnakeCase({
      ...input,
      id,
      pharmacyId,
      employeeCode,
      salary: Number(input.salary ?? 0),
      commissionRate: Number(input.commissionRate ?? 0),
      requiredWorkHours: Number(input.requiredWorkHours ?? 8),
      assignedShiftId: (input.assignedShiftId as ShiftId) || "A",
      useCustomWorkSchedule: Boolean(input.useCustomWorkSchedule),
      workDayStart: input.useCustomWorkSchedule ? input.workDayStart || null : null,
      workDayEnd: input.useCustomWorkSchedule ? input.workDayEnd || null : null,
      workBreaks: input.useCustomWorkSchedule ? parseWorkBreaks(input.workBreaks) : null,
      isActive: input.isActive !== false,
      updatedAt: new Date().toISOString(),
    })
  );
  const { data, error } = await supabase.from("employees").insert([payload]).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<Employee>(data);
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { error } = await supabase.from("employees").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  await updateEmployee(id, { isActive });
}

export async function linkUserToEmployee(uid: string, employeeId: string | null) {
  const payload: Record<string, unknown> = {
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function resolveLinkedEmployeeFromData(
  appUser: AppUser,
  employees: Employee[],
  accounts: SystemUser[],
  loginRequests: LoginAccountRequest[],
  catalogAccounts: PharmacyLoginAccount[] = []
): Employee | null {
  if (appUser.employeeId) {
    const linked = employees.find((item) => item.id === appUser.employeeId && item.isActive);
    if (linked) return linked;
  }

  const myAccount = accounts.find((item) => item.uid === appUser.uid);
  if (myAccount?.employeeId) {
    const linked = employees.find((item) => item.id === myAccount.employeeId && item.isActive);
    if (linked) return linked;
  }

  const normalizedEmail = appUser.email.trim().toLowerCase();

  for (const catalog of catalogAccounts) {
    if (!catalog.isActive || catalog.status !== "approved" || !catalog.employeeId) continue;
    if (catalog.email !== normalizedEmail) continue;
    const linked = employees.find((item) => item.id === catalog.employeeId && item.isActive);
    if (linked) return linked;
  }

  const approvedRequests = loginRequests
    .filter((item) => item.status === "approved")
    .sort((a, b) =>
      String(b.reviewedAt || b.updatedAt || "").localeCompare(
        String(a.reviewedAt || a.updatedAt || "")
      )
    );

  for (const request of approvedRequests) {
    if (request.email.trim().toLowerCase() !== normalizedEmail) continue;
    if (!request.employeeId) continue;
    const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
    if (linked) return linked;
  }

  const identity = (appUser.username || appUser.name || "").trim();
  if (identity) {
    for (const request of approvedRequests) {
      if (request.username.trim() !== identity) continue;
      if (!request.employeeId) continue;
      const linked = employees.find((item) => item.id === request.employeeId && item.isActive);
      if (linked) return linked;
    }
  }

  return null;
}

export async function resolveLinkedEmployeeForAppUser(appUser: AppUser): Promise<Employee | null> {
  const [employees, accounts, loginRequests, catalogAccounts] = await Promise.all([
    getEmployees(),
    getSystemUsers(appUser.pharmacyId),
    getPharmacyLoginAccountRequests(appUser.pharmacyId),
    getPharmacyLoginAccounts(appUser.pharmacyId),
  ]);
  return resolveLinkedEmployeeFromData(
    appUser,
    employees,
    accounts,
    loginRequests,
    catalogAccounts
  );
}

export async function ensureAppUserEmployeeLink(appUser: AppUser): Promise<AppUser> {
  if (appUser.employeeId) return appUser;

  const employee = await resolveLinkedEmployeeForAppUser(appUser);
  if (!employee) return appUser;

  try {
    await linkUserToEmployee(appUser.uid, employee.id);
    return { ...appUser, employeeId: employee.id };
  } catch (error) {
    console.warn("ensureAppUserEmployeeLink failed", error);
    return appUser;
  }
}

export async function linkLoginRequestToUserAccount(
  request: LoginAccountRequest
): Promise<boolean> {
  try {
    await syncPharmacyLoginAccountToUser({
      email: request.email,
      role: request.role,
      pharmacyId: request.pharmacyId,
      employeeId: request.employeeId,
    });
    return true;
  } catch {
    return false;
  }
}

export type SyncLoginAccountResult = {
  uid: string;
  email: string;
  role: UserRole;
};

export async function syncPharmacyLoginAccountToUser(
  account: Pick<PharmacyLoginAccount, "email" | "role" | "pharmacyId" | "employeeId">,
  options?: { name?: string }
): Promise<SyncLoginAccountResult> {
  const email = account.email.trim().toLowerCase();
  const role = normalizeRole(account.role);
  const name = options?.name?.trim() || email.split("@")[0];

  const { data, error } = await supabase.rpc("sync_auth_user_for_login_account", {
    p_email: email,
    p_role: role,
    p_pharmacy_id: account.pharmacyId,
    p_employee_id: account.employeeId || null,
    p_name: name,
  });

  if (error) {
    if (error.message.includes("auth_user_not_found")) {
      throw new Error("auth_user_not_found");
    }
    if (error.message.includes("not_authorized")) {
      throw new Error("not_authorized");
    }
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("sync_failed");
  }

  return { uid: String(data), email, role };
}

export async function syncAllPharmacyLoginAccounts(pharmacyId: string) {
  const [accounts, employees] = await Promise.all([
    getPharmacyLoginAccounts(pharmacyId),
    getEmployees(),
  ]);
  const employeeById = new Map(employees.map((item) => [item.id, item]));

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const account of accounts) {
    if (account.status !== "approved") continue;
    try {
      const employee = account.employeeId ? employeeById.get(account.employeeId) : undefined;
      await syncPharmacyLoginAccountToUser(account, { name: employee?.name });
      if (account.linkRequestPending) {
        await supabase
          .from("pharmacy_login_accounts")
          .update({
            link_request_pending: false,
            link_requested_by: null,
            link_requested_by_name: null,
            link_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }
      results.push({ email: account.email, ok: true });
    } catch (err) {
      results.push({
        email: account.email,
        ok: false,
        error: err instanceof Error ? err.message : "sync_failed",
      });
    }
  }

  return results;
}

export async function linkExistingAuthUser(params: {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  username?: string;
  isActive?: boolean;
}) {
  const { error } = await supabase.from("users").upsert([
    {
      uid: params.uid,
      employee_id: params.employeeId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      username: params.username?.trim() || null,
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: params.isActive !== false,
      updated_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLoginAccount(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase({ ...updates, updatedAt: new Date().toISOString() });
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function recordLastLogin(uid: string) {
  const { error } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("uid", uid);
  if (error) {
    console.error("recordLastLogin error:", error.message);
  }
}

function buildEmployeeRequestNumber() {
  return `ER-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

export function listDaysBetween(start: string, end: string): string[] {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [];
  const days: string[] = [];
  const cursor = new Date(s);
  while (cursor.getTime() <= e.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function getEmployeeRequests(options?: {
  userId?: string;
  employeeId?: string;
  status?: EmployeeRequestStatus;
  fromDate?: string;
  toDate?: string;
  pharmacyIds?: string[];
}): Promise<EmployeeRequest[]> {
  let query = applyPharmacyScopeFilter(
    supabase.from("employee_requests").select("*"),
    options?.pharmacyIds
  ).order("created_at", { ascending: false });

  if (options?.userId) query = query.eq("user_id", options.userId);
  if (options?.employeeId) query = query.eq("employee_id", options.employeeId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.fromDate) query = query.gte("work_date", options.fromDate);
  if (options?.toDate) query = query.lte("work_date", options.toDate);

  const { data, error } = await query;
  if (error) {
    console.error("getEmployeeRequests error:", error.message);
    return [];
  }
  return (data || []).map((row) => toCamelCase<EmployeeRequest>(row));
}

export async function createEmployeeRequest(input: {
  employeeId: string;
  userId?: string;
  employeeName: string;
  requestType: EmployeeRequestType;
  workDate: string;
  endDate?: string;
  requestedTime?: string;
  reason?: string;
}): Promise<EmployeeRequest> {
  const payload = stampPharmacy(
    toSnakeCase({
      requestNumber: buildEmployeeRequestNumber(),
      employeeId: input.employeeId,
      userId: input.userId || "",
      employeeName: input.employeeName,
      requestType: input.requestType,
      workDate: input.workDate,
      endDate: input.endDate || null,
      requestedTime: input.requestedTime || null,
      reason: input.reason || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  );

  const { data, error } = await supabase
    .from("employee_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return toCamelCase<EmployeeRequest>(data);
}

export async function reviewEmployeeRequest(
  id: number,
  status: Exclude<EmployeeRequestStatus, "pending">,
  reviewer: { uid: string; name: string },
  reviewNote?: string
): Promise<EmployeeRequest> {
  const { data: existing, error: loadError } = await applyPharmacyFilter(
    supabase.from("employee_requests").select("*").eq("id", id)
  ).maybeSingle();

  if (loadError || !existing) {
    throw new Error(loadError?.message || "request_not_found");
  }

  const request = toCamelCase<EmployeeRequest>(existing);
  if (request.status !== "pending") {
    throw new Error("request_already_reviewed");
  }

  const payload = toSnakeCase({
    status,
    reviewedBy: reviewer.uid,
    reviewedByName: reviewer.name,
    reviewNote: reviewNote || "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await applyPharmacyFilter(
    supabase.from("employee_requests").update(payload).eq("id", id)
  )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updated = toCamelCase<EmployeeRequest>(data);

  if (status === "approved") {
    if (updated.requestType === "leave") {
      const end = updated.endDate || updated.workDate;
      const days = listDaysBetween(updated.workDate, end);
      for (const workDate of days) {
        await upsertAttendanceRecord({
          userId: updated.userId || updated.employeeId,
          userName: updated.employeeName,
          workDate,
          status: "leave",
          notes: updated.reason || (updated.requestNumber ? `إجازة ${updated.requestNumber}` : ""),
        });
      }
    } else if (updated.requestType === "permission") {
      const existingRecord = await getAttendanceForDay(
        updated.userId || updated.employeeId,
        updated.workDate
      );
      const permissionNote = updated.requestedTime
        ? `إذن معتمد — انصراف ${updated.requestedTime}`
        : "إذن معتمد";
      await upsertAttendanceRecord({
        ...existingRecord,
        userId: updated.userId || updated.employeeId,
        userName: updated.employeeName,
        workDate: updated.workDate,
        status: existingRecord?.status || "present",
        notes: [existingRecord?.notes, permissionNote].filter(Boolean).join(" | "),
      });
    }
  }

  return updated;
}

export function hasApprovedPermissionForDate(
  requests: EmployeeRequest[],
  userId: string,
  employeeId: string,
  workDate: string
): boolean {
  return requests.some(
    (req) =>
      req.status === "approved" &&
      req.requestType === "permission" &&
      req.workDate === workDate &&
      (req.userId === userId || req.employeeId === employeeId)
  );
}
