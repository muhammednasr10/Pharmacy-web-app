import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const getAllRowsMock = vi.fn();
const setActivePharmacyMock = vi.fn();
const getActivePharmacyMock = vi.fn();
const resolveReadPharmacyIdMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("./dbHelpers", () => ({
  getAllRows: (...args: unknown[]) => getAllRowsMock(...args),
  createManagedRealtimeChannel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  disposeManagedRealtimeChannel: vi.fn(),
}));

vi.mock("./scope", () => ({
  resolveReadPharmacyId: () => resolveReadPharmacyIdMock(),
  setActivePharmacy: (...args: unknown[]) => setActivePharmacyMock(...args),
  getActivePharmacy: () => getActivePharmacyMock(),
}));

import { LARGE_MEDICINE_CATALOG } from "../../constants/medicineCatalog";
import {
  getMedicines,
  getMedicinesForPharmacies,
  getMedicinesForPharmacy,
  runWithPharmacyScope,
} from "./medicineQueryService";

describe("getMedicines", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getAllRowsMock.mockReset();
    resolveReadPharmacyIdMock.mockReset();
    resolveReadPharmacyIdMock.mockReturnValue("ph-1");
  });

  it("returns empty array when catalog exceeds large threshold", async () => {
    rpcMock.mockResolvedValue({ data: LARGE_MEDICINE_CATALOG + 1, error: null });

    await expect(getMedicines()).resolves.toEqual([]);
    expect(getAllRowsMock).not.toHaveBeenCalled();
  });

  it("loads all rows when catalog count is below threshold", async () => {
    rpcMock.mockResolvedValue({ data: 120, error: null });
    getAllRowsMock.mockResolvedValue([{ id: 1, name_ar: "دواء" }]);

    const rows = await getMedicines();

    expect(getAllRowsMock).toHaveBeenCalledWith("medicines", "id", false, undefined, {
      pharmacyScoped: true,
    });
    expect(rows).toHaveLength(1);
  });

  it("skips bulk load when count RPC fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "rpc missing" } });

    await expect(getMedicines()).resolves.toEqual([]);
    expect(getAllRowsMock).not.toHaveBeenCalled();
  });
});

describe("getMedicinesForPharmacy", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getAllRowsMock.mockReset();
  });

  it("loads rows for a specific pharmacy when count is small", async () => {
    rpcMock.mockResolvedValue({ data: 50, error: null });
    getAllRowsMock.mockResolvedValue([{ id: 2, pharmacy_id: "ph-2" }]);

    const rows = await getMedicinesForPharmacy("ph-2");

    expect(getAllRowsMock).toHaveBeenCalledWith("medicines", "id", false, undefined, {
      filter: { column: "pharmacy_id", value: "ph-2" },
    });
    expect(rows[0]?.pharmacy_id).toBe("ph-2");
  });
});

describe("getMedicinesForPharmacies", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getAllRowsMock.mockReset();
    resolveReadPharmacyIdMock.mockReset();
    resolveReadPharmacyIdMock.mockReturnValue("ph-1");
  });

  it("delegates to getMedicines when no pharmacy ids provided", async () => {
    rpcMock.mockResolvedValue({ data: 10, error: null });
    getAllRowsMock.mockResolvedValue([{ id: 1 }]);

    await getMedicinesForPharmacies([]);

    expect(getAllRowsMock).toHaveBeenCalledWith("medicines", "id", false, undefined, {
      pharmacyScoped: true,
    });
  });

  it("returns empty when any branch exceeds large catalog threshold", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: 100, error: null })
      .mockResolvedValueOnce({ data: LARGE_MEDICINE_CATALOG + 5, error: null });

    await expect(getMedicinesForPharmacies(["ph-1", "ph-2"])).resolves.toEqual([]);
    expect(getAllRowsMock).not.toHaveBeenCalled();
  });

  it("loads rows with inFilter for multiple pharmacies", async () => {
    rpcMock.mockResolvedValue({ data: 40, error: null });
    getAllRowsMock.mockResolvedValue([{ id: 3, pharmacy_id: "ph-1" }]);

    await getMedicinesForPharmacies(["ph-1", "ph-2"]);

    expect(getAllRowsMock).toHaveBeenCalledWith("medicines", "id", false, undefined, {
      inFilter: { column: "pharmacy_id", values: ["ph-1", "ph-2"] },
    });
  });
});

describe("runWithPharmacyScope", () => {
  beforeEach(() => {
    setActivePharmacyMock.mockReset();
    getActivePharmacyMock.mockReset();
    getActivePharmacyMock.mockReturnValue("previous-ph");
  });

  it("sets active pharmacy for the callback and restores previous scope", async () => {
    const result = await runWithPharmacyScope("ph-target", async () => {
      expect(setActivePharmacyMock).toHaveBeenCalledWith("ph-target");
      return "done";
    });

    expect(result).toBe("done");
    expect(setActivePharmacyMock).toHaveBeenLastCalledWith("previous-ph");
  });
});
