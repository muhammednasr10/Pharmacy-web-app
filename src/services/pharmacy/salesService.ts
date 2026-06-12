import { createEphemeralSupabase, supabase } from "../supabaseClient";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isPharmacyManager,
  isSuperAdmin,
  normalizeAppUser,
  normalizeRole,
} from "../../utils/roles";
import { ALL_BRANCHES_ID } from "../../constants/branches";
import { notifySuperAdminOfSubscriptionRequest } from "../../utils/superAdminNotify";
import { isActiveSubscriptionStatus, TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../../config/subscriptionTiers";
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
} from "../../types";
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
} from "../../utils/workSchedule";
import { extractCopyableBranchSettings } from "../../utils/copyBranchSettings";
import {
  computeCashierCommissionFromInvoices,
  currentMonthPeriodBounds,
} from "../../utils/cashierCommission";

import { toCamelCase, toSnakeCase } from "./mappers";
import {
  setActivePharmacy,
  getActivePharmacy,
  setOrganizationBranchIds,
  getOrganizationBranchIds,
  setCurrentAppUser,
  getCurrentAppUser,
  applyPharmacyFilter,
  applyPharmacyScopeFilter,
  stampPharmacy,
  resolveStampPharmacyId,
  resolveHeldInvoicesPharmacyId,
  prepareMedicinePayload,
  prepareMedicinePayloadForPharmacy,
  shouldQueryAllOrganizationBranches,
} from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";
import { getRows, subscribeTable } from "./dbHelpers";

import {
  getMedicines,
  updateMedicineStock,
  addStockMovement,
  addActivityLog,
} from "./medicineService";
import { getAppUserByUid } from "./authService";

export async function getInvoices(limit = 100): Promise<Invoice[]> {
  let invoiceQuery = applyPharmacyFilter(supabase.from("invoices").select("*"));

  const { data, error } = await invoiceQuery.order("id", { ascending: false }).limit(limit);

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
  pharmacyIds?: string[],
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
    .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
      void getInvoices().then(callback);
    });

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
    stampPharmacy(prepareInvoiceItemPayload(item, insertedInvoice.id, index)),
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
  rows: Array<{
    total?: number | string | null;
    payment_method?: string | null;
    paymentMethod?: string;
  }>,
  method: string,
) {
  return rows.reduce((sum, row) => {
    const rowMethod = String(row.payment_method ?? row.paymentMethod ?? "cash").toLowerCase();
    if (rowMethod !== method) return sum;
    return sum + Number(row.total ?? 0);
  }, 0);
}

export async function getOpenCashierShift(
  pharmacyId: string,
  cashierId: string,
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
  shift: CashierShift,
): Promise<CashierShiftSummary> {
  const endAt = shift.closedAt || new Date().toISOString();

  const [invoicesResult, paymentsResult, returnsResult] = await Promise.all([
    supabase.from("invoices").select("total, payment_method").eq("cashier_shift_id", shift.id),
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
    Number(shift.openingCash ?? 0) + cashSales + customerPaymentsCash - returnsTotal;

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
  },
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
  _stockMovements?: StockMovement[],
) {
  if (!cart.length || !invoice.items?.length) {
    throw new Error("empty_cart");
  }

  const pharmacyId =
    invoice.pharmacyId || resolveStampPharmacyId() || getCurrentAppUser()?.pharmacyId || "";
  if (!pharmacyId) {
    throw new Error("pharmacy_required");
  }

  const invoicePayload = stampPharmacy(prepareInvoicePayload(invoice));
  const itemsPayload = invoice.items.map((item, index) =>
    stampPharmacy(prepareInvoiceItemPayload(item, invoice.id, index)),
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
      throw new Error(shortItem ? `Not enough stock: ${shortItem.name_en}` : "insufficient_stock");
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
        raw.medicineId ?? raw.medicine_id ?? raw.medicineID ?? raw.id ?? 0,
      );
      const quantity = Number(raw.quantity ?? raw.qty ?? raw.return_qty ?? raw.returnQuantity ?? 0);
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
        (hasValidMedicineId(item.medicineId) || Boolean(item.name_ar) || Boolean(item.name_en)),
    );
}

function rebuildReturnItemsFromMovements(
  returnRecord: ReturnRecord,
  movements: StockMovement[],
): ReturnRecord["items"] {
  const related = movements.filter(
    (movement) =>
      movement.returnNumber === returnRecord.returnNumber &&
      (movement.type === "return" || movement.type === "sale_return"),
  );

  if (related.length === 0) {
    return [];
  }

  const recordTotal = Number(returnRecord.total ?? 0);
  const totalQty = related.reduce(
    (sum, movement) => sum + Math.abs(Number(movement.quantityChange ?? 0)),
    0,
  );

  return related.map((movement) => {
    const movementRow = movement as StockMovement & { name_ar?: string; name_en?: string };
    const quantity = Math.abs(Number(movement.quantityChange ?? 0));
    const unitPrice =
      quantity > 0 && related.length === 1 && recordTotal > 0 ? recordTotal / quantity : 0;

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

  const records = (data || []).map((row) => normalizeReturnRecord(row as Record<string, any>));

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
    .on("postgres_changes", { event: "*", schema: "public", table: "returns" }, () => {
      void getReturns().then(callback);
    });

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
  const rows = await getRows<PharmacyCost>(
    "pharmacy_costs",
    "created_at",
    false,
    500,
    undefined,
    true,
  );
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
    true,
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
  return subscribeTable<CustomerPayment>(
    "customer_payments",
    callback,
    "id",
    false,
    100,
    undefined,
    true,
  );
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return getRows<StockMovement>("stock_movements", "created_at", false, 100, undefined, true);
}

export async function getStockMovementsForMedicine(
  medicineId: number,
  pharmacyId?: string,
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
  return subscribeTable<StockMovement>(
    "stock_movements",
    callback,
    "created_at",
    false,
    100,
    undefined,
    true,
  );
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return getRows<ActivityLog>("activity_logs", "created_at", false, 300, undefined, true);
}

export async function getActivityLogsForPharmacies(
  pharmacyIds: string[],
  limit = 500,
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
  return subscribeTable<ActivityLog>(
    "activity_logs",
    callback,
    "created_at",
    false,
    300,
    undefined,
    true,
  );
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
        item.medicineId ?? (item as { medicine_id?: number | string }).medicine_id ?? 0,
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
    }),
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
  held.paymentMethod = (held.paymentMethod ||
    row.payment_method ||
    "cash") as HeldInvoice["paymentMethod"];

  return held;
}

export async function getHeldInvoices(pharmacyId?: string): Promise<HeldInvoice[]> {
  const scopeId = resolveHeldInvoicesPharmacyId(pharmacyId);

  let query = supabase.from("held_invoices").select("*").eq("status", "held");

  if (!(isSuperAdmin(getCurrentAppUser()) && !pharmacyId && !getActivePharmacy())) {
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

  const { data, error } = await supabase
    .from("held_invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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
  source?: HeldInvoice | null,
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

export function subscribeHeldInvoices(
  callback: (rows: HeldInvoice[]) => void,
  pharmacyId?: string,
) {
  const channel = supabase
    .channel("realtime-held-invoices")
    .on("postgres_changes", { event: "*", schema: "public", table: "held_invoices" }, () => {
      void getHeldInvoices(pharmacyId)
        .then(callback)
        .catch((error) => console.error("subscribeHeldInvoices refresh error:", error));
    });

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
  return (invoice.items || []).some((item) => String(item.barcode ?? "").trim() === clean);
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
      (item.barcode || "").toLowerCase().includes(q),
    );
    const nameMatch = (invoice.items || []).some((item) => {
      const ar = (item.name_ar || "").toLowerCase();
      const en = (item.name_en || "").toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
    return (
      number.includes(q) || customer.includes(q) || phone.includes(q) || barcodeMatch || nameMatch
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
  soldQuantity: number,
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
  input: InstantSaleReturnInput,
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
      original.quantity,
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
