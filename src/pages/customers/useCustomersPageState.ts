import { useEffect, useState } from "react";
import type {
  CreditSubTab,
  CustomerCrmTab,
  PharmacySubTab,
} from "../../components/customers/CustomerCrmTabs";
import { useCrmCatalogState } from "./hooks/useCrmCatalogState";
import { useCrmCustomerActions } from "./hooks/useCrmCustomerActions";
import { useCustomerCreditPaymentsState } from "./hooks/useCustomerCreditPaymentsState";
import type { CustomersPageProps } from "./types";

export function useCustomersPageState(props: CustomersPageProps) {
  const {
    isArabic,
    t,
    customerDebts,
    customerPayments,
    invoices = [],
    totalCustomerPayments,
    appUser,
    user,
    isSubscriptionExpired,
    canCollectPayments,
    canDeletePayments,
    getPaymentLabel,
    getPharmacyId,
    pharmacySettings,
    onActivityLog,
    onViewInvoice,
    openPaymentModalRequest = 0,
    onOpenPaymentModalRequestConsumed,
    initialCustomerSearch = "",
    onInitialCustomerSearchConsumed,
  } = props;

  const [activeTab, setActiveTab] = useState<CustomerCrmTab>("pharmacy");
  const [creditSubTab, setCreditSubTab] = useState<CreditSubTab>("debts");
  const [pharmacySubTab, setPharmacySubTab] = useState<PharmacySubTab>("list");

  const catalog = useCrmCatalogState({
    isArabic,
    currency: t.currency,
    pharmacySettings,
    getPaymentLabel,
    getPharmacyId,
    invoices,
    customerDebts,
    customerPayments,
  });

  const actions = useCrmCustomerActions({
    isArabic,
    isSubscriptionExpired,
    getPharmacyId,
    setCrmCustomers: catalog.setCrmCustomers,
    setSuppliers: catalog.setSuppliers,
    setCustomerActivities: catalog.setCustomerActivities,
  });

  const credit = useCustomerCreditPaymentsState({
    isArabic,
    currency: t.currency,
    isSubscriptionExpired,
    canCollectPayments,
    canDeletePayments,
    customerDebts,
    customerPayments,
    getPharmacyId,
    userUid: user?.uid || "",
    appUserName: appUser?.name || "",
    exportCtx: catalog.exportCtx,
    onActivityLog,
  });

  useEffect(() => {
    if (!openPaymentModalRequest) return;
    setActiveTab("credit");
    setCreditSubTab("debts");
    credit.setCustomerDebtFilter("debt");
    credit.openCustomerPaymentModal();
    onOpenPaymentModalRequestConsumed?.();
    // Intentionally keyed only on the request tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPaymentModalRequest]);

  useEffect(() => {
    if (!initialCustomerSearch.trim()) return;
    setActiveTab("pharmacy");
    setPharmacySubTab("list");
    catalog.setCrmSearch(initialCustomerSearch);
    credit.setCustomerSearch(initialCustomerSearch);
    onInitialCustomerSearchConsumed?.();
  }, [initialCustomerSearch, onInitialCustomerSearchConsumed]);

  return {
    isArabic,
    t,
    customerDebts,
    customerPayments,
    invoices,
    totalCustomerPayments,
    appUser,
    isSubscriptionExpired,
    canCollectPayments,
    canDeletePayments,
    getPaymentLabel,
    activeTab,
    setActiveTab,
    creditSubTab,
    setCreditSubTab,
    pharmacySubTab,
    setPharmacySubTab,
    crmProfiles: catalog.crmProfiles,
    filteredCrmProfiles: catalog.filteredCrmProfiles,
    registeredCustomersCount: catalog.registeredCustomersCount,
    suppliers: catalog.suppliers,
    filteredSuppliers: catalog.filteredSuppliers,
    customerActivities: catalog.customerActivities,
    crmSearch: catalog.crmSearch,
    setCrmSearch: catalog.setCrmSearch,
    crmSegmentFilter: catalog.crmSegmentFilter,
    setCrmSegmentFilter: catalog.setCrmSegmentFilter,
    followUpStatusFilter: catalog.followUpStatusFilter,
    setFollowUpStatusFilter: catalog.setFollowUpStatusFilter,
    selectedProfile: actions.selectedProfile,
    setSelectedProfile: actions.setSelectedProfile,
    customerFormOpen: actions.customerFormOpen,
    setCustomerFormOpen: actions.setCustomerFormOpen,
    customerFormInitial: actions.customerFormInitial,
    setCustomerFormInitial: actions.setCustomerFormInitial,
    savingCustomer: actions.savingCustomer,
    supplierFormOpen: actions.supplierFormOpen,
    setSupplierFormOpen: actions.setSupplierFormOpen,
    supplierFormInitial: actions.supplierFormInitial,
    setSupplierFormInitial: actions.setSupplierFormInitial,
    savingSupplier: actions.savingSupplier,
    supplierSearch: catalog.supplierSearch,
    setSupplierSearch: catalog.setSupplierSearch,
    customerSearch: credit.customerSearch,
    setCustomerSearch: credit.setCustomerSearch,
    customerDebtFilter: credit.customerDebtFilter,
    setCustomerDebtFilter: credit.setCustomerDebtFilter,
    paymentSearch: credit.paymentSearch,
    setPaymentSearch: credit.setPaymentSearch,
    paymentCustomerName: credit.paymentCustomerName,
    setPaymentCustomerName: credit.setPaymentCustomerName,
    paymentAmount: credit.paymentAmount,
    setPaymentAmount: credit.setPaymentAmount,
    paymentMethodForDebt: credit.paymentMethodForDebt,
    setPaymentMethodForDebt: credit.setPaymentMethodForDebt,
    paymentNotes: credit.paymentNotes,
    setPaymentNotes: credit.setPaymentNotes,
    showCustomerPaymentModal: credit.showCustomerPaymentModal,
    setShowCustomerPaymentModal: credit.setShowCustomerPaymentModal,
    selectedCustomer: credit.selectedCustomer,
    setSelectedCustomer: credit.setSelectedCustomer,
    openFollowUpsCount: catalog.openFollowUpsCount,
    exportCtx: catalog.exportCtx,
    filteredCustomerDebts: credit.filteredCustomerDebts,
    filteredCustomerPayments: credit.filteredCustomerPayments,
    totalDebts: credit.totalDebts,
    totalPaid: credit.totalPaid,
    totalRemaining: credit.totalRemaining,
    getCustomerPayments: credit.getCustomerPayments,
    openCustomerPaymentModal: credit.openCustomerPaymentModal,
    saveCrmCustomer: actions.saveCrmCustomer,
    saveSupplier: actions.saveSupplier,
    deleteSupplier: actions.deleteSupplier,
    addCustomerActivity: actions.addCustomerActivity,
    updateActivityStatus: actions.updateActivityStatus,
    openProfile: actions.openProfile,
    openEditCustomer: actions.openEditCustomer,
    deleteCrmCustomer: actions.deleteCrmCustomer,
    openRegisterInferred: actions.openRegisterInferred,
    saveCustomerPayment: credit.saveCustomerPayment,
    deleteCustomerPayment: credit.deleteCustomerPayment,
    onViewInvoice,
  };
}

export type CustomersPageState = ReturnType<typeof useCustomersPageState>;
