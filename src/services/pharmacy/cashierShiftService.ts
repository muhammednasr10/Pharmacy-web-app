import { supabase } from "../supabaseClient";
import type { CashierShift, CashierShiftSummary } from "../../types";
import { toCamelCase } from "./mappers";
import { createIdAllocator } from "./dbHelpers";

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

export async function deleteCashierShift(params: {
  shiftId: number;
  pharmacyId: string;
  requesterId: string;
  canManageAll: boolean;
}): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("cashier_shifts")
    .select("*")
    .eq("id", params.shiftId)
    .eq("pharmacy_id", params.pharmacyId)
    .single();

  if (fetchError || !row) {
    throw new Error("shift_not_found");
  }

  const shift = normalizeCashierShift(row);
  if (shift.status === "open") {
    throw new Error("shift_still_open");
  }

  if (!params.canManageAll && shift.cashierId !== params.requesterId) {
    throw new Error("not_authorized");
  }

  const { count, error: countError } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("cashier_shift_id", params.shiftId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error("shift_has_sales");
  }

  const { error } = await supabase
    .from("cashier_shifts")
    .delete()
    .eq("id", params.shiftId)
    .eq("pharmacy_id", params.pharmacyId);

  if (error) {
    throw new Error(error.message);
  }
}
