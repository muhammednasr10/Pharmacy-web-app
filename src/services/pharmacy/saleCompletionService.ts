import { supabase } from "../supabaseClient";
import type { CartItem, Invoice, StockMovement } from "../../types";
import {
  stampPharmacy,
  resolveStampPharmacyId,
  getCurrentAppUser,
} from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";

function parseSaleRpcError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("operator does not exist") && lower.includes("text = bigint")) {
    return "text_id_mismatch";
  }
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
    if (code === "text_id_mismatch") {
      throw new Error(
        "خطأ في نوع المعرّفات بقاعدة البيانات. شغّل supabase/fix-rpc-text-ids.sql في Supabase SQL Editor ثم أعد المحاولة.",
      );
    }
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
