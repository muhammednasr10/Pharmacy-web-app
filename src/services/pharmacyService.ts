import { createEphemeralSupabase, supabase } from "./supabaseClient";
import { isSuperAdmin, normalizeAppUser } from "../utils/roles";
import type {
  ActivityLog,
  AppUser,
  SubscriptionRequest,
  SubscriptionRequestStatus,
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
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  SystemUser,
  UserRole,
} from "../types";

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
  request_number: "requestNumber",
  pharmacy_name: "pharmacyName",
  requested_by: "requestedBy",
  requested_by_name: "requestedByName",
  reviewed_by: "reviewedBy",
  reviewed_by_name: "reviewedByName",
  review_note: "reviewNote",
  reviewed_at: "reviewedAt",
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
  requestNumber: "request_number",
  pharmacyName: "pharmacy_name",
  requestedBy: "requested_by",
  requestedByName: "requested_by_name",
  reviewedBy: "reviewed_by",
  reviewedByName: "reviewed_by_name",
  reviewNote: "review_note",
  reviewedAt: "reviewed_at",
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
  return { ...payload, pharmacy_id: resolveStampPharmacyId() };
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

function subscribeTable<T>(
  table: string,
  callback: (rows: T[]) => void,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown },
  pharmacyScoped = false
) {
  const channel = supabase
    .channel(`realtime-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => {
        void getRows<T>(table, orderBy, desc, limit, filter, pharmacyScoped).then(callback);
      }
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
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

export async function addMedicine(medicine: Medicine) {
  const payload = prepareMedicinePayload(medicine);
  const { error } = await supabase.from("medicines").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicine(id: number, medicine: Partial<Medicine>) {
  const payload = prepareMedicinePayload(medicine);
  delete payload.id;
  const { error } = await supabase.from("medicines").update(payload).eq("id", id);

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

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  return getRows<CustomerPayment>("customer_payments", "id", false, 100, undefined, true);
}

export function subscribeCustomerPayments(callback: (payments: CustomerPayment[]) => void) {
  return subscribeTable<CustomerPayment>("customer_payments", callback, "id", false, 100, undefined, true);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return getRows<StockMovement>("stock_movements", "created_at", false, 100, undefined, true);
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
  return getRows<SystemUser>("users", "uid", false, 100, {
    column: "pharmacy_id",
    value: pharmacyId,
  });
}

export function subscribeUsers(pharmacyId: string, callback: (users: SystemUser[]) => void) {
  return subscribeTable<SystemUser>("users", callback, "uid", false, 100, {
    column: "pharmacy_id",
    value: pharmacyId,
  });
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
}): Promise<string> {
  const email = params.email.trim().toLowerCase();

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
        role: params.role,
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
      name: params.name.trim(),
      email,
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);

  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    throw new Error(insertError.message);
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

export async function createPurchase(purchase: PurchaseRecord) {
  const payload = stampPharmacy(toSnakeCase(purchase));
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
