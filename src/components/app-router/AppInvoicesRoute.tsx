import { InvoicesPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppInvoicesRouteProps = Pick<
  AppPageRouterProps,
  | "filteredInvoicesList"
  | "isViewingAllBranches"
  | "resolveBranchLabel"
  | "invoiceSearch"
  | "invoicePaymentFilter"
  | "invoiceFromDate"
  | "invoiceToDate"
  | "setInvoiceSearch"
  | "setInvoicePaymentFilter"
  | "setInvoiceFromDate"
  | "setInvoiceToDate"
  | "exportInvoicesCSV"
  | "getPaymentLabel"
  | "setSelectedInvoice"
  | "openReturnModal"
  | "printSavedInvoice"
  | "canUseReturns"
  | "returns"
  | "t"
  | "isArabic"
>;

export default function AppInvoicesRoute({
  filteredInvoicesList,
  isViewingAllBranches,
  resolveBranchLabel,
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
  setSelectedInvoice,
  openReturnModal,
  printSavedInvoice,
  canUseReturns,
  returns,
  t,
  isArabic,
}: AppInvoicesRouteProps) {
  return (
    <InvoicesPage
      filteredInvoicesList={filteredInvoicesList}
      showBranchColumn={isViewingAllBranches}
      getBranchLabel={resolveBranchLabel}
      invoiceSearch={invoiceSearch}
      invoicePaymentFilter={invoicePaymentFilter}
      invoiceFromDate={invoiceFromDate}
      invoiceToDate={invoiceToDate}
      setInvoiceSearch={setInvoiceSearch}
      setInvoicePaymentFilter={setInvoicePaymentFilter}
      setInvoiceFromDate={setInvoiceFromDate}
      setInvoiceToDate={setInvoiceToDate}
      exportInvoicesCSV={exportInvoicesCSV}
      getPaymentLabel={getPaymentLabel}
      onViewInvoice={setSelectedInvoice}
      onReturnInvoice={openReturnModal}
      onPrintInvoice={printSavedInvoice}
      canUseReturns={canUseReturns()}
      returns={returns}
      t={t}
      isArabic={isArabic}
      currency={t.currency}
    />
  );
}
