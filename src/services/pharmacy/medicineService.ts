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
import { chunkCatalogRows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE } from "../../utils/medicineCatalogImport";

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
  fn: () => Promise<T>,
): Promise<T> {
  const previous = getActivePharmacy();
  setActivePharmacy(pharmacyId);
  try {
    return await fn();
  } finally {
    setActivePharmacy(previous);
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
  userName?: string,
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
    params.userName,
  );
  await savePurchaseBatch(params);
}

export function subscribeMedicines(callback: (medicines: Medicine[]) => void) {
  const channel = supabase
    .channel("realtime-medicines")
    .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => {
      void getMedicines().then(callback);
    });

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

export async function updateMedicine(id: number, medicine: Partial<Medicine>, pharmacyId?: string) {
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
    0,
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
    }),
  );

  // دعم الجداول القديمة التي تستخدم movement_type بدل type
  payload.movement_type = movementType;

  if (!payload.medicine_name_ar && !payload.medicine_name) {
    payload.medicine_name = movement.medicineName_ar || movement.medicineName_en || "";
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
  const itemsByInvoiceId = items.reduce(
    (acc, item) => {
      if (item.invoiceId !== undefined) {
        acc[item.invoiceId] = acc[item.invoiceId] || [];
        acc[item.invoiceId].push(item);
      }
      return acc;
    },
    {} as Record<number, InvoiceItem[]>,
  );

  return invoices.map((invoice) => ({
    ...invoice,
    items: itemsByInvoiceId[invoice.id] || [],
  }));
}

// Cross-branch availability: looks up the same medicine across ALL branches,
// intentionally ignoring the active-branch filter. Matches by barcode when
// available, otherwise by name.
export async function getBranchAvailability(
  medicine: Partial<Medicine>,
): Promise<Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>> {
  let query = supabase.from("medicines").select("pharmacy_id, qty, expiry, price");

  if (isSuperAdmin(getCurrentAppUser())) {
    if (getActivePharmacy() && getActivePharmacy() !== ALL_BRANCHES_ID) {
      query = query.eq("pharmacy_id", getActivePharmacy());
    }
  } else if (shouldQueryAllOrganizationBranches(getCurrentAppUser())) {
    if (getOrganizationBranchIds().length === 1) {
      query = query.eq("pharmacy_id", getOrganizationBranchIds()[0]);
    } else if (getOrganizationBranchIds().length > 1 && query.in) {
      query = query.in("pharmacy_id", getOrganizationBranchIds());
    }
  } else {
    const scopeId = getActivePharmacy() || getCurrentAppUser()?.pharmacyId;
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

  const totals = new Map<
    string,
    { pharmacyId: string; qty: number; expiry?: string; price?: number }
  >();
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
  const branchIds = getOrganizationBranchIds().length > 0 ? getOrganizationBranchIds() : [];
  let query = supabase
    .from("branch_stock_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!isSuperAdmin(getCurrentAppUser()) && branchIds.length > 0) {
    query = query.or(
      `from_pharmacy_id.in.(${branchIds.join(",")}),to_pharmacy_id.in.(${branchIds.join(",")})`,
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
    mergedByMedicine.set(
      item.medicineId,
      (mergedByMedicine.get(item.medicineId) || 0) + item.quantity,
    );
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
      }),
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

export async function clearPharmacyMedicineCatalog(pharmacyId: string): Promise<number> {
  const { data, error } = await supabase.rpc("clear_pharmacy_medicine_catalog", {
    p_pharmacy_id: pharmacyId,
  });

  if (error) {
    if (error.message.includes("clear_pharmacy_medicine_catalog")) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }

  return Number(data || 0);
}

export async function importMedicineCatalogBatch(
  pharmacyId: string,
  rows: Array<{
    name_ar: string;
    name_en: string;
    barcode: string;
    qty: number;
    price: number;
    buy_price?: number;
    expiry: string;
  }>,
): Promise<number> {
  const { data, error } = await supabase.rpc("import_medicine_catalog_batch", {
    p_pharmacy_id: pharmacyId,
    p_rows: rows,
  });

  if (error) {
    if (error.message.includes("import_medicine_catalog_batch")) {
      throw new Error("sql_migration_required");
    }
    throw new Error(error.message);
  }

  const payload = data as { inserted?: number } | null;
  return Number(payload?.inserted || 0);
}

export async function replacePharmacyMedicineCatalog(
  pharmacyId: string,
  rows: Array<{
    name_ar: string;
    name_en: string;
    barcode: string;
    qty: number;
    price: number;
    buy_price?: number;
    expiry: string;
  }>,
  onProgress?: (progress: { done: number; total: number; phase: "clearing" | "importing" }) => void,
): Promise<{ deleted: number; inserted: number }> {
  onProgress?.({ done: 0, total: rows.length, phase: "clearing" });
  const deleted = await clearPharmacyMedicineCatalog(pharmacyId);

  let inserted = 0;
  const chunks = chunkCatalogRows(rows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE);

  for (let index = 0; index < chunks.length; index += 1) {
    inserted += await importMedicineCatalogBatch(pharmacyId, chunks[index]);
    onProgress?.({
      done: Math.min(rows.length, (index + 1) * MEDICINE_CATALOG_IMPORT_BATCH_SIZE),
      total: rows.length,
      phase: "importing",
    });
  }

  return { deleted, inserted };
}
