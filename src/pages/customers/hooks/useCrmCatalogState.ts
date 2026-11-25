import { useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import type {
  CrmCustomer,
  CustomerActivity,
  CustomerDebt,
  CustomerPayment,
  Invoice,
  PharmacySettings,
  PharmacySupplier,
} from "../../../types";
import { buildCrmCustomerProfiles } from "../../../utils/crmProfiles";
import type { CustomerExportContext } from "../../../utils/customerExportTypes";
import { filterCrmProfiles } from "../../../utils/filterCrmProfiles";

type Params = {
  isArabic: boolean;
  currency: string;
  pharmacySettings: PharmacySettings | null | undefined;
  getPaymentLabel: (method: string) => string;
  getPharmacyId: () => string;
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  customerPayments: CustomerPayment[];
};

export function useCrmCatalogState({
  isArabic,
  currency,
  pharmacySettings,
  getPaymentLabel,
  getPharmacyId,
  invoices,
  customerDebts,
  customerPayments,
}: Params) {
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [customerActivities, setCustomerActivities] = useState<CustomerActivity[]>([]);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSegmentFilter, setCrmSegmentFilter] = useState("all");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState<"open" | "done" | "all">("open");
  const [supplierSearch, setSupplierSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [customers, activities, supplierRows] = await Promise.all([
          pharmacyService.getCrmCustomers(),
          pharmacyService.getCustomerActivities(),
          pharmacyService.getPharmacySuppliers(),
        ]);
        if (!cancelled) {
          setCrmCustomers(customers);
          setCustomerActivities(activities);
          setSuppliers(supplierRows);
        }
      } catch (error) {
        console.error(error);
      }
    };
    void load();
    const cleanups = [
      pharmacyService.subscribeCrmCustomers(setCrmCustomers),
      pharmacyService.subscribeCustomerActivities(setCustomerActivities),
      pharmacyService.subscribePharmacySuppliers(setSuppliers),
    ];
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [getPharmacyId]);

  const crmProfiles = useMemo(
    () =>
      buildCrmCustomerProfiles({
        customers: crmCustomers,
        invoices,
        customerDebts,
        customerPayments,
        activities: customerActivities,
      }),
    [crmCustomers, invoices, customerDebts, customerPayments, customerActivities],
  );

  const filteredCrmProfiles = useMemo(
    () => filterCrmProfiles(crmProfiles, crmSearch, crmSegmentFilter),
    [crmProfiles, crmSearch, crmSegmentFilter],
  );

  const filteredSuppliers = useMemo(() => {
    const searchValue = supplierSearch.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (!searchValue) return true;
      return (
        supplier.name.toLowerCase().includes(searchValue) ||
        (supplier.phone || "").includes(searchValue) ||
        (supplier.company || "").toLowerCase().includes(searchValue) ||
        (supplier.email || "").toLowerCase().includes(searchValue)
      );
    });
  }, [suppliers, supplierSearch]);

  const registeredCustomersCount = useMemo(
    () => crmProfiles.filter((profile) => profile.source === "registered").length,
    [crmProfiles],
  );

  const openFollowUpsCount = useMemo(
    () =>
      customerActivities.filter(
        (activity) => activity.activityType === "follow_up" && activity.status === "open",
      ).length,
    [customerActivities],
  );

  const exportCtx: CustomerExportContext = useMemo(
    () => ({
      isArabic,
      currency,
      pharmacySettings,
      getPaymentLabel,
    }),
    [isArabic, currency, pharmacySettings, getPaymentLabel],
  );

  return {
    crmCustomers,
    setCrmCustomers,
    suppliers,
    setSuppliers,
    customerActivities,
    setCustomerActivities,
    crmSearch,
    setCrmSearch,
    crmSegmentFilter,
    setCrmSegmentFilter,
    followUpStatusFilter,
    setFollowUpStatusFilter,
    supplierSearch,
    setSupplierSearch,
    crmProfiles,
    filteredCrmProfiles,
    filteredSuppliers,
    registeredCustomersCount,
    openFollowUpsCount,
    exportCtx,
  };
}
