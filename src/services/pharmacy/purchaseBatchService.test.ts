import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PurchaseBatchItem } from "./purchaseBatchService";

const rpcMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const deleteMock = vi.fn();
const fromMock = vi.fn();

const getPurchasesMock = vi.fn();
const getMedicinesForPharmacyMock = vi.fn();
const updateMedicineMock = vi.fn();
const addStockMovementMock = vi.fn();
const createIdAllocatorMock = vi.fn();
const runWithPharmacyScopeMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./purchaseService", () => ({
  getPurchases: (...args: unknown[]) => getPurchasesMock(...args),
}));

vi.mock("./medicineQueryService", () => ({
  getMedicinesForPharmacy: (...args: unknown[]) => getMedicinesForPharmacyMock(...args),
  runWithPharmacyScope: (...args: unknown[]) => runWithPharmacyScopeMock(...args),
}));

vi.mock("./medicineCrudService", () => ({
  updateMedicine: (...args: unknown[]) => updateMedicineMock(...args),
}));

vi.mock("./medicineStockActivityService", () => ({
  addStockMovement: (...args: unknown[]) => addStockMovementMock(...args),
}));

vi.mock("./dbHelpers", () => ({
  createIdAllocator: (...args: unknown[]) => createIdAllocatorMock(...args),
}));

import {
  deletePurchaseBatch,
  getPurchasesForPharmacies,
  replacePurchaseBatch,
  savePurchaseBatch,
} from "./purchaseBatchService";

const sampleItem: PurchaseBatchItem = {
  barcode: "6221234567890",
  name_ar: "باراسيتامول",
  name_en: "Paracetamol",
  qty: 20,
  buyPrice: 8,
  price: 15,
  expiry: "2027-12-01",
};

describe("savePurchaseBatch", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("throws when items array is empty", async () => {
    await expect(
      savePurchaseBatch({
        pharmacyId: "ph-1",
        purchaseNumber: "PUR-1",
        items: [],
      }),
    ).rejects.toThrow("No purchase items");
  });

  it("throws when pharmacy id is missing", async () => {
    await expect(
      savePurchaseBatch({
        pharmacyId: "",
        purchaseNumber: "PUR-1",
        items: [sampleItem],
      }),
    ).rejects.toThrow("Target pharmacy is required");
  });

  it("calls complete_purchase RPC with normalized item payload", async () => {
    rpcMock.mockResolvedValue({ error: null });

    await savePurchaseBatch({
      pharmacyId: "ph-1",
      purchaseNumber: "PUR-100",
      supplierName: "Supplier A",
      notes: "Batch test",
      userId: "user-1",
      userName: "Admin",
      items: [sampleItem],
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "complete_purchase_with_stock_addition",
      expect.objectContaining({
        p_pharmacy_id: "ph-1",
        p_purchase_number: "PUR-100",
        p_supplier_name: "Supplier A",
        p_items: [
          expect.objectContaining({
            barcode: "6221234567890",
            name_ar: "باراسيتامول",
            qty: 20,
            buy_price: 8,
            sell_price: 15,
          }),
        ],
      }),
    );
  });

  it("maps already_saved RPC error to Arabic message", async () => {
    rpcMock.mockResolvedValue({ error: { message: "already_saved" } });

    await expect(
      savePurchaseBatch({
        pharmacyId: "ph-1",
        purchaseNumber: "PUR-1",
        items: [sampleItem],
      }),
    ).rejects.toThrow("تم حفظ أصناف هذا التوريد مسبقاً");
  });

  it("maps invalid_item RPC error", async () => {
    rpcMock.mockResolvedValue({ error: { message: "invalid_item" } });

    await expect(
      savePurchaseBatch({
        pharmacyId: "ph-1",
        purchaseNumber: "PUR-1",
        items: [sampleItem],
      }),
    ).rejects.toThrow("بيانات الصنف غير مكتملة");
  });

  it("maps not_authorized RPC error", async () => {
    rpcMock.mockResolvedValue({ error: { message: "not_authorized" } });

    await expect(
      savePurchaseBatch({
        pharmacyId: "ph-1",
        purchaseNumber: "PUR-1",
        items: [sampleItem],
      }),
    ).rejects.toThrow("غير مصرح بحفظ التوريد");
  });

  it("formats duplicate barcode database errors", async () => {
    rpcMock.mockResolvedValue({
      error: { message: "duplicate key value violates medicines_pharmacy_barcode_unique" },
    });

    await expect(
      savePurchaseBatch({
        pharmacyId: "ph-1",
        purchaseNumber: "PUR-1",
        items: [sampleItem],
      }),
    ).rejects.toThrow("الباركود مسجّل مسبقاً");
  });
});

describe("getPurchasesForPharmacies", () => {
  beforeEach(() => {
    fromMock.mockReset();
    getPurchasesMock.mockReset();
  });

  it("delegates to getPurchases when no pharmacy ids provided", async () => {
    getPurchasesMock.mockResolvedValue([{ id: 1, purchaseNumber: "PUR-1" }]);

    const rows = await getPurchasesForPharmacies([]);

    expect(getPurchasesMock).toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });

  it("queries purchases for specific pharmacy ids", async () => {
    limitMock.mockResolvedValue({
      data: [{ id: 2, purchase_number: "PUR-2", pharmacy_id: "ph-1" }],
      error: null,
    });
    orderMock.mockReturnValue({ limit: limitMock });
    inMock.mockReturnValue({ order: orderMock });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    const rows = await getPurchasesForPharmacies(["ph-1"]);

    expect(fromMock).toHaveBeenCalledWith("purchases");
    expect(inMock).toHaveBeenCalledWith("pharmacy_id", ["ph-1"]);
    expect(rows[0]?.purchaseNumber).toBe("PUR-2");
  });
});

function mockPurchaseSelectChain(result: { data: unknown[]; error: unknown }) {
  const secondEq = vi.fn().mockResolvedValue(result);
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });
  return { select, firstEq, secondEq };
}

describe("deletePurchaseBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createIdAllocatorMock.mockResolvedValue(() => 5001);
    runWithPharmacyScopeMock.mockImplementation(
      async (_pharmacyId: string, fn: () => Promise<void>) => fn(),
    );
  });

  it("throws when purchase number or pharmacy is missing", async () => {
    await expect(deletePurchaseBatch("", "ph-1")).rejects.toThrow(
      "Purchase number and pharmacy are required",
    );
    await expect(deletePurchaseBatch("PUR-1", "")).rejects.toThrow(
      "Purchase number and pharmacy are required",
    );
  });

  it("returns early when purchase rows are not found", async () => {
    const { select } = mockPurchaseSelectChain({ data: [], error: null });
    fromMock.mockReturnValue({ select });

    await deletePurchaseBatch("PUR-404", "ph-1");

    expect(updateMedicineMock).not.toHaveBeenCalled();
    expect(addStockMovementMock).not.toHaveBeenCalled();
  });

  it("reverses stock and deletes purchase rows", async () => {
    getMedicinesForPharmacyMock.mockResolvedValue([
      {
        id: 7,
        barcode: "6221234567890",
        name_ar: "باراسيتامول",
        name_en: "Paracetamol",
        qty: 30,
      },
    ]);
    updateMedicineMock.mockResolvedValue(undefined);
    addStockMovementMock.mockResolvedValue(undefined);

    const { select } = mockPurchaseSelectChain({
      data: [
        {
          id: 11,
          purchase_number: "PUR-9",
          pharmacy_id: "ph-1",
          barcode: "6221234567890",
          quantity: 10,
          medicine_id: 7,
          supplier_name: "Supplier",
        },
      ],
      error: null,
    });

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ eq: deleteEq });

    fromMock.mockImplementation((table: string) => {
      if (table === "purchases") {
        return {
          select,
          delete: deleteMock,
        };
      }
      return {};
    });

    await deletePurchaseBatch("PUR-9", "ph-1", "user-1", "Admin");

    expect(updateMedicineMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ qty: 20 }),
      "ph-1",
    );
    expect(addStockMovementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "purchase_delete",
        purchaseNumber: "PUR-9",
        quantityChange: -10,
        qtyBefore: 30,
        qtyAfter: 20,
      }),
    );
    expect(deleteEq).toHaveBeenCalledWith("id", 11);
  });
});

describe("replacePurchaseBatch", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ error: null });
    getMedicinesForPharmacyMock.mockResolvedValue([]);
    runWithPharmacyScopeMock.mockImplementation(
      async (_pharmacyId: string, fn: () => Promise<void>) => fn(),
    );

    const { select } = mockPurchaseSelectChain({ data: [], error: null });
    fromMock.mockReturnValue({
      select,
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });
  });

  it("deletes old batch then saves the new one", async () => {
    await replacePurchaseBatch({
      pharmacyId: "ph-1",
      purchaseNumber: "PUR-55",
      items: [sampleItem],
    });

    expect(runWithPharmacyScopeMock).toHaveBeenCalledWith("ph-1", expect.any(Function));
    expect(rpcMock).toHaveBeenCalledWith(
      "complete_purchase_with_stock_addition",
      expect.objectContaining({ p_purchase_number: "PUR-55" }),
    );
  });
});
