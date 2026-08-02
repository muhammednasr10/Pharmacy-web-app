import CustomerCrmList from "../../components/customers/CustomerCrmList";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersListTab({ state }: Props) {
  const {
    isArabic,
    t,
    activeTab,
    filteredCrmProfiles,
    crmSearch,
    crmSegmentFilter,
    setCrmSearch,
    setCrmSegmentFilter,
    setCustomerFormInitial,
    setCustomerFormOpen,
    openProfile,
    openRegisterInferred,
  } = state;

  if (activeTab !== "customers") return null;

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
        setCustomerFormInitial({ id: Date.now() });
        setCustomerFormOpen(true);
      }}
      onOpenProfile={openProfile}
      onRegisterInferred={openRegisterInferred}
    />
  );
}
