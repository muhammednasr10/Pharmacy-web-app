import { supabase } from "./supabaseClient";
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

function toCamelCase<T>(row: Record<string, any>): T {
  if (!row || typeof row !== "object") return row as T;

  return Object.entries(row).reduce((acc, [key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    acc[camelKey] = value;
    return acc;
  }, {} as Record<string, any>) as T;
}

function toSnakeCase<T>(data: T): Record<string, any> {
  if (!data || typeof data !== "object") return data as unknown as Record<string, any>;

  return Object.entries(data as Record<string, any>).reduce((acc, [key, value]) => {
    const snakeKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
    acc[snakeKey] = value;
    return acc;
  }, {} as Record<string, any>);
}

async function getRows<T>(
  table: string,
  orderBy = "id",
  desc = true,
  limit?: number,
  filter?: { column: string; value: unknown }
): Promise<T[]> {
  let query = supabase.from(table).select("*");

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
  filter?: { column: string; value: unknown }
) {
  const channel = supabase
    .channel(`realtime-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => {
        void getRows<T>(table, orderBy, desc, limit, filter).then(callback);
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
    .single();

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
  return getRows<Medicine>("medicines", "id", false, 100);
}

export function subscribeMedicines(callback: (medicines: Medicine[]) => void) {
  return subscribeTable<Medicine>("medicines", callback, "id", false, 100);
}

export async function addMedicine(medicine: Medicine) {
  const payload = toSnakeCase(medicine);
  const { error } = await supabase.from("medicines").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedicine(id: number, medicine: Partial<Medicine>) {
  const payload = toSnakeCase(medicine);
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
  const { error } = await supabase.from("activity_logs").insert([payload]);

  if (error) {
    console.error("addActivityLog error:", error.message);
  }
}

export async function addStockMovement(movement: StockMovement) {
  const payload = toSnakeCase(movement);
  const { error } = await supabase.from("stock_movements").insert([payload]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getInvoices(limit = 100): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
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
    acc[item.invoiceId] = acc[item.invoiceId] || [];
    acc[item.invoiceId].push(item);
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
  const invoiceRow = toSnakeCase({
    ...invoice,
    invoiceNumber: invoice.invoiceNumber,
    paymentMethod: invoice.paymentMethod,
    createdAt: invoice.createdAt,
    customerName: invoice.customerName || "",
  });

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
    toSnakeCase({
      ...item,
      invoiceId: invoice.id,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })
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

  const { error: stockError } = await supabase.from("stock_movements").insert(stockMovements.map(toSnakeCase));
  if (stockError) {
    throw new Error(stockError.message);
  }
}

export async function getReturns(): Promise<ReturnRecord[]> {
  return getRows<ReturnRecord>("returns", "id", false, 100);
}

export function subscribeReturns(callback: (returnsData: ReturnRecord[]) => void) {
  return subscribeTable<ReturnRecord>("returns", callback, "id", false, 100);
}

export async function getPurchases(): Promise<PurchaseRecord[]> {
  return getRows<PurchaseRecord>("purchases", "id", false, 100);
}

export function subscribePurchases(callback: (purchases: PurchaseRecord[]) => void) {
  return subscribeTable<PurchaseRecord>("purchases", callback, "id", false, 100);
}

export async function getCustomerPayments(): Promise<CustomerPayment[]> {
  return getRows<CustomerPayment>("customer_payments", "id", false, 100);
}

export function subscribeCustomerPayments(callback: (payments: CustomerPayment[]) => void) {
  return subscribeTable<CustomerPayment>("customer_payments", callback, "id", false, 100);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return getRows<StockMovement>("stock_movements", "created_at", false, 100);
}

export function subscribeStockMovements(callback: (movements: StockMovement[]) => void) {
  return subscribeTable<StockMovement>("stock_movements", callback, "created_at", false, 100);
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return getRows<ActivityLog>("activity_logs", "created_at", false, 100);
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  return subscribeTable<ActivityLog>("activity_logs", callback, "created_at", false, 100);
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

export async function saveCustomerPayment(payment: CustomerPayment) {
  const payload = toSnakeCase(payment);
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
  const payload = toSnakeCase(purchase);
  const { error } = await supabase.from("purchases").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function createReturn(returnRecord: ReturnRecord) {
  const payload = toSnakeCase(returnRecord);
  const { error } = await supabase.from("returns").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}
