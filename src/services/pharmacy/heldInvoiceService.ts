import { supabase } from "../supabaseClient";
import { isSuperAdmin } from "../../utils/roles";
import type { CartItem, HeldInvoice } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import {
  stampPharmacy,
  resolveHeldInvoicesPharmacyId,
  getCurrentAppUser,
  getActivePharmacy,
} from "./scope";
import { createManagedRealtimeChannel, disposeManagedRealtimeChannel } from "./dbHelpers";

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
  const channelName = "realtime-held-invoices";
  const channel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "held_invoices" },
    () => {
      void getHeldInvoices(pharmacyId)
        .then(callback)
        .catch((error) => console.error("subscribeHeldInvoices refresh error:", error));
    },
  );

  void channel.subscribe();
  return () => {
    disposeManagedRealtimeChannel(channel);
  };
}
