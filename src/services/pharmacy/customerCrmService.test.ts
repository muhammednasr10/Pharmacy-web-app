import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmCustomer, CustomerActivity } from "../../types";

const getRowsMock = vi.fn();
const subscribeTableMock = vi.fn();
const upsertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock("./dbHelpers", () => ({
  getRows: (...args: unknown[]) => getRowsMock(...args),
  subscribeTable: (...args: unknown[]) => subscribeTableMock(...args),
}));

vi.mock("./scope", () => ({
  stampPharmacy: vi.fn((payload: Record<string, unknown>) => ({
    ...payload,
    pharmacy_id: "ph-1",
  })),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import {
  deleteCrmCustomer,
  deleteCustomerActivity,
  getCrmCustomers,
  getCustomerActivities,
  saveCrmCustomer,
  saveCustomerActivity,
  subscribeCrmCustomers,
  subscribeCustomerActivities,
  updateCustomerActivityStatus,
} from "./customerCrmService";

describe("getCrmCustomers", () => {
  beforeEach(() => {
    getRowsMock.mockReset();
  });

  it("loads customers ordered by updated_at", async () => {
    getRowsMock.mockResolvedValue([{ id: 1, name: "Ahmed" }]);

    const rows = await getCrmCustomers();

    expect(getRowsMock).toHaveBeenCalledWith(
      "customers",
      "updated_at",
      true,
      500,
      undefined,
      true,
    );
    expect(rows).toHaveLength(1);
  });

  it("returns empty list when customers table is missing", async () => {
    getRowsMock.mockRejectedValue(new Error('relation "customers" does not exist'));

    await expect(getCrmCustomers()).resolves.toEqual([]);
  });

  it("rethrows unrelated errors", async () => {
    getRowsMock.mockRejectedValue(new Error("network down"));

    await expect(getCrmCustomers()).rejects.toThrow("network down");
  });
});

describe("getCustomerActivities", () => {
  beforeEach(() => {
    getRowsMock.mockReset();
  });

  it("loads activities ordered by created_at", async () => {
    getRowsMock.mockResolvedValue([{ id: 5, title: "Follow up" }]);

    const rows = await getCustomerActivities();

    expect(getRowsMock).toHaveBeenCalledWith(
      "customer_activities",
      "created_at",
      true,
      500,
      undefined,
      true,
    );
    expect(rows[0]?.title).toBe("Follow up");
  });

  it("returns empty list when activities table is missing", async () => {
    getRowsMock.mockRejectedValue(new Error("schema cache miss for customer_activities"));

    await expect(getCustomerActivities()).resolves.toEqual([]);
  });
});

describe("subscribe helpers", () => {
  it("wires customer subscriptions through subscribeTable", () => {
    subscribeTableMock.mockReturnValue(() => undefined);

    const unsubscribe = subscribeCrmCustomers(() => undefined);
    subscribeCustomerActivities(() => undefined);

    expect(subscribeTableMock).toHaveBeenCalledWith(
      "customers",
      expect.any(Function),
      "updated_at",
      true,
      500,
      undefined,
      true,
    );
    expect(subscribeTableMock).toHaveBeenCalledWith(
      "customer_activities",
      expect.any(Function),
      "created_at",
      true,
      500,
      undefined,
      true,
    );
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("saveCrmCustomer", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();

    singleMock.mockResolvedValue({
      data: {
        id: 10,
        name: "Ahmed",
        phone: "0100",
        pharmacy_id: "ph-1",
        is_active: true,
        tags: [],
      },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    upsertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReturnValue({ upsert: upsertMock });
  });

  it("upserts stamped customer payload", async () => {
    const customer: CrmCustomer = {
      id: 10,
      name: "Ahmed",
      phone: "0100",
      isActive: true,
      tags: ["vip"],
    };

    const saved = await saveCrmCustomer(customer);

    expect(fromMock).toHaveBeenCalledWith("customers");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ahmed",
        phone: "0100",
        is_active: true,
        tags: ["vip"],
        pharmacy_id: "ph-1",
      }),
    );
    expect(saved.name).toBe("Ahmed");
  });

  it("throws sql_migration_required when customers table is missing", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'relation "customers" does not exist' },
    });

    await expect(
      saveCrmCustomer({ id: 1, name: "Test", phone: "0100", isActive: true }),
    ).rejects.toThrow("sql_migration_required");
  });
});

describe("deleteCrmCustomer", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ delete: deleteMock });
  });

  it("deletes customer by id", async () => {
    await deleteCrmCustomer(12);

    expect(fromMock).toHaveBeenCalledWith("customers");
    expect(eqMock).toHaveBeenCalledWith("id", 12);
  });
});

describe("saveCustomerActivity", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();

    singleMock.mockResolvedValue({
      data: {
        id: 3,
        customer_id: 10,
        title: "Call back",
        status: "open",
        pharmacy_id: "ph-1",
      },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    upsertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReturnValue({ upsert: upsertMock });
  });

  it("upserts activity with default open status", async () => {
    const activity: CustomerActivity = {
      id: 3,
      customerId: 10,
      title: "Call back",
      type: "call",
    };

    const saved = await saveCustomerActivity(activity);

    expect(fromMock).toHaveBeenCalledWith("customer_activities");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 10,
        title: "Call back",
        status: "open",
        pharmacy_id: "ph-1",
      }),
    );
    expect(saved.title).toBe("Call back");
  });
});

describe("updateCustomerActivityStatus", () => {
  beforeEach(() => {
    updateMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock });
  });

  it("updates activity status and timestamp", async () => {
    await updateCustomerActivityStatus(7, "done");

    expect(fromMock).toHaveBeenCalledWith("customer_activities");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        updated_at: expect.any(String),
      }),
    );
    expect(eqMock).toHaveBeenCalledWith("id", 7);
  });

  it("throws sql_migration_required when table is missing", async () => {
    eqMock.mockResolvedValue({
      error: { message: "schema cache issue for customer_activities" },
    });

    await expect(updateCustomerActivityStatus(7, "done")).rejects.toThrow(
      "sql_migration_required",
    );
  });
});

describe("deleteCustomerActivity", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ delete: deleteMock });
  });

  it("deletes activity by id", async () => {
    await deleteCustomerActivity(9);

    expect(fromMock).toHaveBeenCalledWith("customer_activities");
    expect(eqMock).toHaveBeenCalledWith("id", 9);
  });
});
