import SuperAdminOverviewTab from "./super-admin/SuperAdminOverviewTab";
import SuperAdminCustomerRequestsTab from "./super-admin/SuperAdminCustomerRequestsTab";
import SuperAdminRolesTab from "./super-admin/SuperAdminRolesTab";
import SuperAdminPricingTab from "./super-admin/SuperAdminPricingTab";
import SuperAdminSuggestionsTab from "./super-admin/SuperAdminSuggestionsTab";
import SuperAdminPharmaciesTab from "./super-admin/SuperAdminPharmaciesTab";
import SuperAdminAddTenantModal from "./super-admin/modals/SuperAdminAddTenantModal";
import SuperAdminManageTenantModal from "./super-admin/modals/SuperAdminManageTenantModal";
import SuperAdminSystemUserModal from "./super-admin/modals/SuperAdminSystemUserModal";
import SuperAdminRoleModal from "./super-admin/modals/SuperAdminRoleModal";
import SuperAdminBranchModal from "./super-admin/modals/SuperAdminBranchModal";
import SuperAdminConfirmModals from "./super-admin/modals/SuperAdminConfirmModals";
import SuperAdminSignupApproveModal from "./super-admin/modals/SuperAdminSignupApproveModal";
import { useSuperAdminPageState } from "./super-admin/useSuperAdminPageState";
import type { SuperAdminPageProps, TenantForm } from "./super-admin/types";

export type { SuperAdminPageProps, TenantForm };

export default function SuperAdminPage(props: SuperAdminPageProps) {
  const state = useSuperAdminPageState(props);
  const { isArabic, activeTab, setActiveTab, saasTabs, setAddModalOpen, openAddRoleModal, rolesReferenceLoading, savingRole } = state;

  return (
    <section className="card saasPage">
      <div className="saasPageHeader">
        <div>
          <h2>{isArabic ? "إدارة" : "Management"}</h2>
        </div>
      </div>

      <div className="staffPageTabsBar saasPageTabsBar">
        <nav
          className="settingsTabsNav"
          aria-label={isArabic ? "أقسام إدارة الصيدليات" : "Pharmacy admin sections"}
        >
          {saasTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settingsTabBtn${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isArabic ? tab.ar : tab.en}
              {tab.badge ? (
                <span className={`saasTabBadge${tab.badge > 0 ? " active" : ""}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        {activeTab === "pharmacies" && (
          <button
            type="button"
            className="completeBtn saasAddBtn"
            onClick={() => setAddModalOpen(true)}
          >
            + {isArabic ? "إضافة صيدلية" : "Add Pharmacy"}
          </button>
        )}
        {activeTab === "roles" && (
          <button
            type="button"
            className="completeBtn saasAddBtn"
            disabled={rolesReferenceLoading || savingRole}
            onClick={() => openAddRoleModal()}
          >
            + {isArabic ? "إضافة دور" : "Add role"}
          </button>
        )}
      </div>

      {activeTab === "roles" && <SuperAdminRolesTab state={state} />}
      {activeTab === "overview" && <SuperAdminOverviewTab state={state} />}
      {activeTab === "customerRequests" && <SuperAdminCustomerRequestsTab state={state} />}
      {activeTab === "suggestions" && <SuperAdminSuggestionsTab state={state} />}
      {activeTab === "pricing" && <SuperAdminPricingTab state={state} />}
      {activeTab === "pharmacies" && <SuperAdminPharmaciesTab state={state} />}

      <SuperAdminAddTenantModal state={state} />
      <SuperAdminManageTenantModal state={state} />
      <SuperAdminSystemUserModal state={state} />
      <SuperAdminRoleModal state={state} />
      <SuperAdminBranchModal state={state} />
      <SuperAdminConfirmModals state={state} />
      <SuperAdminSignupApproveModal state={state} />
    </section>
  );
}
