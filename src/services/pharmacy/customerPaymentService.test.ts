import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerPayment } from "../../types";

const getRowsMock = vi.fn();
const subscribeTableMock = vi.fn();
const insertMock = vi.fn();
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
  deleteCustomerPayment,
  getCustomerPayments,
  saveCustomerPayment,
  subscribeCustomerPayments,
} from "./customerPaymentService";

describe("getCustomerPayments", () => {
  beforeEach(() => {
    getRowsMock.mockReset();
  });

  it("loads customer payments from scoped table", async () => {
    getRowsMock.mockResolvedValue([{ id: 1, paymentNumber: "PAY-1", amount: 100 }]);

    const rows = await getCustomerPayments();

    expect(getRowsMock).toHaveBeenCalledWith(
      "customer_payments",
      "id",
      false,
      100,
      undefined,
      true,
    );
    expect(rows[0]?.paymentNumber).toBe("PAY-1");
  });
});

describe("subscribeCustomerPayments", () => {
  it("wires subscription through subscribeTable", () => {
    subscribeTableMock.mockReturnValue(() => undefined);

    const unsubscribe = subscribeCustomerPayments(() => undefined);

    expect(subscribeTableMock).toHaveBeenCalledWith(
      "customer_payments",
      expect.any(Function),
      "id",
      false,
      100,
      undefined,
      true,
    );
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("saveCustomerPayment", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });
  });

  it("inserts stamped payment payload", async () => {
    const payment: CustomerPayment = {
      id: 5,
      paymentNumber: "PAY-100",
      customerId: 10,
      customerName: "Ahmed",
      amount: 250,
      paymentMethod: "cash",
      date: "2026-08-05",
    };

    await saveCustomerPayment(payment);

    expect(fromMock).toHaveBeenCalledWith("customer_payments");
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        payment_number: "PAY-100",
        customer_id: 10,
        customer_name: "Ahmed",
        amount: 250,
        payment_method: "cash",
        pharmacy_id: "ph-1",
      }),
    ]);
  });

  it("throws when insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(
      saveCustomerPayment({
        id: 1,
        paymentNumber: "PAY-1",
        customerId: 1,
        amount: 50,
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("insert failed");
  });
});

describe("deleteCustomerPayment", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ delete: deleteMock });
  });

  it("deletes payment by payment number", async () => {
    await deleteCustomerPayment("PAY-100");

    expect(fromMock).toHaveBeenCalledWith("customer_payments");
    expect(eqMock).toHaveBeenCalledWith("payment_number", "PAY-100");
  });

  it("throws when delete fails", async () => {
    eqMock.mockResolvedValue({ error: { message: "delete failed" } });

    await expect(deleteCustomerPayment("PAY-404")).rejects.toThrow("delete failed");
  });
});
