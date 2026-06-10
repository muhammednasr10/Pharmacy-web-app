import InvoiceTable from "../components/InvoiceTable";
import type { Invoice, PaymentMethod } from "../types";

type InvoicesPageProps = {
  filteredInvoicesList: Invoice[];
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  invoiceSearch: string;
  invoicePaymentFilter: "all" | PaymentMethod;
  invoiceFromDate: string;
  invoiceToDate: string;
  setInvoiceSearch: (value: string) => void;
  setInvoicePaymentFilter: (value: "all" | PaymentMethod) => void;
  setInvoiceFromDate: (value: string) => void;
  setInvoiceToDate: (value: string) => void;
  exportInvoicesCSV: () => void;
  getPaymentLabel: (method: string) => string;
  onViewInvoice: (invoice: Invoice) => void;
  onReturnInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  canUseReturns: boolean;
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
};

export default function InvoicesPage({
  filteredInvoicesList,
  showBranchColumn = false,
  getBranchLabel,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  setInvoiceSearch,
  setInvoicePaymentFilter,
  setInvoiceFromDate,
  setInvoiceToDate,
  exportInvoicesCSV,
  getPaymentLabel,
  onViewInvoice,
  onReturnInvoice,
  onPrintInvoice,
  canUseReturns,
  t,
  isArabic,
  currency,
}: InvoicesPageProps) {
  return (
    <InvoiceTable
      filteredInvoices={filteredInvoicesList}
      t={t}
      isArabic={isArabic}
      showBranchColumn={showBranchColumn}
      getBranchLabel={getBranchLabel}
      invoiceSearch={invoiceSearch}
      invoicePaymentFilter={invoicePaymentFilter}
      invoiceFromDate={invoiceFromDate}
      invoiceToDate={invoiceToDate}
      setInvoiceSearch={setInvoiceSearch}
      setInvoicePaymentFilter={setInvoicePaymentFilter}
      setInvoiceFromDate={setInvoiceFromDate}
      setInvoiceToDate={setInvoiceToDate}
      onViewInvoice={onViewInvoice}
      onReturnInvoice={onReturnInvoice}
      onPrintInvoice={onPrintInvoice}
      canUseReturns={canUseReturns}
      exportInvoicesCSV={exportInvoicesCSV}
      getPaymentLabel={getPaymentLabel}
    />
  );
}
