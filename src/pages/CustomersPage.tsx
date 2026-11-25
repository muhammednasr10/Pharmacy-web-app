import CustomerCrmTabs from "../components/customers/CustomerCrmTabs";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import CustomerCrmDetailModal from "../components/customers/CustomerCrmDetailModal";
import SupplierFormModal from "../components/customers/SupplierFormModal";
import CustomersOverviewTab from "./customers/CustomersOverviewTab";
import CustomersListTab from "./customers/CustomersListTab";
import CustomersDebtsTab from "./customers/CustomersDebtsTab";
import CustomersPaymentsTab from "./customers/CustomersPaymentsTab";
import CustomersFollowUpsTab from "./customers/CustomersFollowUpsTab";
import CustomersSuppliersTab from "./customers/CustomersSuppliersTab";
import CustomerPaymentModal from "./customers/modals/CustomerPaymentModal";
import CustomerStatementModal from "./customers/modals/CustomerStatementModal";
import { safeNumber } from "./customers/helpers";
import { useCustomersPageState } from "./customers/useCustomersPageState";
import type { CustomersPageProps } from "./customers/types";

export default function CustomersPage(props: CustomersPageProps) {
  const state = useCustomersPageState(props);
  const {
    isArabic,
    t,
    activeTab,
    setActiveTab,
    creditSubTab,
    setCreditSubTab,
    pharmacySubTab,
    setPharmacySubTab,
    crmProfiles,
    registeredCustomersCount,
    suppliers,
    customerDebts,
    customerPayments,
    openFollowUpsCount,
    canCollectPayments,
    isSubscriptionExpired,
    openCustomerPaymentModal,
    filteredCustomerDebts,
    exportCtx,
    selectedProfile,
    setSelectedProfile,
    customerFormOpen,
    setCustomerFormOpen,
    customerFormInitial,
    setCustomerFormInitial,
    savingCustomer,
    saveCrmCustomer,
    supplierFormOpen,
    setSupplierFormOpen,
    supplierFormInitial,
    setSupplierFormInitial,
    savingSupplier,
    saveSupplier,
    invoices,
    customerActivities,
    getPaymentLabel,
    addCustomerActivity,
    updateActivityStatus,
    onViewInvoice,
    appUser,
  } = state;

  return (
    <section className="card customersPage crmPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "العملاء والموردين" : "Customers & suppliers"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "موردين الصيدلية، عملاء الآجل، وسجل عملاء الصيدلية في مكان واحد"
              : "Pharmacy suppliers, credit customers, and the customer registry in one place"}
          </p>
        </div>

        <div className="returnsHeaderBtns">
          {canCollectPayments && activeTab === "credit" ? (
            <button
              type="button"
              className="printFullBtn"
              onClick={() => openCustomerPaymentModal()}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل تحصيل" : "Collect payment"}
            </button>
          ) : null}
          {activeTab === "credit" ? (
            <button
              className="printBtn"
              onClick={() =>
                void import("../utils/customerExports").then((m) =>
                  m.exportCustomersDebtsCSV(filteredCustomerDebts, exportCtx),
                )
              }
            >
              <span aria-hidden="true">⬇️</span>
              <span>{isArabic ? "تصدير المديونيات" : "Export debts"}</span>
            </button>
          ) : null}
        </div>
      </div>

      <CustomerCrmTabs
        isArabic={isArabic}
        activeTab={activeTab}
        suppliersCount={suppliers.length}
        creditCount={customerDebts.filter((customer) => safeNumber(customer.remainingDebt) > 0).length}
        pharmacyCount={registeredCustomersCount || crmProfiles.length}
        onChange={setActiveTab}
      />

      {activeTab === "credit" ? (
        <div className="crmSubTabs" role="tablist" aria-label={isArabic ? "تبويبات الآجل" : "Credit subtabs"}>
          <button
            type="button"
            role="tab"
            aria-selected={creditSubTab === "debts"}
            className={`crmSubTab ${creditSubTab === "debts" ? "is-active" : ""}`}
            onClick={() => setCreditSubTab("debts")}
          >
            {isArabic ? "المديونيات" : "Debts"}
            <span className="crmSubTabCount">
              {customerDebts.filter((customer) => safeNumber(customer.remainingDebt) > 0).length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={creditSubTab === "payments"}
            className={`crmSubTab ${creditSubTab === "payments" ? "is-active" : ""}`}
            onClick={() => setCreditSubTab("payments")}
          >
            {isArabic ? "التحصيلات" : "Payments"}
            <span className="crmSubTabCount">{customerPayments.length}</span>
          </button>
        </div>
      ) : null}

      {activeTab === "pharmacy" ? (
        <div
          className="crmSubTabs"
          role="tablist"
          aria-label={isArabic ? "تبويبات عملاء الصيدلية" : "Pharmacy customer subtabs"}
        >
          <button
            type="button"
            role="tab"
            aria-selected={pharmacySubTab === "list"}
            className={`crmSubTab ${pharmacySubTab === "list" ? "is-active" : ""}`}
            onClick={() => setPharmacySubTab("list")}
          >
            {isArabic ? "السجل" : "Registry"}
            <span className="crmSubTabCount">{crmProfiles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pharmacySubTab === "overview"}
            className={`crmSubTab ${pharmacySubTab === "overview" ? "is-active" : ""}`}
            onClick={() => setPharmacySubTab("overview")}
          >
            {isArabic ? "نظرة عامة" : "Overview"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pharmacySubTab === "followups"}
            className={`crmSubTab ${pharmacySubTab === "followups" ? "is-active" : ""}`}
            onClick={() => setPharmacySubTab("followups")}
          >
            {isArabic ? "المتابعات" : "Follow-ups"}
            <span className="crmSubTabCount">{openFollowUpsCount}</span>
          </button>
        </div>
      ) : null}

      <div className="crmTabPanels">
        <CustomersSuppliersTab state={state} />
        <CustomersDebtsTab state={state} />
        <CustomersPaymentsTab state={state} />
        <CustomersListTab state={state} />
        <CustomersOverviewTab state={state} />
        <CustomersFollowUpsTab state={state} />
      </div>

      <CustomerFormModal
        isArabic={isArabic}
        open={customerFormOpen}
        initial={customerFormInitial}
        saving={savingCustomer}
        onClose={() => {
          setCustomerFormOpen(false);
          setCustomerFormInitial(null);
        }}
        onSave={saveCrmCustomer}
      />

      <SupplierFormModal
        isArabic={isArabic}
        open={supplierFormOpen}
        initial={supplierFormInitial}
        saving={savingSupplier}
        onClose={() => {
          setSupplierFormOpen(false);
          setSupplierFormInitial(null);
        }}
        onSave={saveSupplier}
      />

      {selectedProfile ? (
        <CustomerCrmDetailModal
          isArabic={isArabic}
          currency={t.currency}
          profile={selectedProfile}
          invoices={invoices}
          payments={customerPayments}
          activities={customerActivities}
          getPaymentLabel={getPaymentLabel}
          onClose={() => setSelectedProfile(null)}
          onEdit={() => {
            setCustomerFormInitial(selectedProfile);
            setCustomerFormOpen(true);
          }}
          onAddActivity={addCustomerActivity}
          onUpdateActivityStatus={updateActivityStatus}
          onViewInvoice={onViewInvoice}
          appUserName={appUser?.name}
          appUserUid={appUser?.uid}
        />
      ) : null}

      <CustomerPaymentModal state={state} />
      <CustomerStatementModal state={state} />
    </section>
  );
}
