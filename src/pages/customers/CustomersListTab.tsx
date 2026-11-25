import CustomerCrmList from "../../components/customers/CustomerCrmList";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersListTab({ state }: Props) {
  const {
    isArabic,
    t,
    activeTab,
    pharmacySubTab,
    filteredCrmProfiles,
    crmSearch,
    crmSegmentFilter,
    setCrmSearch,
    setCrmSegmentFilter,
    setCustomerFormInitial,
    setCustomerFormOpen,
    openProfile,
    openEditCustomer,
    deleteCrmCustomer,
    openRegisterInferred,
    getPaymentLabel,
  } = state;

  if (activeTab !== "pharmacy" || pharmacySubTab !== "list") return null;

  return (
    <CustomerCrmList
      isArabic={isArabic}
      currency={t.currency}
      profiles={filteredCrmProfiles}
      search={crmSearch}
      segmentFilter={crmSegmentFilter}
      onSearchChange={setCrmSearch}
      onSegmentFilterChange={setCrmSegmentFilter}
      onClearFilters={() => {
        setCrmSearch("");
        setCrmSegmentFilter("all");
      }}
      onAddCustomer={() => {
        setCustomerFormInitial(null);
        setCustomerFormOpen(true);
      }}
      onOpenProfile={openProfile}
      onEditCustomer={openEditCustomer}
      onDeleteCustomer={(profile) => void deleteCrmCustomer(profile)}
      onRegisterInferred={openRegisterInferred}
      getPaymentLabel={getPaymentLabel}
    />
  );
}
