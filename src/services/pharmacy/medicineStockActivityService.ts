import { supabase } from "../supabaseClient";
import type { ActivityLog, Invoice, InvoiceItem, StockMovement } from "../../types";
import { toSnakeCase } from "./mappers";
import { stampPharmacy } from "./scope";

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

export async function attachInvoiceItems(invoices: Invoice[]): Promise<Invoice[]> {
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
