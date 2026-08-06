import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./scope", () => ({
  applyPharmacyFilter: vi.fn((query: unknown) => query),
  resolveReadPharmacyId: vi.fn(() => "ph-1"),
}));

import {
  INVENTORY_PAGE_SIZE,
  MOVEMENTS_PAGE_SIZE,
  fetchMedicinesPage,
  fetchStockCountLogsPage,
  fetchStockCountSessionMovements,
  fetchStockMovementsPage,
  lookupInventoryMedicineByBarcode,
  lookupInventoryMedicineById,
  lookupInventoryMedicineForReturn,
  searchInventoryMedicines,
} from "./inventoryPaginationService";

function createChainableQuery(finalResult: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "in",
    "or",
    "lte",
    "lt",
    "gte",
    "gt",
    "order",
    "range",
    "limit",
    "maybeSingle",
  ] as const;

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve);
  chain.order.mockReturnValue(chain);
  chain.range.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(finalResult);

  return chain;
}

describe("inventory pagination constants", () => {
  it("exports default page sizes", () => {
    expect(INVENTORY_PAGE_SIZE).toBe(50);
    expect(MOVEMENTS_PAGE_SIZE).toBe(40);
  });
});

describe("fetchMedicinesPage", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it("returns RPC result when fetch_pharmacy_medicines_page succeeds", async () => {
    rpcMock.mockResolvedValue({
      data: {
        total: 2,
        rows: [
          { id: 1, name_ar: "دواء 1", pharmacy_id: "ph-1" },
          { id: 2, name_ar: "دواء 2", pharmacy_id: "ph-1" },
        ],
      },
      error: null,
    });

    const result = await fetchMedicinesPage({ page: 1, pageSize: 20, search: "para" });

    expect(rpcMock).toHaveBeenCalledWith(
      "fetch_pharmacy_medicines_page",
      expect.objectContaining({
        p_pharmacy_id: "ph-1",
        p_page: 1,
        p_page_size: 20,
        p_search: "para",
      }),
    );
    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("falls back to direct query when RPC is unavailable", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "missing rpc" } });

    const queryChain = createChainableQuery({
      data: [{ id: 9, name_ar: "Fallback", pharmacy_id: "ph-1" }],
      error: null,
    });
    fromMock.mockReturnValue(queryChain);
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: "missing rpc" } })
      .mockResolvedValueOnce({ data: 1, error: null });

    const result = await fetchMedicinesPage({ pharmacyIds: ["ph-1"], inStockOnly: true });

    expect(fromMock).toHaveBeenCalledWith("medicines");
    expect(queryChain.gt).toHaveBeenCalledWith("qty", 0);
    expect(result.rows[0]?.name_ar).toBe("Fallback");
  });
});

describe("fetchStockMovementsPage", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns paginated stock movements", async () => {
    const queryChain = createChainableQuery({
      data: [{ id: 1, type: "sale", medicine_name_ar: "دواء" }],
      error: null,
      count: 1,
    });
    fromMock.mockReturnValue(queryChain);

    const result = await fetchStockMovementsPage({
      page: 1,
      search: "INV-1",
      typeFilter: "sale",
      fromDate: "2026-08-01",
      toDate: "2026-08-05",
    });

    expect(fromMock).toHaveBeenCalledWith("stock_movements");
    expect(queryChain.eq).toHaveBeenCalledWith("type", "sale");
    expect(queryChain.gte).toHaveBeenCalledWith("created_at", "2026-08-01T00:00:00");
    expect(queryChain.lte).toHaveBeenCalledWith("created_at", "2026-08-05T23:59:59");
    expect(result.total).toBe(1);
    expect(result.rows[0]?.type).toBe("sale");
  });

  it("returns empty result on query error", async () => {
    const queryChain = createChainableQuery({
      data: null,
      error: { message: "query failed" },
      count: null,
    });
    fromMock.mockReturnValue(queryChain);

    const result = await fetchStockMovementsPage({ page: 2 });

    expect(result).toEqual({ rows: [], total: 0, page: 2, pageSize: MOVEMENTS_PAGE_SIZE });
  });
});

describe("fetchStockCountLogsPage", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("filters activity logs to stock_count type", async () => {
    const queryChain = createChainableQuery({
      data: [{ id: 3, type: "stock_count", title: "Stock count" }],
      error: null,
      count: 1,
    });
    fromMock.mockReturnValue(queryChain);

    const result = await fetchStockCountLogsPage({ search: "count" });

    expect(fromMock).toHaveBeenCalledWith("activity_logs");
    expect(queryChain.eq).toHaveBeenCalledWith("type", "stock_count");
    expect(result.rows[0]?.type).toBe("stock_count");
  });
});

describe("fetchStockCountSessionMovements", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns empty array for invalid createdAt", async () => {
    await expect(fetchStockCountSessionMovements("invalid-date")).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("loads stock_count movements around the session timestamp", async () => {
    const queryChain = createChainableQuery({
      data: [{ id: 4, type: "stock_count", medicine_name_ar: "دواء" }],
      error: null,
    });
    fromMock.mockReturnValue(queryChain);

    const result = await fetchStockCountSessionMovements("2026-08-05T12:00:00.000Z");

    expect(fromMock).toHaveBeenCalledWith("stock_movements");
    expect(queryChain.eq).toHaveBeenCalledWith("type", "stock_count");
    expect(result).toHaveLength(1);
  });
});

describe("inventory lookups", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("lookupInventoryMedicineById returns null for invalid id", async () => {
    await expect(lookupInventoryMedicineById("")).resolves.toBeNull();
    await expect(lookupInventoryMedicineById(0)).resolves.toBeNull();
  });

  it("lookupInventoryMedicineById returns camelCase medicine", async () => {
    const queryChain = createChainableQuery({
      data: { id: 7, name_ar: "دواء", barcode: "111" },
      error: null,
    });
    fromMock.mockReturnValue(queryChain);

    const medicine = await lookupInventoryMedicineById(7);

    expect(medicine?.id).toBe(7);
    expect(medicine?.name_ar).toBe("دواء");
  });

  it("lookupInventoryMedicineByBarcode returns null for blank barcode", async () => {
    await expect(lookupInventoryMedicineByBarcode("   ")).resolves.toBeNull();
  });

  it("lookupInventoryMedicineForReturn falls back to barcode lookup", async () => {
    const idChain = createChainableQuery({ data: null, error: null });
    const barcodeChain = createChainableQuery({
      data: { id: 8, barcode: "6221234567890", name_ar: "دواء" },
      error: null,
    });

    fromMock.mockReturnValueOnce(idChain).mockReturnValueOnce(barcodeChain);

    const medicine = await lookupInventoryMedicineForReturn(999, "6221234567890");

    expect(medicine?.barcode).toBe("6221234567890");
  });
});

describe("searchInventoryMedicines", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns empty list for blank search", async () => {
    await expect(searchInventoryMedicines("   ")).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("searches medicines with inStockOnly filter", async () => {
    const queryChain = createChainableQuery({
      data: [{ id: 2, name_ar: "باراسيتامول", qty: 5 }],
      error: null,
    });
    fromMock.mockReturnValue(queryChain);

    const rows = await searchInventoryMedicines("para", 5, true);

    expect(queryChain.gt).toHaveBeenCalledWith("qty", 0);
    expect(rows).toHaveLength(1);
  });
});
