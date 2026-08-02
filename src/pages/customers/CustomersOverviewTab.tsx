import CustomerCrmOverview from "../../components/customers/CustomerCrmOverview";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersOverviewTab({ state }: Props) {
  const {
    isArabic,
    t,
    activeTab,
    crmProfiles,
    customerActivities,
    totalRemaining,
    totalCustomerPayments,
  } = state;

  if (activeTab !== "overview") return null;

  return (
    <CustomerCrmOverview
      isArabic={isArabic}
      currency={t.currency}
      profiles={crmProfiles}
      activities={customerActivities}
      totalRemainingDebt={totalRemaining}
      totalCustomerPayments={totalCustomerPayments}
    />
  );
}
