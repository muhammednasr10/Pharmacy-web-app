import { ReturnsPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppReturnsRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "returns"
  | "filteredInvoicesList"
  | "invoiceSearch"
  | "invoicePaymentFilter"
  | "invoiceFromDate"
  | "invoiceToDate"
  | "setInvoiceSearch"
  | "setInvoicePaymentFilter"
  | "setInvoiceFromDate"
  | "setInvoiceToDate"
  | "exportInvoicesCSV"
  | "exportReturnsCSV"
  | "getPaymentLabel"
  | "getReturnTypeLabel"
  | "getRefundMethodLabel"
  | "getReturnItemsSummary"
  | "setSelectedReturn"
  | "handleDeleteReturn"
  | "setSelectedInvoice"
  | "openReturnModal"
  | "printSavedInvoice"
  | "canUseReturns"
  | "canDeleteReturn"
  | "deletingReturnId"
  | "isViewingAllBranches"
  | "resolveBranchLabel"
  | "t"
  | "isArabic"
  | "safeNumber"
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppReturnsRoute({
  displayPage,
  canOpenPage,
  returns,
  filteredInvoicesList,
  invoiceSearch,
  invoicePaymentFilter,
  invoiceFromDate,
  invoiceToDate,
  setInvoiceSearch,
  setInvoicePaymentFilter,
  setInvoiceFromDate,
  setInvoiceToDate,
  exportInvoicesCSV,
  exportReturnsCSV,
  getPaymentLabel,
  getReturnTypeLabel,
  getRefundMethodLabel,
  getReturnItemsSummary,
  setSelectedReturn,
  handleDeleteReturn,
  setSelectedInvoice,
  openReturnModal,
  printSavedInvoice,
  canUseReturns,
  canDeleteReturn,
  deletingReturnId,
  isViewingAllBranches,
  resolveBranchLabel,
  t,
  isArabic,
  safeNumber,
  subscriptionBlocksWrite,
}: AppReturnsRouteProps) {
  if (displayPage !== "returns" || !canOpenPage("returns")) return null;

  return (
    <ReturnsPage
      returns={returns}
      filteredInvoicesList={filteredInvoicesList}
      invoiceSearch={invoiceSearch}
      invoicePaymentFilter={invoicePaymentFilter}
      invoiceFromDate={invoiceFromDate}
      invoiceToDate={invoiceToDate}
      setInvoiceSearch={setInvoiceSearch}
      setInvoicePaymentFilter={setInvoicePaymentFilter}
      setInvoiceFromDate={setInvoiceFromDate}
      setInvoiceToDate={setInvoiceToDate}
      exportInvoicesCSV={exportInvoicesCSV}
      exportReturnsCSV={exportReturnsCSV}
      getPaymentLabel={getPaymentLabel}
      getReturnTypeLabel={getReturnTypeLabel}
      getRefundMethodLabel={getRefundMethodLabel}
      getReturnItemsSummary={getReturnItemsSummary}
      onViewReturn={setSelectedReturn}
      onDeleteReturn={(record) => void handleDeleteReturn(record)}
      onViewInvoice={setSelectedInvoice}
      onReturnInvoice={openReturnModal}
      onPrintInvoice={printSavedInvoice}
      canUseReturns={canUseReturns()}
      canCreateReturn={canUseReturns() && !subscriptionBlocksWrite}
      canDeleteReturn={canDeleteReturn() && !subscriptionBlocksWrite}
      deletingReturnId={deletingReturnId}
      showBranchColumn={isViewingAllBranches}
      getBranchLabel={resolveBranchLabel}
      t={t}
      isArabic={isArabic}
      currency={t.currency}
      safeNumber={safeNumber}
    />
  );
}
