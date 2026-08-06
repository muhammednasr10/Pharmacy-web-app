import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem, Invoice } from "../../types";

const rpcMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("./scope", () => ({
  stampPharmacy: vi.fn((payload: Record<string, unknown>) => ({ ...payload, pharmacy_id: "ph-1" })),
  resolveStampPharmacyId: vi.fn(() => "ph-1"),
  getCurrentAppUser: vi.fn(() => ({ pharmacyId: "ph-1" })),
}));

import { completeSaleWithStockDeduction } from "./saleCompletionService";
import * as scope from "./scope";

const cartItem: CartItem = {
  id: 1,
  name_ar: "باراسيتامول",
  name_en: "Paracetamol",
  barcode: "6221234567890",
  qty: 10,
  cartQty: 2,
  price: 15,
  buyPrice: 8,
  expiry: "2027-01-01",
};

const invoice: Invoice = {
  id: 1001,
  invoiceNumber: "INV-1001",
  pharmacyId: "ph-1",
  date: "2026-08-05",
  subtotal: 30,
  discount: 0,
  total: 30,
  paymentMethod: "cash",
  items: [
    {
      medicineId: 1,
      name_ar: "باراسيتامول",
      name_en: "Paracetamol",
      quantity: 2,
      unitPrice: 15,
      lineTotal: 30,
      buyPrice: 8,
      costTotal: 16,
      profit: 14,
    },
  ],
};

describe("completeSaleWithStockDeduction", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.mocked(scope.resolveStampPharmacyId).mockReturnValue("ph-1");
    vi.mocked(scope.getCurrentAppUser).mockReturnValue({
      uid: "user-1",
      name: "Cashier",
      email: "cashier@example.com",
      role: "cashier",
      pharmacyId: "ph-1",
      isActive: true,
    });
  });

  it("throws empty_cart when cart is empty", async () => {
    await expect(completeSaleWithStockDeduction([], invoice)).rejects.toThrow("empty_cart");
  });

  it("throws empty_cart when invoice has no items", async () => {
    await expect(
      completeSaleWithStockDeduction([cartItem], { ...invoice, items: [] }),
    ).rejects.toThrow("empty_cart");
  });

  it("throws pharmacy_required when pharmacy scope is missing", async () => {
    vi.mocked(scope.resolveStampPharmacyId).mockReturnValue("");
    vi.mocked(scope.getCurrentAppUser).mockReturnValue(null);

    await expect(
      completeSaleWithStockDeduction([cartItem], { ...invoice, pharmacyId: "" }),
    ).rejects.toThrow("pharmacy_required");
  });

  it("calls complete_sale RPC with pharmacy and payloads", async () => {
    rpcMock.mockResolvedValue({ error: null });

    await completeSaleWithStockDeduction([cartItem], invoice);

    expect(rpcMock).toHaveBeenCalledWith(
      "complete_sale_with_stock_deduction",
      expect.objectContaining({
        p_pharmacy_id: "ph-1",
        p_invoice: expect.objectContaining({ pharmacy_id: "ph-1" }),
        p_items: expect.arrayContaining([
          expect.objectContaining({ medicine_id: 1, quantity: 2 }),
        ]),
      }),
    );
  });

  it("maps insufficient_stock to item name", async () => {
    rpcMock.mockResolvedValue({ error: { message: "insufficient_stock" } });
    const shortCartItem = { ...cartItem, cartQty: 15, qty: 10 };

    await expect(completeSaleWithStockDeduction([shortCartItem], invoice)).rejects.toThrow(
      "Not enough stock: Paracetamol",
    );
  });

  it("maps medicine_not_found RPC error", async () => {
    rpcMock.mockResolvedValue({ error: { message: "medicine_not_found" } });

    await expect(completeSaleWithStockDeduction([cartItem], invoice)).rejects.toThrow(
      "Medicine not found",
    );
  });

  it("maps cashier_shift_invalid RPC error", async () => {
    rpcMock.mockResolvedValue({ error: { message: "cashier_shift_invalid" } });

    await expect(completeSaleWithStockDeduction([cartItem], invoice)).rejects.toThrow(
      "cashier_shift_invalid",
    );
  });

  it("maps text id mismatch to migration hint", async () => {
    rpcMock.mockResolvedValue({
      error: { message: "operator does not exist: text = bigint" },
    });

    await expect(completeSaleWithStockDeduction([cartItem], invoice)).rejects.toThrow(
      "fix-rpc-text-ids.sql",
    );
  });
});
