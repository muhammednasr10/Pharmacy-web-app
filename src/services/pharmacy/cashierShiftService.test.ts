import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CashierShift } from "../../types";

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const gteMock = vi.fn();
const lteMock = vi.fn();
const fromMock = vi.fn();

const createIdAllocatorMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./dbHelpers", () => ({
  createIdAllocator: (...args: unknown[]) => createIdAllocatorMock(...args),
}));

import {
  closeCashierShift,
  computeCashierShiftSummary,
  deleteCashierShift,
  getOpenCashierShift,
  openCashierShift,
} from "./cashierShiftService";

const openShiftRow = {
  id: 10,
  shift_number: "CSH-10",
  pharmacy_id: "ph-1",
  cashier_id: "user-1",
  cashier_name: "Cashier",
  status: "open",
  opening_cash: 100,
  opened_at: "2026-08-05T08:00:00.000Z",
};

function chainEq(finalResult: unknown) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue(finalResult),
  };
  return chain;
}

describe("openCashierShift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createIdAllocatorMock.mockResolvedValue(() => 99);
  });

  it("throws pharmacy_required when ids are missing", async () => {
    await expect(
      openCashierShift({
        pharmacyId: "",
        cashierId: "user-1",
        cashierName: "Cashier",
        openingCash: 0,
      }),
    ).rejects.toThrow("pharmacy_required");
  });

  it("throws shift_already_open when cashier already has open shift", async () => {
    const chain = chainEq({ data: [openShiftRow], error: null });
    fromMock.mockReturnValue(chain);

    await expect(
      openCashierShift({
        pharmacyId: "ph-1",
        cashierId: "user-1",
        cashierName: "Cashier",
        openingCash: 50,
      }),
    ).rejects.toThrow("shift_already_open");
  });

  it("creates a new open shift", async () => {
    const openQuery = chainEq({ data: [], error: null });
    const insertQuery = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: openShiftRow, error: null }),
        }),
      }),
    };

    fromMock.mockImplementation((table: string) => {
      if (table === "cashier_shifts") {
        return openQuery;
      }
      return insertQuery;
    });

    // second call for insert path needs separate mock - simplify by resetting
    fromMock
      .mockReturnValueOnce(openQuery)
      .mockReturnValueOnce(insertQuery);

    const shift = await openCashierShift({
      pharmacyId: "ph-1",
      cashierId: "user-1",
      cashierName: "Cashier",
      openingCash: 100,
    });

    expect(shift.shiftNumber).toBe("CSH-10");
    expect(shift.status).toBe("open");
    expect(shift.openingCash).toBe(100);
  });
});

describe("computeCashierShiftSummary", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("aggregates sales, payments, and returns into expected cash", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "invoices") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { total: 120, payment_method: "cash" },
                { total: 80, payment_method: "visa" },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "customer_payments") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: [{ amount: 30, payment_method: "cash" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "returns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({
              data: [{ total: 20 }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const summary = await computeCashierShiftSummary({
      id: 10,
      shiftNumber: "CSH-10",
      pharmacyId: "ph-1",
      cashierId: "user-1",
      cashierName: "Cashier",
      status: "open",
      openingCash: 100,
      openedAt: "2026-08-05T08:00:00.000Z",
    } as CashierShift);

    expect(summary.totalSales).toBe(200);
    expect(summary.cashSales).toBe(120);
    expect(summary.visaSales).toBe(80);
    expect(summary.customerPaymentsCash).toBe(30);
    expect(summary.returnsTotal).toBe(20);
    expect(summary.invoiceCount).toBe(2);
    expect(summary.expectedCash).toBe(230);
  });
});

describe("closeCashierShift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws shift_not_found when shift does not exist", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "missing" } }),
        }),
      }),
    });

    await expect(
      closeCashierShift({ shiftId: 999, actualCash: 100 }),
    ).rejects.toThrow("shift_not_found");
  });

  it("throws shift_already_closed for closed shift", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...openShiftRow, status: "closed" },
            error: null,
          }),
        }),
      }),
    });

    await expect(
      closeCashierShift({ shiftId: 10, actualCash: 100 }),
    ).rejects.toThrow("shift_already_closed");
  });
});

describe("deleteCashierShift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws shift_still_open for open shift", async () => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: openShiftRow, error: null }),
      }),
    });

    await expect(
      deleteCashierShift({
        shiftId: 10,
        pharmacyId: "ph-1",
        requesterId: "user-1",
        canManageAll: false,
      }),
    ).rejects.toThrow("shift_still_open");
  });
});

describe("getOpenCashierShift", () => {
  it("returns null when pharmacy or cashier id is missing", async () => {
    await expect(getOpenCashierShift("", "user-1")).resolves.toBeNull();
    await expect(getOpenCashierShift("ph-1", "")).resolves.toBeNull();
  });
});
