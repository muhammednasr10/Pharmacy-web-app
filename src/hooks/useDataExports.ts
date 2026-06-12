import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  CustomerPayment,
  Invoice,
  Medicine,
  PharmacySettings,
  PurchaseRecord,
  ReturnRecord,
} from "../types";
import {
  downloadInventoryCsv,
  downloadInvoicesCsv,
  downloadPharmacyBackupCsv,
  downloadReturnsCsv,
} from "../utils/pharmacyDataExports";
import { getReportQuickRange, type ReportQuickRangePreset } from "../utils/reportDateRange";

type UseDataExportsOptions = {
  isArabic: boolean;
  pharmacySettings: PharmacySettings | null;
  medicines: Medicine[];
  filteredMedicines: Medicine[];
  invoices: Invoice[];
  filteredInvoicesList: Invoice[];
  returns: ReturnRecord[];
  purchases: PurchaseRecord[];
  customerPayments: CustomerPayment[];
  isViewingAllBranches: boolean;
  getPaymentLabel: (method: string) => string;
  resolveBranchLabel: (branchId: string | undefined) => string;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  getReturnItemsSummary: (record: ReturnRecord) => string;
  setReportFrom: Dispatch<SetStateAction<string>>;
  setReportTo: Dispatch<SetStateAction<string>>;
};

export function useDataExports({
  isArabic,
  pharmacySettings,
  medicines,
  filteredMedicines,
  invoices,
  filteredInvoicesList,
  returns,
  purchases,
  customerPayments,
  isViewingAllBranches,
  getPaymentLabel,
  resolveBranchLabel,
  getReturnTypeLabel,
  getRefundMethodLabel,
  getReturnItemsSummary,
  setReportFrom,
  setReportTo,
}: UseDataExportsOptions) {
  const exportBackupCSV = useCallback(() => {
    downloadPharmacyBackupCsv({
      isArabic,
      pharmacySettings,
      medicines,
      invoices,
      returns,
      purchases,
      customerPayments,
      getPaymentLabel,
    });
  }, [
    customerPayments,
    getPaymentLabel,
    invoices,
    isArabic,
    medicines,
    pharmacySettings,
    purchases,
    returns,
  ]);

  const exportInventoryCSV = useCallback(() => {
    downloadInventoryCsv({ isArabic, medicines: filteredMedicines });
  }, [filteredMedicines, isArabic]);

  const exportInvoicesCSV = useCallback(() => {
    downloadInvoicesCsv({
      isArabic,
      invoices: filteredInvoicesList,
      getPaymentLabel,
    });
  }, [filteredInvoicesList, getPaymentLabel, isArabic]);

  const exportReturnsCSV = useCallback(() => {
    downloadReturnsCsv({
      isArabic,
      returns,
      isViewingAllBranches,
      resolveBranchLabel,
      getReturnTypeLabel,
      getRefundMethodLabel,
      getReturnItemsSummary,
    });
  }, [
    getRefundMethodLabel,
    getReturnItemsSummary,
    getReturnTypeLabel,
    isArabic,
    isViewingAllBranches,
    resolveBranchLabel,
    returns,
  ]);

  const applyReportQuickRange = useCallback(
    (preset: ReportQuickRangePreset) => {
      const { from, to } = getReportQuickRange(preset);
      setReportFrom(from);
      setReportTo(to);
    },
    [setReportFrom, setReportTo],
  );

  return {
    exportBackupCSV,
    exportInventoryCSV,
    exportInvoicesCSV,
    exportReturnsCSV,
    applyReportQuickRange,
  };
}
