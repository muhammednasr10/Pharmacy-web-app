import { supabase } from "../supabaseClient";
import type { Invoice, InvoiceItem } from "../../types";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter, stampPharmacy } from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";
import { attachInvoiceItems } from "./medicineService";

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
