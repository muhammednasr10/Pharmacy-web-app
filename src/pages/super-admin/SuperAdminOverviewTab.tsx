import SaasAdminStatsPanel from "../../components/SaasAdminStatsPanel";
import { isPharmacyActive } from "./helpers";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminOverviewTab({ state }: Props) {
  const {
    isArabic,
    pharmacies,
    systemUsers,
    subscriptionRequests,
    pendingPharmacyLoginAccounts,
  } = state;

  return (
            <div className="settingsTabPanel">
              <SaasAdminStatsPanel
                isArabic={isArabic}
                pharmacies={pharmacies}
                systemUsers={systemUsers}
                subscriptionRequests={subscriptionRequests}
                pendingLoginAccountRequests={pendingPharmacyLoginAccounts.length}
                isPharmacyActive={isPharmacyActive}
              />
            </div>
  );
}
