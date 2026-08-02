import { Suspense } from "react";
import TierUpgradeNotice from "../../components/TierUpgradeNotice";
import { LazyHrPage } from "./lazyStaffModules";
import type { EmployeesUsersPageState } from "./useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffHrSection({ state }: Props) {
  const {
    isArabic,
    isHrTab,
    centralHrUpgradeNotice,
    onOpenSubscriptionSettings,
    activeTab,
    appUser,
    pharmacyId,
    pharmacyName,
    currency,
    hasRole,
    showOrgHr,
    orgBranchIds,
    branchDirectory,
    branchLabel,
    hrManagePharmacyId,
    orgHrReadOnly,
  } = state;

  if (!isHrTab) return null;

  return (
    <>
      {centralHrUpgradeNotice && onOpenSubscriptionSettings && (
        <TierUpgradeNotice
          isArabic={isArabic}
          message={centralHrUpgradeNotice}
          onAction={onOpenSubscriptionSettings}
        />
      )}

      <div className="settingsTabPanel hrPage">
        <Suspense
          fallback={
            <p className="hintText" style={{ padding: "0 1rem" }}>
              {isArabic ? "جاري تحميل الموارد البشرية..." : "Loading HR module..."}
            </p>
          }
        >
          <LazyHrPage
            embedded
            activeTab={activeTab}
            isArabic={isArabic}
            appUser={appUser}
            pharmacyId={pharmacyId}
            pharmacyName={pharmacyName}
            currency={currency}
            hasRole={(roles) => hasRole(appUser, roles)}
            showOrgHr={showOrgHr}
            orgBranchIds={orgBranchIds}
            orgBranches={branchDirectory}
            resolveBranchLabel={branchLabel}
            hrManagePharmacyId={hrManagePharmacyId}
            orgHrReadOnly={orgHrReadOnly}
          />
        </Suspense>
      </div>
    </>
  );
}
