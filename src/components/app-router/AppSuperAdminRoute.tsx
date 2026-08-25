import { SuperAdminPage } from "../../pages/lazyPages";
import type { AppPageRouterProps } from "./types";

export type AppSuperAdminRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "appUser"
  | "branches"
  | "systemUsers"
  | "selectedTenantId"
  | "setSelectedTenantId"
  | "setTenantUserForm"
  | "handleSwitchTenantView"
  | "handleOpenTenantUsers"
  | "tenantForm"
  | "setTenantForm"
  | "resetTenantForm"
  | "handleCreateTenant"
  | "creatingTenant"
  | "handleCreateOrganizationBranch"
  | "handleUpdateOrganizationBranch"
  | "handleDeleteOrganization"
  | "handleDeleteOrganizationBranch"
  | "handleUpdateTenantStatus"
  | "handleUpdateOrganizationMaxBranches"
  | "handleUpdateOrganizationMaxUsers"
  | "handleUpdateOrganizationFreeTrial"
  | "handleUpdateSubscriptionTier"
  | "subscriptionRequests"
  | "handleApproveSubscriptionRequest"
  | "handleRejectSubscriptionRequest"
  | "pendingPharmacyLoginAccounts"
  | "pendingPharmacySignupRequests"
  | "pendingCustomRoles"
  | "handleApprovePharmacyLoginAccount"
  | "handleRejectPharmacyLoginAccount"
  | "handleApprovePharmacySignupRequest"
  | "handleRejectPharmacySignupRequest"
  | "refreshAdminRequestsStable"
  | "refreshSystemUsersStable"
  | "refreshPharmacies"
>;

export default function AppSuperAdminRoute({
  displayPage,
  canOpenPage,
  isArabic,
  appUser,
  branches,
  systemUsers,
  selectedTenantId,
  setSelectedTenantId,
  setTenantUserForm,
  handleSwitchTenantView,
  handleOpenTenantUsers,
  tenantForm,
  setTenantForm,
  resetTenantForm,
  handleCreateTenant,
  creatingTenant,
  handleCreateOrganizationBranch,
  handleUpdateOrganizationBranch,
  handleDeleteOrganization,
  handleDeleteOrganizationBranch,
  handleUpdateTenantStatus,
  handleUpdateOrganizationMaxBranches,
  handleUpdateOrganizationMaxUsers,
  handleUpdateOrganizationFreeTrial,
  handleUpdateSubscriptionTier,
  subscriptionRequests,
  handleApproveSubscriptionRequest,
  handleRejectSubscriptionRequest,
  pendingPharmacyLoginAccounts,
  pendingPharmacySignupRequests,
  pendingCustomRoles,
  handleApprovePharmacyLoginAccount,
  handleRejectPharmacyLoginAccount,
  handleApprovePharmacySignupRequest,
  handleRejectPharmacySignupRequest,
  refreshAdminRequestsStable,
  refreshSystemUsersStable,
  refreshPharmacies,
}: AppSuperAdminRouteProps) {
  if (!canOpenPage("tenants")) return null;

  return (
    <SuperAdminPage
      isArabic={isArabic}
      operatorUid={appUser?.uid}
      pharmacies={branches}
      systemUsers={systemUsers}
      selectedPharmacyId={selectedTenantId}
      onSelectPharmacy={(id) => {
        setSelectedTenantId(id);
        setTenantUserForm((prev) => ({ ...prev, pharmacyId: id }));
      }}
      onSwitchTenant={handleSwitchTenantView}
      onOpenTenantUsers={handleOpenTenantUsers}
      tenantForm={tenantForm}
      onTenantFormChange={(updates) => setTenantForm({ ...tenantForm, ...updates })}
      onResetTenantForm={resetTenantForm}
      onCreateTenant={handleCreateTenant}
      creatingTenant={creatingTenant}
      onCreateOrganizationBranch={handleCreateOrganizationBranch}
      onUpdateOrganizationBranch={handleUpdateOrganizationBranch}
      onDeleteOrganization={handleDeleteOrganization}
      onDeleteOrganizationBranch={handleDeleteOrganizationBranch}
      onUpdateTenantStatus={handleUpdateTenantStatus}
      onUpdateMaxBranches={handleUpdateOrganizationMaxBranches}
      onUpdateMaxUsers={handleUpdateOrganizationMaxUsers}
      onUpdateOrganizationFreeTrial={handleUpdateOrganizationFreeTrial}
      onUpdateSubscriptionTier={handleUpdateSubscriptionTier}
      subscriptionRequests={subscriptionRequests}
      onApproveSubscriptionRequest={handleApproveSubscriptionRequest}
      onRejectSubscriptionRequest={handleRejectSubscriptionRequest}
      pendingPharmacyLoginAccounts={pendingPharmacyLoginAccounts}
      pendingPharmacySignupRequests={pendingPharmacySignupRequests}
      pendingCustomRoles={pendingCustomRoles}
      onApprovePharmacyLoginAccount={handleApprovePharmacyLoginAccount}
      onRejectPharmacyLoginAccount={handleRejectPharmacyLoginAccount}
      onApprovePharmacySignupRequest={handleApprovePharmacySignupRequest}
      onRejectPharmacySignupRequest={handleRejectPharmacySignupRequest}
      onRefreshAdminRequests={refreshAdminRequestsStable}
      onRefreshSystemUsers={refreshSystemUsersStable}
      onRefreshPharmacies={refreshPharmacies}
    />
  );
}
