import { describe, expect, it } from "vitest";
import type { Invoice, InvoiceItem } from "../../types";
import { prepareInvoiceItemPayload, prepareInvoicePayload } from "./payloads";

describe("prepareInvoicePayload", () => {
  it("maps invoice fields to snake_case payload", () => {
    const invoice: Invoice = {
      id: 10,
      invoiceNumber: "INV-10",
      pharmacyId: "ph-1",
      date: "2026-08-05",
      subtotal: 100,
      discount: 5,
      total: 95,
      paymentMethod: "cash",
      customerName: "Walk-in",
      cashierId: "user-1",
      cashierName: "Cashier",
      totalCost: 60,
      totalProfit: 35,
    };

    expect(prepareInvoicePayload(invoice)).toEqual(
      expect.objectContaining({
        id: 10,
        invoice_number: "INV-10",
        pharmacy_id: "ph-1",
        payment_method: "cash",
        customer_name: "Walk-in",
        total_profit: 35,
      }),
    );
  });
});

describe("prepareInvoiceItemPayload", () => {
  it("maps line item and sets medicine_name fallback", () => {
    const item: InvoiceItem = {
      medicineId: 3,
      name_ar: "باراسيتامول",
      name_en: "Paracetamol",
      barcode: "6221234567890",
      quantity: 2,
      unitPrice: 12,
      lineTotal: 24,
      buyPrice: 7,
      costTotal: 14,
      profit: 10,
    };

    const payload = prepareInvoiceItemPayload(item, 99, 0);

    expect(payload).toEqual(
      expect.objectContaining({
        invoice_id: 99,
        medicine_id: 3,
        name_ar: "باراسيتامول",
        quantity: 2,
        unit_price: 12,
        medicine_name: "باراسيتامول",
      }),
    );
  });
});
