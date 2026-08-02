import type {
  CrmCustomer,
  CrmCustomerProfile,
  CustomerActivity,
  CustomerDebt,
  CustomerPayment,
  CustomerSegment,
  Invoice,
} from "../types";

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeCustomerName(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCustomerPhone(value?: string) {
  return (value || "").replace(/\D/g, "");
}

function invoiceMatchesCustomer(invoice: Invoice, name: string, phone: string) {
  const invoiceName = normalizeCustomerName(invoice.customerName || "");
  const targetName = normalizeCustomerName(name);
  if (invoiceName && targetName && invoiceName === targetName) return true;
  const invoicePhone = normalizeCustomerPhone(invoice.customerPhone);
  const targetPhone = normalizeCustomerPhone(phone);
  return Boolean(invoicePhone && targetPhone && invoicePhone === targetPhone);
}

function defaultCrmCustomer(partial: {
  id: number;
  name: string;
  phone?: string;
  segment?: CustomerSegment;
  notes?: string;
  source: "registered" | "inferred";
}): CrmCustomerProfile {
  return {
    id: partial.id,
    name: partial.name,
    phone: partial.phone || "",
    email: "",
    address: "",
    birthDate: "",
    gender: "",
    segment: partial.segment || "regular",
    tags: [],
    notes: partial.notes || "",
    isActive: true,
    source: partial.source,
    totalPurchases: 0,
    purchaseCount: 0,
    averageOrderValue: 0,
    totalDebt: 0,
    paidAmount: 0,
    remainingDebt: 0,
    creditInvoicesCount: 0,
    paymentsCount: 0,
    openFollowUps: 0,
  };
}

export function buildCrmCustomerProfiles(input: {
  customers: CrmCustomer[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
  activities: CustomerActivity[];
}): CrmCustomerProfile[] {
  const { customers, invoices: invoiceRows = [], customerDebts, customerPayments, activities } = input;
  const byKey = new Map<string, CrmCustomerProfile>();

  for (const customer of customers) {
    const key = `id:${customer.id}`;
    byKey.set(key, {
      ...defaultCrmCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        segment: customer.segment,
        notes: customer.notes,
        source: "registered",
      }),
      ...customer,
      tags: customer.tags || [],
      source: "registered",
    });
  }

  for (const invoice of invoiceRows) {
    const name = invoice.customerName?.trim();
    if (!name) continue;
    const phone = invoice.customerPhone || "";
    const existingRegistered = [...byKey.values()].find(
      (profile) =>
        profile.source === "registered" &&
        (normalizeCustomerName(profile.name) === normalizeCustomerName(name) ||
          (normalizeCustomerPhone(profile.phone) &&
            normalizeCustomerPhone(phone) &&
            normalizeCustomerPhone(profile.phone) === normalizeCustomerPhone(phone))),
    );
    const key = existingRegistered ? `id:${existingRegistered.id}` : `name:${normalizeCustomerName(name)}`;
    const profile =
      byKey.get(key) ||
      defaultCrmCustomer({
        id: existingRegistered?.id || -Date.parse(invoice.createdAt || invoice.date || String(Date.now())),
        name,
        phone,
        source: existingRegistered ? "registered" : "inferred",
      });
    profile.totalPurchases += safeNumber(invoice.total);
    profile.purchaseCount += 1;
    profile.lastPurchaseDate = invoice.date || invoice.createdAt || profile.lastPurchaseDate;
    byKey.set(key, profile);
  }

  for (const debt of customerDebts) {
    const key = [...byKey.entries()].find(
      ([, profile]) => normalizeCustomerName(profile.name) === normalizeCustomerName(debt.customerName),
    )?.[0];
    if (!key) {
      byKey.set(`name:${normalizeCustomerName(debt.customerName)}`, {
        ...defaultCrmCustomer({
          id: -Date.now(),
          name: debt.customerName,
          source: "inferred",
        }),
        totalDebt: safeNumber(debt.totalDebt),
        paidAmount: safeNumber(debt.paidAmount),
        remainingDebt: safeNumber(debt.remainingDebt),
        creditInvoicesCount: debt.invoicesCount,
        lastPurchaseDate: debt.lastInvoiceDate,
      });
      continue;
    }
    const profile = byKey.get(key)!;
    profile.totalDebt = safeNumber(debt.totalDebt);
    profile.paidAmount = safeNumber(debt.paidAmount);
    profile.remainingDebt = safeNumber(debt.remainingDebt);
    profile.creditInvoicesCount = debt.invoicesCount;
    profile.lastPurchaseDate = profile.lastPurchaseDate || debt.lastInvoiceDate;
  }

  const profiles = [...byKey.values()].map((profile) => {
    const relatedInvoices = invoiceRows.filter((invoice) =>
      invoiceMatchesCustomer(invoice, profile.name, profile.phone || ""),
    );
    const relatedPayments = customerPayments.filter(
      (payment) => normalizeCustomerName(payment.customerName) === normalizeCustomerName(profile.name),
    );
    const relatedActivities = activities.filter(
      (activity) =>
        activity.customerId === profile.id ||
        normalizeCustomerName(activity.customerName || "") === normalizeCustomerName(profile.name),
    );
    const purchaseCount = relatedInvoices.length || profile.purchaseCount;
    const totalPurchases =
      relatedInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0) ||
      profile.totalPurchases;
    return {
      ...profile,
      purchaseCount,
      totalPurchases,
      averageOrderValue: purchaseCount > 0 ? totalPurchases / purchaseCount : 0,
      paymentsCount: relatedPayments.length,
      openFollowUps: relatedActivities.filter(
        (activity) => activity.status === "open" && activity.activityType === "follow_up",
      ).length,
      lastPurchaseDate:
        profile.lastPurchaseDate ||
        relatedInvoices[0]?.date ||
        relatedInvoices[0]?.createdAt ||
        undefined,
    };
  });

  return profiles.sort((a, b) => {
    if (b.remainingDebt !== a.remainingDebt) return b.remainingDebt - a.remainingDebt;
    return b.totalPurchases - a.totalPurchases;
  });
}

export function getCustomerInvoices(profile: CrmCustomerProfile, invoices: Invoice[] = []) {
  return invoices
    .filter((invoice) => invoiceMatchesCustomer(invoice, profile.name, profile.phone || ""))
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
}

export function getCustomerActivitiesForProfile(
  profile: CrmCustomerProfile,
  activities: CustomerActivity[],
) {
  return activities
    .filter(
      (activity) =>
        activity.customerId === profile.id ||
        normalizeCustomerName(activity.customerName || "") === normalizeCustomerName(profile.name),
    )
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
