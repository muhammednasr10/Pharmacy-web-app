import { createEphemeralSupabase, supabase } from "./supabaseClient";
import { isSuperAdmin, normalizeAppUser, normalizeRole } from "../utils/roles";
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
let currentAppUser: AppUser | null = null;

export function setActivePharmacy(pharmacyId: string | null) {
  activePharmacyId = pharmacyId;
}

export function getActivePharmacy() {
  return activePharmacyId;
}

export function setCurrentAppUser(user: AppUser | null) {
  currentAppUser = user ? normalizeAppUser(user) : null;
}

export function getCurrentAppUser() {
  return currentAppUser;
}

export { isSuperAdmin };

export function applyPharmacyFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  appUser: AppUser | null = currentAppUser
): T {
  if (isSuperAdmin(appUser)) {
    if (activePharmacyId) {
      return query.eq("pharmacy_id", activePharmacyId);
    }
    return query;
  }

  const pharmacyId = activePharmacyId || appUser?.pharmacyId;
  if (pharmacyId) {
    return query.eq("pharmacy_id", pharmacyId);
  }
  return query;
}

function resolveStampPharmacyId(): string {
  return (
    activePharmacyId ||
    currentAppUser?.pharmacyId ||
    "main"
  );
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

export async function isPharmacyAccessAllowed(pharmacyId: string): Promise<boolean> {
  const pharmacy = await getPharmacySettings(pharmacyId);
  if (!pharmacy) return false;
  if (pharmacy.isActive === false) return false;
  if (pharmacy.subscriptionStatus && pharmacy.subscriptionStatus !== "active") return false;
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
  return getRows<Medicine>("medicines", "id", false, 100, undefined, true);
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

async function purchaseLineExists(
  purchaseNumber: string,
  barcode: string,
  pharmacyId: string
) {
  const { data, error } = await supabase
    .from("purchases")
    .select("id")
    .eq("purchase_number", purchaseNumber)
    .eq("barcode", barcode)
    .eq("pharmacy_id", pharmacyId)
    .limit(1);

  if (error) {
    console.error("purchaseLineExists:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
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

  await runWithPharmacyScope(params.pharmacyId, async () => {
    const branchMedicines = await getMedicinesForPharmacy(params.pharmacyId);
    const nowIso = new Date().toISOString();
    const purchaseDate = new Date().toLocaleString();
    const nextMedicineId = await createIdAllocator("medicines");
    const nextPurchaseId = await createIdAllocator("purchases");
    const nextMovementId = await createIdAllocator("stock_movements");
    let savedCount = 0;

    for (let index = 0; index < params.items.length; index += 1) {
      const item = params.items[index];
      const barcode = String(item.barcode ?? "").trim();
      const nameAr = String(item.name_ar ?? "").trim();
      const nameEn = String(item.name_en ?? "").trim();

      if (!barcode || !nameAr || !nameEn || !item.expiry) {
        throw new Error("بيانات الصنف غير مكتملة (الباركود أو الاسم أو الصلاحية)");
      }

      if (await purchaseLineExists(params.purchaseNumber, barcode, params.pharmacyId)) {
        continue;
      }

      const existingMedicine = branchMedicines.find(
        (medicine) => String(medicine.barcode ?? "").trim() === barcode
      );

      const medicineId = existingMedicine?.id || nextMedicineId();
      const oldQty = existingMedicine?.qty || 0;
      const purchaseQty = Number(item.qty);
      const purchaseBuyPrice = Number(item.buyPrice);
      const purchaseSellPrice = Number(item.price);
      const newQty = oldQty + purchaseQty;

      const medicine: Medicine = {
        id: medicineId,
        name_ar: nameAr,
        name_en: nameEn,
        barcode,
        qty: newQty,
        buyPrice: purchaseBuyPrice,
        price: purchaseSellPrice,
        expiry: item.expiry,
        pharmacyId: params.pharmacyId,
      };

      const purchaseRecord: PurchaseRecord = {
        id: nextPurchaseId(),
        purchaseNumber: params.purchaseNumber,
        medicineId,
        medicineName_ar: medicine.name_ar,
        medicineName_en: medicine.name_en,
        barcode: medicine.barcode,
        quantity: purchaseQty,
        buyPrice: purchaseBuyPrice,
        sellPrice: purchaseSellPrice,
        totalCost: purchaseQty * purchaseBuyPrice,
        supplierName: params.supplierName,
        notes: params.notes,
        pharmacyId: params.pharmacyId,
        userId: params.userId,
        userName: params.userName,
        date: purchaseDate,
        createdAt: nowIso,
      };

      try {
        if (existingMedicine) {
          await updateMedicine(medicineId, medicine, params.pharmacyId);
          const local = branchMedicines.find((row) => row.id === medicineId);
          if (local) {
            local.qty = newQty;
            local.buyPrice = purchaseBuyPrice;
            local.price = purchaseSellPrice;
            local.expiry = item.expiry;
          }
        } else {
          await addMedicine(medicine, params.pharmacyId);
          branchMedicines.push(medicine);
        }

        await createPurchase(purchaseRecord);
        await addStockMovement({
          id: nextMovementId(),
          type: "purchase",
          purchaseNumber: params.purchaseNumber,
          medicineId,
          medicineName_ar: medicine.name_ar,
          medicineName_en: medicine.name_en,
          barcode: medicine.barcode,
          quantityChange: purchaseQty,
          qtyBefore: oldQty,
          qtyAfter: newQty,
          supplierName: params.supplierName,
          notes: params.notes,
          pharmacyId: params.pharmacyId,
          userId: params.userId,
          userName: params.userName,
          createdAt: nowIso,
        });
        savedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(formatPurchaseError(message));
      }
    }

    if (savedCount === 0) {
      throw new Error("تم حفظ أصناف هذا التوريد مسبقاً بنفس رقم التوريد");
    }
  });
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
    console.error("getInvoices invoice_items error:", itemsError.message);
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

export async function completeSaleWithStockDeduction(
  cart: CartItem[],
  invoice: Invoice,
  stockMovements: StockMovement[]
) {
  const medicineIds = cart.map((item) => item.id);
  const { data: medicineRows, error: medicineError } = await supabase
    .from("medicines")
    .select("*")
    .in("id", medicineIds);

  if (medicineError) {
    throw new Error(medicineError.message);
  }

  const medicineMap = (medicineRows || []).reduce(
    (acc, row) => {
      const medicine = toCamelCase<Medicine>(row);
      acc[medicine.id] = medicine;
      return acc;
    },
    {} as Record<number, Medicine>
  );

  for (const item of cart) {
    const currentMedicine = medicineMap[item.id];
    if (!currentMedicine) {
      throw new Error("Medicine not found");
    }
    if (currentMedicine.qty < item.cartQty) {
      throw new Error(`Not enough stock: ${item.name_en}`);
    }
  }

  // TODO: Use a Postgres RPC or real transaction in production for atomic writes.
  await createInvoice(invoice);

  for (const item of cart) {
    const currentMedicine = medicineMap[item.id];
    const newQty = currentMedicine.qty - item.cartQty;
    const { error: updateError } = await supabase
      .from("medicines")
      .update({ qty: newQty })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  for (const movement of stockMovements) {
    await addStockMovement(movement);
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
  return getRows<ActivityLog>("activity_logs", "created_at", false, 100, undefined, true);
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  return subscribeTable<ActivityLog>("activity_logs", callback, "created_at", false, 100, undefined, true);
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

  return (data || []).map((row) => toCamelCase<PharmacySettings>(row));
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

  return toCamelCase<SubscriptionRequest>(data);
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

function normalizePharmacyLoginAccount(row: PharmacyLoginAccount): PharmacyLoginAccount {
  return {
    ...row,
    role: normalizeRole(row.role),
    email: row.email.trim().toLowerCase(),
    status: row.status || "approved",
  };
}

export async function getAllPharmacyLoginAccounts(options?: {
  status?: PharmacyLoginAccount["status"];
}): Promise<PharmacyLoginAccount[]> {
  let query = supabase.from("pharmacy_login_accounts").select("*").order("created_at", {
    ascending: false,
  });
  if (options?.status) {
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

  await linkLoginRequestToUserAccount({
    pharmacyId: approved.pharmacyId,
    employeeId: approved.employeeId,
    email: approved.email,
    username: approved.email.split("@")[0],
    role: approved.role,
  } as LoginAccountRequest).catch(() => undefined);

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

export async function updatePharmacyLoginAccount(
  id: string,
  updates: Partial<Pick<PharmacyLoginAccount, "email" | "password" | "role" | "employeeId" | "isActive">>
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
    await linkLoginRequestToUserAccount({
      pharmacyId,
      employeeId,
      email: catalogAccount.email,
      username: catalogAccount.email.split("@")[0],
      role: catalogAccount.role,
    } as LoginAccountRequest).catch(() => undefined);
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
  const payload = toSnakeCase({
    id: data.id,
    name: data.name,
    name_en: data.name_en || data.name,
    phone: data.phone || "",
    address: data.address || "",
    currency: "ج.م",
    isActive: true,
    subscriptionPlan: data.subscriptionPlan || "basic",
    subscriptionStatus: data.subscriptionStatus || "active",
  });
  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

/** @deprecated use createPharmacy — kept for branch UI compatibility */
export async function createPharmacyBranch(branch: Partial<PharmacySettings> & { id: string }) {
  return createPharmacy({
    id: branch.id,
    name: branch.name || branch.id,
    name_en: branch.name_en,
    phone: branch.phone,
    address: branch.address,
  });
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

  if (!isSuperAdmin(currentAppUser) && currentAppUser?.pharmacyId) {
    query = query.eq("pharmacy_id", currentAppUser.pharmacyId);
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
}): Promise<{ needsEmailConfirmation: boolean }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const password = params.password;

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  if (!name) {
    throw new Error("name_required");
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
        role: "cashier",
        pharmacy_id: "main",
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

  if (authData.session) {
    const { error: insertError } = await supabase.from("users").insert([
      {
        uid,
        name,
        email,
        role: "cashier",
        pharmacy_id: "main",
        is_active: true,
      },
    ]);

    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      throw new Error(insertError.message);
    }

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

export async function getAttendanceRecords(fromDate: string, toDate: string): Promise<AttendanceRecord[]> {
  let query = applyPharmacyFilter(supabase.from("attendance_records").select("*"))
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

export async function getPayrollRecords(periodStart: string, periodEnd: string): Promise<PayrollRecord[]> {
  let query = applyPharmacyFilter(supabase.from("payroll_records").select("*"))
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
    const commission = existing?.commission ?? 0;
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

// --- Employees (HR staff records, separate from login accounts) ---

export async function getEmployees(): Promise<Employee[]> {
  return getRows<Employee>("employees", "employee_code", false, 500, undefined, true);
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
  const pharmacyId = request.pharmacyId;
  const email = request.email.trim().toLowerCase();

  const { data: byEmail } = await supabase
    .from("users")
    .select("uid")
    .eq("pharmacy_id", pharmacyId)
    .eq("email", email)
    .maybeSingle();

  let uid = byEmail?.uid as string | undefined;

  if (!uid && request.username.trim()) {
    const { data: byUsername } = await supabase
      .from("users")
      .select("uid")
      .eq("pharmacy_id", pharmacyId)
      .eq("username", request.username.trim())
      .maybeSingle();
    uid = byUsername?.uid as string | undefined;
  }

  if (!uid) return false;

  await linkUserToEmployee(uid, request.employeeId);
  return true;
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
}): Promise<EmployeeRequest[]> {
  let query = applyPharmacyFilter(supabase.from("employee_requests").select("*")).order(
    "created_at",
    { ascending: false }
  );

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
