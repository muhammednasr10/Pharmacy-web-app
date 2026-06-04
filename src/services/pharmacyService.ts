import { createEphemeralSupabase, supabase } from "./supabaseClient";
import type {
  ActivityLog,
  AppUser,
  CartItem,
  CustomerPayment,
  Invoice,
  InvoiceItem,
  Medicine,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  SystemUser,
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
  medicine_name_ar: "medicineName_ar",
  medicine_name_en: "medicineName_en",
};

const snakeKeyMap: Record<string, string> = {
  buyPrice: "buy_price",
  sellPrice: "sell_price",
  totalCost: "total_cost",
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
    createdAt: invoice.createdAt,
  } as Partial<Invoice>);
}

function prepareInvoiceItemPayload(item: InvoiceItem, invoiceId: number): Record<string, any> {
  return toSnakeCase({
    id: item.id,
    invoiceId,
    medicineId: item.medicineId,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  } as Partial<InvoiceItem>);
}

// Active branch (pharmacy) used to scope all reads/writes. When set, branch-scoped
// queries are filtered by pharmacy_id and branch-scoped inserts are stamped with it.
let activePharmacyId: string | null = null;

export function setActivePharmacy(pharmacyId: string | null) {
  activePharmacyId = pharmacyId;
}

export function getActivePharmacy() {
  return activePharmacyId;
}

function stampPharmacy(payload: Record<string, any>): Record<string, any> {
  if (activePharmacyId) {
    return { ...payload, pharmacy_id: activePharmacyId };
  }
  return payload;
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

  if (pharmacyScoped && activePharmacyId) {
    query = query.eq("pharmacy_id", activePharmacyId);
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

export function signOutUser() {
  return supabase.auth.signOut();
}

export function getAuthSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
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

  return toCamelCase<AppUser>(data);
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
  const payload = toSnakeCase({ id: pharmacyId, ...updates });
  const { error } = await supabase
    .from("pharmacies")
    .upsert([payload], { onConflict: "id" });

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
  return subscribeTable<Medicine>("medicines", callback, "id", false, 100, undefined, true);
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
  const payload = stampPharmacy(toSnakeCase(log));
  const { error } = await supabase.from("activity_logs").insert([payload]);

  if (error) {
    console.error("addActivityLog error:", error.message);
  }
}

export async function addStockMovement(movement: StockMovement) {
  const payload = stampPharmacy(toSnakeCase(movement));
  const { error } = await supabase.from("stock_movements").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getInvoices(limit = 100): Promise<Invoice[]> {
  let invoiceQuery = supabase.from("invoices").select("*");

  if (activePharmacyId) {
    invoiceQuery = invoiceQuery.eq("pharmacy_id", activePharmacyId);
  }

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

  const items = (itemsData || []).map((row) => toCamelCase<InvoiceItem>(row));
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

  const invoiceItems = invoice.items.map((item) =>
    prepareInvoiceItemPayload(item, insertedInvoice.id)
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

  const { error: stockError } = await supabase
    .from("stock_movements")
    .insert(stockMovements.map((movement) => stampPharmacy(toSnakeCase(movement))));
  if (stockError) {
    throw new Error(stockError.message);
  }
}

export async function getReturns(): Promise<ReturnRecord[]> {
  return getRows<ReturnRecord>("returns", "id", false, 100, undefined, true);
}

export function subscribeReturns(callback: (returnsData: ReturnRecord[]) => void) {
  return subscribeTable<ReturnRecord>("returns", callback, "id", false, 100, undefined, true);
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

export async function createPharmacy(branch: Partial<PharmacySettings> & { id: string }) {
  const payload = toSnakeCase({
    isActive: true,
    currency: "ج.م",
    ...branch,
  });
  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
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
      data: { name: params.name },
    },
  });

  if (authError) {
    const code = (authError as { code?: string }).code || "";
    if (code === "email_address_invalid") {
      throw new Error("email_address_invalid");
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

  if (insertError) {
    throw new Error(insertError.message);
  }

  return uid;
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

export async function createReturn(returnRecord: ReturnRecord) {
  const payload = stampPharmacy(toSnakeCase(returnRecord));
  const { error } = await supabase.from("returns").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}
