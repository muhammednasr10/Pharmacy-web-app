import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstantSaleReturnInput, ReturnRecord } from "../../types";

const insertMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();

const getMedicinesMock = vi.fn();
const updateMedicineStockMock = vi.fn();
const addStockMovementMock = vi.fn();
const lookupInventoryMedicineForReturnMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./scope", () => ({
  applyPharmacyFilter: vi.fn((query: unknown) => query),
  stampPharmacy: vi.fn((payload: Record<string, unknown>) => ({
    ...payload,
    pharmacy_id: "ph-1",
  })),
}));

vi.mock("./medicineService", () => ({
  getMedicines: (...args: unknown[]) => getMedicinesMock(...args),
  updateMedicineStock: (...args: unknown[]) => updateMedicineStockMock(...args),
  addStockMovement: (...args: unknown[]) => addStockMovementMock(...args),
}));

vi.mock("./inventoryPaginationService", () => ({
  lookupInventoryMedicineForReturn: (...args: unknown[]) =>
    lookupInventoryMedicineForReturnMock(...args),
}));

vi.mock("./dbHelpers", () => ({
  createManagedRealtimeChannel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  disposeManagedRealtimeChannel: vi.fn(),
}));

import {
  applyReturnToCurrentCart,
  calculateAvailableReturnQuantity,
  createInstantSaleReturn,
  createReturn,
} from "./returnService";

function mockReturnsQuery(rows: Record<string, unknown>[]) {
  limitMock.mockResolvedValue({ data: rows, error: null });
  orderMock.mockReturnValue({ limit: limitMock });
  selectMock.mockReturnValue({ order: orderMock });
  fromMock.mockReturnValue({ select: selectMock });
}

describe("applyReturnToCurrentCart", () => {
  it("adds return amount to current discount", () => {
    expect(applyReturnToCurrentCart(10, 25)).toBe(35);
  });

  it("never returns negative discount", () => {
    expect(applyReturnToCurrentCart(0, 50)).toBe(50);
    expect(applyReturnToCurrentCart(5, 0)).toBe(5);
  });
});

describe("createReturn", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });
  });

  it("inserts stamped return payload", async () => {
    const record: ReturnRecord = {
      id: 9001,
      returnNumber: "RET-9001",
      invoiceNumber: "INV-100",
      items: [
        {
          medicineId: 3,
          name_ar: "دواء",
          name_en: "Medicine",
          quantity: 1,
          unitPrice: 20,
          lineTotal: 20,
        },
      ],
      total: 20,
      isInstant: false,
    };

    await createReturn(record);

    expect(fromMock).toHaveBeenCalledWith("returns");
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        return_number: "RET-9001",
        invoice_number: "INV-100",
        pharmacy_id: "ph-1",
        items: expect.arrayContaining([
          expect.objectContaining({ medicine_id: 3, quantity: 1 }),
        ]),
      }),
    ]);
  });

  it("throws when insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(
      createReturn({
        id: 1,
        returnNumber: "RET-1",
        invoiceNumber: "INV-1",
        items: [],
        total: 0,
      }),
    ).rejects.toThrow("insert failed");
  });
});

describe("calculateAvailableReturnQuantity", () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    orderMock.mockReset();
    limitMock.mockReset();
    inMock.mockReset();
  });

  it("subtracts already returned quantity for the same invoice item", async () => {
    mockReturnsQuery([
      {
        id: 1,
        return_number: "RET-1",
        invoice_number: "INV-55",
        items: [{ medicine_id: 7, quantity: 2, unit_price: 10, line_total: 20 }],
        total: 20,
      },
    ]);

    await expect(calculateAvailableReturnQuantity("INV-55", 7, 5)).resolves.toBe(3);
  });

  it("returns zero when everything was already returned", async () => {
    mockReturnsQuery([
      {
        id: 1,
        return_number: "RET-1",
        invoice_number: "INV-55",
        items: [{ medicine_id: 7, quantity: 5, unit_price: 10, line_total: 50 }],
        total: 50,
      },
    ]);

    await expect(calculateAvailableReturnQuantity("INV-55", 7, 5)).resolves.toBe(0);
  });
});

describe("createInstantSaleReturn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMedicinesMock.mockResolvedValue([
      { id: 7, name_ar: "دواء", name_en: "Medicine", qty: 4, barcode: "111" },
    ]);
    updateMedicineStockMock.mockResolvedValue(undefined);
    addStockMovementMock.mockResolvedValue(undefined);
    insertMock.mockResolvedValue({ error: null });
    mockReturnsQuery([]);
    fromMock.mockImplementation((table: string) => {
      if (table === "returns") {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return { select: selectMock };
    });
  });

  const baseInput: InstantSaleReturnInput = {
    invoice: {
      id: 100,
      invoiceNumber: "INV-100",
      pharmacyId: "ph-1",
      items: [
        {
          medicineId: 7,
          name_ar: "دواء",
          name_en: "Medicine",
          barcode: "111",
          quantity: 3,
          unitPrice: 15,
          lineTotal: 45,
        },
      ],
    },
    items: [
      {
        medicineId: 7,
        name_ar: "دواء",
        name_en: "Medicine",
        barcode: "111",
        quantity: 1,
        unitPrice: 15,
        buyPrice: 8,
      },
    ],
    userId: "user-1",
    userName: "Cashier",
    reason: "Customer changed mind",
    refundMethod: "cash",
  };

  it("throws when no return items selected", async () => {
    await expect(
      createInstantSaleReturn({ ...baseInput, items: [{ ...baseInput.items[0], quantity: 0 }] }),
    ).rejects.toThrow("no_return_items");
  });

  it("throws when item is not in the original invoice", async () => {
    await expect(
      createInstantSaleReturn({
        ...baseInput,
        items: [{ ...baseInput.items[0], medicineId: 999 }],
      }),
    ).rejects.toThrow("item_not_in_invoice");
  });

  it("creates instant return, restores stock, and logs movement", async () => {
    const result = await createInstantSaleReturn(baseInput);

    expect(result.returnTotal).toBe(15);
    expect(result.returnRecord.isInstant).toBe(true);
    expect(result.returnRecord.returnNumber).toMatch(/^RET-\d+$/);
    expect(updateMedicineStockMock).toHaveBeenCalledWith(7, 5);
    expect(addStockMovementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sale_return",
        medicineId: 7,
        quantityChange: 1,
        invoiceNumber: "INV-100",
      }),
    );
    expect(insertMock).toHaveBeenCalled();
  });
});
