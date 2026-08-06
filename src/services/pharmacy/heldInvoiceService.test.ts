import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem, HeldInvoice } from "../../types";

const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const fromMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./scope", () => ({
  stampPharmacy: vi.fn((payload: Record<string, unknown>) => ({
    ...payload,
    pharmacy_id: "ph-1",
  })),
  resolveHeldInvoicesPharmacyId: vi.fn(() => "ph-1"),
  getCurrentAppUser: vi.fn(() => null),
  getActivePharmacy: vi.fn(() => null),
}));

vi.mock("./dbHelpers", () => ({
  createManagedRealtimeChannel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  disposeManagedRealtimeChannel: vi.fn(),
}));

import {
  deleteHeldInvoice,
  getHeldInvoiceById,
  holdInvoice,
  resumeHeldInvoice,
  updateHeldInvoiceStatus,
} from "./heldInvoiceService";

const cartItem: CartItem = {
  id: 1,
  name_ar: "دواء",
  name_en: "Medicine",
  barcode: "111",
  qty: 10,
  cartQty: 2,
  price: 20,
  buyPrice: 10,
  expiry: "2027-01-01",
};

describe("holdInvoice", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();

    singleMock.mockResolvedValue({
      data: {
        id: "held-1",
        hold_number: "HOLD-1",
        cart_items: [cartItem],
        subtotal: 40,
        discount: 0,
        total: 40,
        payment_method: "cash",
        status: "held",
      },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReturnValue({ insert: insertMock });
  });

  it("creates held invoice and normalizes response", async () => {
    const held = await holdInvoice({
      holdNumber: "HOLD-1",
      cartItems: [cartItem],
      subtotal: 40,
      discount: 0,
      total: 40,
      paymentMethod: "cash",
    });

    expect(fromMock).toHaveBeenCalledWith("held_invoices");
    expect(held.holdNumber).toBe("HOLD-1");
    expect(held.cartItems).toHaveLength(1);
    expect(held.status).toBe("held");
  });

  it("maps missing held_invoices table error", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'relation "held_invoices" does not exist', code: "42P01" },
    });

    await expect(
      holdInvoice({
        holdNumber: "HOLD-2",
        cartItems: [cartItem],
        subtotal: 40,
        discount: 0,
        total: 40,
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("held_invoices_table_missing");
  });
});

describe("getHeldInvoiceById", () => {
  beforeEach(() => {
    eqMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();
  });

  it("returns null for empty id", async () => {
    await expect(getHeldInvoiceById("")).resolves.toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("resumeHeldInvoice", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });
  });

  it("throws when id is missing", async () => {
    await expect(resumeHeldInvoice("")).rejects.toThrow("held_invoice_id_missing");
  });

  it("throws when held invoice is not active", async () => {
    const held: HeldInvoice = {
      id: "held-9",
      holdNumber: "HOLD-9",
      cartItems: [cartItem],
      subtotal: 40,
      discount: 0,
      total: 40,
      paymentMethod: "cash",
      status: "resumed",
    };

    await expect(resumeHeldInvoice("held-9", held)).rejects.toThrow("held_invoice_not_active");
  });

  it("marks held invoice as resumed", async () => {
    const held: HeldInvoice = {
      id: "held-9",
      holdNumber: "HOLD-9",
      cartItems: [cartItem],
      subtotal: 40,
      discount: 0,
      total: 40,
      paymentMethod: "cash",
      status: "held",
    };

    const resumed = await resumeHeldInvoice("held-9", held);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resumed", updated_at: expect.any(String) }),
    );
    expect(resumed.status).toBe("resumed");
  });
});

describe("updateHeldInvoiceStatus", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
  });

  it("retries without updated_at when column is missing", async () => {
    eqMock
      .mockResolvedValueOnce({ error: { message: "column updated_at does not exist" } })
      .mockResolvedValueOnce({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });

    await updateHeldInvoiceStatus("held-1", "deleted");

    expect(updateMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "deleted" }));
    expect(updateMock).toHaveBeenNthCalledWith(2, { status: "deleted" });
  });
});

describe("deleteHeldInvoice", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ delete: deleteMock });
  });

  it("deletes held invoice by id", async () => {
    await deleteHeldInvoice("held-1");

    expect(fromMock).toHaveBeenCalledWith("held_invoices");
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("id", "held-1");
  });
});
