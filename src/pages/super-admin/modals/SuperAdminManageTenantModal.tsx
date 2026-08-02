import type { SuperAdminPageState } from "../useSuperAdminPageState";
import ManageTenantBranchesSection from "./manage-tenant/ManageTenantBranchesSection";
import ManageTenantModalShell from "./manage-tenant/ManageTenantModalShell";
import ManageTenantSubscriptionSection from "./manage-tenant/ManageTenantSubscriptionSection";
import ManageTenantUsersSection from "./manage-tenant/ManageTenantUsersSection";

type Props = { state: SuperAdminPageState };

export default function SuperAdminManageTenantModal({ state }: Props) {
  const { manageModalOpen, selected } = state;

  if (!manageModalOpen || !selected) return null;

  return (
    <ManageTenantModalShell state={state}>
      <ManageTenantSubscriptionSection state={state} />
      <ManageTenantBranchesSection state={state} />
      <ManageTenantUsersSection state={state} />
    </ManageTenantModalShell>
  );
}
