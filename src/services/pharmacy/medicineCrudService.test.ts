import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

const addStockMovementMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./medicineStockActivityService", () => ({
  addStockMovement: (...args: unknown[]) => addStockMovementMock(...args),
}));

import { applyStockCountAdjustments, updateMedicineStock } from "./medicineCrudService";

describe("updateMedicineStock", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockImplementation(() => ({ eq: eqMock, error: null }));
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });
  });

  it("updates qty using string medicine id", async () => {
    await updateMedicineStock(42, 15);

    expect(fromMock).toHaveBeenCalledWith("medicines");
    expect(updateMock).toHaveBeenCalledWith({ qty: 15 });
    expect(eqMock).toHaveBeenCalledWith("id", "42");
  });

  it("throws when supabase update fails", async () => {
    eqMock.mockImplementation(() => ({ eq: eqMock, error: { message: "update failed" } }));

    await expect(updateMedicineStock("7", 3)).rejects.toThrow("update failed");
  });
});

describe("applyStockCountAdjustments", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    addStockMovementMock.mockReset();

    eqMock.mockImplementation(() => ({ eq: eqMock, error: null }));
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });
    addStockMovementMock.mockResolvedValue(undefined);
  });

  it("returns zero adjustments when counts match system qty", async () => {
    const result = await applyStockCountAdjustments({
      pharmacyId: "ph-1",
      lines: [{ medicineId: 1, systemQty: 10, countedQty: 10 }],
    });

    expect(result).toEqual({ adjustedCount: 0, totalVariance: 0 });
    expect(addStockMovementMock).not.toHaveBeenCalled();
  });

  it("updates stock and logs movement for variance lines", async () => {
    const result = await applyStockCountAdjustments({
      pharmacyId: "ph-1",
      userId: "user-1",
      userName: "Cashier",
      notes: "Monthly count",
      lines: [
        {
          medicineId: 1,
          medicineName_ar: "دواء",
          medicineName_en: "Medicine",
          barcode: "111",
          systemQty: 10,
          countedQty: 8,
        },
        {
          medicineId: 2,
          systemQty: 5,
          countedQty: 5,
        },
      ],
    });

    expect(result).toEqual({ adjustedCount: 1, totalVariance: -2 });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(addStockMovementMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "stock_count",
        medicineId: 1,
        quantityChange: -2,
        qtyBefore: 10,
        qtyAfter: 8,
        pharmacyId: "ph-1",
      }),
    );
  });
});
