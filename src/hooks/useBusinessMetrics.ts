import { useMemo } from "react";
import { buildBranchReportRows } from "../utils/branchReports";
import { getDashboardDateRange, type DashboardPeriod } from "../utils/dashboardDateRange";
import { formatDateInput } from "../utils/date";
import { safeNumber } from "../utils/safeNumber";
import type {
  ActivityLog,
  AppUser,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  PaymentMethod,
  PharmacyCost,
  PharmacySettings,
  ReturnRecord,
  SubscriptionRequest,
} from "../types";

type TopSellingMedicine = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type TopCashier = {
  cashierName: string;
  totalSales: number;
  invoicesCount: number;
};

function aggregateTopSellingMedicines(invoices: Invoice[]): TopSellingMedicine[] {
  return Object.values(
    invoices
      .flatMap((invoice) => invoice.items || [])
      .reduce(
        (result, item) => {
          const key = String(item.medicineId);

          if (!result[key]) {
            result[key] = {
              medicineId: Number(item.medicineId) || 0,
              name_ar: item.name_ar,
              name_en: item.name_en,
              quantity: 0,
              total: 0,
            };
          }

          result[key].quantity += item.quantity || 0;
          result[key].total += item.lineTotal || 0;

          return result;
        },
        {} as Record<string, TopSellingMedicine>,
      ),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

function aggregateTopCashiers(invoices: Invoice[], unknownCashierLabel: string): TopCashier[] {
  return Object.values(
    invoices.reduce(
      (result, invoice) => {
        const cashierName = invoice.cashierName || unknownCashierLabel;

        if (!result[cashierName]) {
          result[cashierName] = {
            cashierName,
            totalSales: 0,
            invoicesCount: 0,
          };
        }

        result[cashierName].totalSales += safeNumber(invoice.total);
        result[cashierName].invoicesCount += 1;

        return result;
      },
      {} as Record<string, TopCashier>,
    ),
  )
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);
}

type UseBusinessMetricsParams = {
  invoices: Invoice[];
  returns: ReturnRecord[];
  customerPayments: CustomerPayment[];
  pharmacyCosts: PharmacyCost[];
  activityLogs: ActivityLog[];
  subscriptionRequests: SubscriptionRequest[];
  branches: PharmacySettings[];
  reportFrom: string;
  reportTo: string;
  dashboardPeriod: DashboardPeriod;
  dashboardFromDate: string;
  dashboardToDate: string;
  invoiceSearch: string;
  invoicePaymentFilter: "all" | PaymentMethod;
  invoiceFromDate: string;
  invoiceToDate: string;
  isArabic: boolean;
  showBranchBreakdown: boolean;
  appUser: AppUser | null;
  getPharmacyId: () => string;
};

export function useBusinessMetrics({
  invoices,
  returns,
  customerPayments,
  pharmacyCosts,
  activityLogs,
  subscriptionRequests,
  branches,
  reportFrom,
  reportTo,
  dashboardPeriod,
  dashboardFromDate,
  dashboardToDate,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  isArabic,
  showBranchBreakdown,
  appUser,
  getPharmacyId,
}: UseBusinessMetricsParams) {
  const unknownCashierLabel = isArabic ? "غير محدد" : "Unknown";

  const filteredInvoicesList = useMemo(() => {
    return invoices.filter((invoice) => {
      const searchValue = invoiceSearch.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        String(invoice.invoiceNumber || invoice.id || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(invoice.customerName || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(invoice.cashierName || "")
          .toLowerCase()
          .includes(searchValue);

      const matchesPayment =
        invoicePaymentFilter === "all" || invoice.paymentMethod === invoicePaymentFilter;

      const invoiceDate = new Date(invoice.createdAt || invoice.date);
      const fromDate = invoiceFromDate ? new Date(`${invoiceFromDate}T00:00:00`) : null;
      const toDate = invoiceToDate ? new Date(`${invoiceToDate}T23:59:59`) : null;

      const matchesFrom = !fromDate || invoiceDate >= fromDate;
      const matchesTo = !toDate || invoiceDate <= toDate;

      return matchesSearch && matchesPayment && matchesFrom && matchesTo;
    });
  }, [invoices, invoiceSearch, invoicePaymentFilter, invoiceFromDate, invoiceToDate]);

  const dashboardDateRange = useMemo(
    () => getDashboardDateRange(dashboardPeriod, dashboardFromDate, dashboardToDate),
    [dashboardPeriod, dashboardFromDate, dashboardToDate],
  );

  const dashboardInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || invoice.date);
      return invoiceDate >= dashboardDateRange.from && invoiceDate <= dashboardDateRange.to;
    });
  }, [invoices, dashboardDateRange.from, dashboardDateRange.to]);

  const dashboardSalesTotal = useMemo(
    () => dashboardInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0),
    [dashboardInvoices],
  );

  const dashboardProfitTotal = useMemo(
    () => dashboardInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.totalProfit), 0),
    [dashboardInvoices],
  );

  const dashboardInvoicesCount = dashboardInvoices.length;

  const dashboardSalesTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    const cursor = new Date(dashboardDateRange.from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(dashboardDateRange.to);
    let guard = 0;
    while (cursor <= end && guard < 120) {
      buckets.set(formatDateInput(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    dashboardInvoices.forEach((invoice) => {
      const key = formatDateInput(new Date(invoice.createdAt || invoice.date));
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) || 0) + safeNumber(invoice.total));
      }
    });
    return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
  }, [dashboardDateRange.from, dashboardDateRange.to, dashboardInvoices]);

  const dashboardPaymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    dashboardInvoices.forEach((invoice) => {
      const method = invoice.paymentMethod || "cash";
      map.set(method, (map.get(method) || 0) + safeNumber(invoice.total));
    });
    return Array.from(map.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);
  }, [dashboardInvoices]);

  const dashboardTopSellingMedicines = useMemo(
    () => aggregateTopSellingMedicines(dashboardInvoices),
    [dashboardInvoices],
  );

  const dashboardTopCashiers = useMemo(
    () => aggregateTopCashiers(dashboardInvoices, unknownCashierLabel),
    [dashboardInvoices, unknownCashierLabel],
  );

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || invoice.date).toDateString();
      return invoiceDate === today;
    });

    return {
      todaySalesTotal: todayInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0),
      todayInvoicesCount: todayInvoices.length,
      todayProfitTotal: todayInvoices.reduce(
        (sum, invoice) => sum + safeNumber(invoice.totalProfit),
        0,
      ),
    };
  }, [invoices]);

  const monthStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || invoice.date);
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
    });

    return {
      monthSalesTotal: monthInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0),
      monthProfitTotal: monthInvoices.reduce(
        (sum, invoice) => sum + safeNumber(invoice.totalProfit),
        0,
      ),
    };
  }, [invoices]);

  const totalInvoicesCount = invoices.length;
  const totalSalesAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  const totalCustomerPayments = customerPayments.reduce(
    (sum, payment) => sum + safeNumber(payment.amount),
    0,
  );

  const topCashiers = useMemo(
    () => aggregateTopCashiers(invoices, unknownCashierLabel),
    [invoices, unknownCashierLabel],
  );

  const filteredReportInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const date = new Date(invoice.createdAt || invoice.date);
      const from = new Date(`${reportFrom}T00:00:00`);
      const to = new Date(`${reportTo}T23:59:59`);
      return date >= from && date <= to;
    });
  }, [invoices, reportFrom, reportTo]);

  const filteredReportTotal = useMemo(
    () => filteredReportInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0),
    [filteredReportInvoices],
  );

  const customerDebts: CustomerDebt[] = useMemo(() => {
    return Object.values(
      invoices
        .filter(
          (invoice) =>
            invoice.paymentMethod === "credit" &&
            invoice.customerName &&
            invoice.customerName.trim(),
        )
        .reduce(
          (result, invoice) => {
            const customerName = invoice.customerName?.trim() || "-";

            if (!result[customerName]) {
              result[customerName] = {
                customerName,
                totalDebt: 0,
                invoicesCount: 0,
                lastInvoiceDate: invoice.date || "-",
                invoices: [],
              };
            }

            result[customerName].totalDebt += safeNumber(invoice.total);
            result[customerName].invoicesCount += 1;
            result[customerName].lastInvoiceDate = invoice.date || "-";
            result[customerName].invoices.push(invoice);

            return result;
          },
          {} as Record<string, CustomerDebt>,
        ),
    )
      .map((customer) => {
        const paidAmount = customerPayments
          .filter((payment) => payment.customerName === customer.customerName)
          .reduce((sum, payment) => sum + safeNumber(payment.amount), 0);

        return {
          ...customer,
          paidAmount,
          remainingDebt: Math.max(0, customer.totalDebt - paidAmount),
        };
      })
      .sort((a, b) => b.remainingDebt - a.remainingDebt);
  }, [invoices, customerPayments]);

  const totalCustomerRemainingDebt = useMemo(
    () => customerDebts.reduce((sum, customer) => sum + safeNumber(customer.remainingDebt), 0),
    [customerDebts],
  );

  const subscriptionRenewLogs = useMemo(
    () => activityLogs.filter((log) => log.type === "subscription_renew").slice(0, 10),
    [activityLogs],
  );

  const pharmacySubscriptionRequests = useMemo(
    () => subscriptionRequests.filter((request) => request.pharmacyId === getPharmacyId()),
    [subscriptionRequests, getPharmacyId],
  );

  const filteredReportProfitTotal = useMemo(
    () => filteredReportInvoices.reduce((sum, invoice) => sum + (invoice.totalProfit || 0), 0),
    [filteredReportInvoices],
  );

  const filteredReportDiscountTotal = useMemo(
    () => filteredReportInvoices.reduce((sum, invoice) => sum + (invoice.discount || 0), 0),
    [filteredReportInvoices],
  );

  const reportPaymentTotals = useMemo(() => {
    return filteredReportInvoices.reduce(
      (result, invoice) => {
        const method = invoice.paymentMethod || "cash";
        result[method] = (result[method] || 0) + (invoice.total || 0);
        return result;
      },
      {} as Record<string, number>,
    );
  }, [filteredReportInvoices]);

  const reportCashierTotals = useMemo(() => {
    return filteredReportInvoices.reduce(
      (result, invoice) => {
        const cashierName = invoice.cashierName || unknownCashierLabel;
        result[cashierName] = (result[cashierName] || 0) + (invoice.total || 0);
        return result;
      },
      {} as Record<string, number>,
    );
  }, [filteredReportInvoices, unknownCashierLabel]);

  const topSellingMedicines = useMemo(
    () => aggregateTopSellingMedicines(filteredReportInvoices),
    [filteredReportInvoices],
  );

  const reportSalesTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const invoice of filteredReportInvoices) {
      const key = (invoice.createdAt || invoice.date || "").slice(0, 10);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (invoice.total || 0));
    }
    const from = new Date(`${reportFrom}T00:00:00`);
    const to = new Date(`${reportTo}T00:00:00`);
    const dayMs = 86400000;
    const span = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
    if (span > 0 && span <= 62) {
      const points: { date: string; total: number }[] = [];
      for (let i = 0; i < span; i++) {
        const key = formatDateInput(new Date(from.getTime() + i * dayMs));
        points.push({ date: key, total: map.get(key) || 0 });
      }
      return points;
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, total]) => ({ date, total }));
  }, [filteredReportInvoices, reportFrom, reportTo]);

  const reportPaymentBreakdown = useMemo(
    () =>
      Object.entries(reportPaymentTotals)
        .map(([method, total]) => ({ method, total }))
        .filter((slice) => slice.total > 0)
        .sort((a, b) => b.total - a.total),
    [reportPaymentTotals],
  );

  const reportUnitsSold = useMemo(
    () =>
      filteredReportInvoices.reduce(
        (sum, invoice) =>
          sum + (invoice.items || []).reduce((s, item) => s + (item.quantity || 0), 0),
        0,
      ),
    [filteredReportInvoices],
  );

  const reportReturnsTotal = useMemo(
    () =>
      returns
        .filter((record) => {
          const key = (record.createdAt || record.date || "").slice(0, 10);
          return key && key >= reportFrom && key <= reportTo;
        })
        .reduce((sum, record) => sum + safeNumber(record.total), 0),
    [returns, reportFrom, reportTo],
  );

  const filteredReportCosts = useMemo(() => {
    return pharmacyCosts.filter((cost) => {
      const date = new Date(cost.createdAt || cost.date || 0);
      const from = new Date(`${reportFrom}T00:00:00`);
      const to = new Date(`${reportTo}T23:59:59`);
      return date >= from && date <= to;
    });
  }, [pharmacyCosts, reportFrom, reportTo]);

  const reportCostsTotal = useMemo(
    () => filteredReportCosts.reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
    [filteredReportCosts],
  );

  const reportCostsCount = filteredReportCosts.length;

  const reportCostsByCategory = useMemo(
    () =>
      Object.entries(
        filteredReportCosts.reduce(
          (result, cost) => {
            const key = cost.category || "other";
            result[key] = (result[key] || 0) + safeNumber(cost.amount);
            return result;
          },
          {} as Record<string, number>,
        ),
      )
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
    [filteredReportCosts],
  );

  const netProfitAfterCosts = filteredReportProfitTotal - reportCostsTotal;

  const reportBranchRows = useMemo(
    () =>
      showBranchBreakdown
        ? buildBranchReportRows({
            branches,
            invoices,
            returns,
            costs: pharmacyCosts,
            reportFrom,
            reportTo,
            isArabic,
            fallbackBranchId: appUser?.pharmacyId,
          })
        : [],
    [
      showBranchBreakdown,
      branches,
      invoices,
      returns,
      pharmacyCosts,
      reportFrom,
      reportTo,
      isArabic,
      appUser?.pharmacyId,
    ],
  );

  const dashboardBranchRows = useMemo(
    () =>
      showBranchBreakdown
        ? buildBranchReportRows({
            branches,
            invoices,
            returns,
            costs: pharmacyCosts,
            reportFrom: formatDateInput(dashboardDateRange.from),
            reportTo: formatDateInput(dashboardDateRange.to),
            isArabic,
            fallbackBranchId: appUser?.pharmacyId,
          })
        : [],
    [
      showBranchBreakdown,
      branches,
      invoices,
      returns,
      pharmacyCosts,
      dashboardDateRange.from,
      dashboardDateRange.to,
      isArabic,
      appUser?.pharmacyId,
    ],
  );

  return {
    filteredInvoicesList,
    dashboardSalesTotal,
    dashboardInvoicesCount,
    dashboardProfitTotal,
    dashboardSalesTrend,
    dashboardPaymentBreakdown,
    dashboardTopSellingMedicines,
    dashboardTopCashiers,
    todaySalesTotal: todayStats.todaySalesTotal,
    todayInvoicesCount: todayStats.todayInvoicesCount,
    todayProfitTotal: todayStats.todayProfitTotal,
    monthSalesTotal: monthStats.monthSalesTotal,
    monthProfitTotal: monthStats.monthProfitTotal,
    totalInvoicesCount,
    totalSalesAmount,
    totalCustomerPayments,
    topCashiers,
    filteredReportInvoices,
    filteredReportTotal,
    customerDebts,
    totalCustomerRemainingDebt,
    subscriptionRenewLogs,
    pharmacySubscriptionRequests,
    filteredReportProfitTotal,
    filteredReportDiscountTotal,
    reportPaymentTotals,
    reportCashierTotals,
    topSellingMedicines,
    reportSalesTrend,
    reportPaymentBreakdown,
    reportUnitsSold,
    reportReturnsTotal,
    filteredReportCosts,
    reportCostsTotal,
    reportCostsCount,
    reportCostsByCategory,
    netProfitAfterCosts,
    reportBranchRows,
    dashboardBranchRows,
  };
}
