import CustomerCrmFollowUpsPanel from "../../components/customers/CustomerCrmFollowUpsPanel";
import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersFollowUpsTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    crmProfiles,
    customerActivities,
    followUpStatusFilter,
    setFollowUpStatusFilter,
    openProfile,
    updateActivityStatus,
  } = state;

  if (activeTab !== "followups") return null;

  return (
    <CustomerCrmFollowUpsPanel
      isArabic={isArabic}
      profiles={crmProfiles}
      activities={customerActivities}
      statusFilter={followUpStatusFilter}
      onStatusFilterChange={setFollowUpStatusFilter}
      onOpenProfile={openProfile}
      onUpdateActivityStatus={updateActivityStatus}
    />
  );
}
