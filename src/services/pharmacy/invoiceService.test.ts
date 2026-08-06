import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "../../types";

const selectMock = vi.fn();
const insertMock = vi.fn();
const singleMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

const attachInvoiceItemsMock = vi.fn();

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
  attachInvoiceItems: (...args: unknown[]) => attachInvoiceItemsMock(...args),
}));

vi.mock("./dbHelpers", () => ({
  createManagedRealtimeChannel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  disposeManagedRealtimeChannel: vi.fn(),
}));

import { searchInvoiceForReturn, searchInvoicesForReturnByBarcode } from "./invoiceService";

const sampleInvoices: Invoice[] = [
  {
    id: 1,
    invoiceNumber: "INV-100",
    customerName: "Ahmed",
    customerPhone: "0100",
    items: [
      {
        medicineId: 1,
        name_ar: "باراسيتامول",
        name_en: "Paracetamol",
        barcode: "6221234567890",
        quantity: 2,
        unitPrice: 10,
        lineTotal: 20,
      },
    ],
  },
  {
    id: 2,
    invoiceNumber: "INV-200",
    customerName: "Sara",
    items: [
      {
        medicineId: 2,
        name_ar: "فيتامين",
        name_en: "Vitamin",
        barcode: "999",
        quantity: 1,
        unitPrice: 30,
        lineTotal: 30,
      },
    ],
  },
];

function mockGetInvoices(invoices: Invoice[]) {
  attachInvoiceItemsMock.mockResolvedValue(invoices);
  limitMock.mockResolvedValue({ data: invoices, error: null });
  orderMock.mockReturnValue({ limit: limitMock });
  selectMock.mockReturnValue({ order: orderMock });
  fromMock.mockReturnValue({ select: selectMock });
}

describe("searchInvoicesForReturnByBarcode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list for blank barcode", async () => {
    await expect(searchInvoicesForReturnByBarcode("   ")).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("finds invoices containing the exact barcode", async () => {
    mockGetInvoices(sampleInvoices);

    const matches = await searchInvoicesForReturnByBarcode("6221234567890");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.invoiceNumber).toBe("INV-100");
  });
});

describe("searchInvoiceForReturn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list for blank query", async () => {
    await expect(searchInvoiceForReturn("")).resolves.toEqual([]);
  });

  it("matches invoice number, customer, phone, barcode, or item name", async () => {
    mockGetInvoices(sampleInvoices);

    await expect(searchInvoiceForReturn("inv-100")).resolves.toHaveLength(1);
    await expect(searchInvoiceForReturn("ahmed")).resolves.toHaveLength(1);
    await expect(searchInvoiceForReturn("0100")).resolves.toHaveLength(1);
    await expect(searchInvoiceForReturn("622123")).resolves.toHaveLength(1);
    await expect(searchInvoiceForReturn("paracet")).resolves.toHaveLength(1);
    await expect(searchInvoiceForReturn("missing")).resolves.toHaveLength(0);
  });
});
