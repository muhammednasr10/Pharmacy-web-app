import CustomerCrmTabs from "../components/customers/CustomerCrmTabs";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import CustomerCrmDetailModal from "../components/customers/CustomerCrmDetailModal";
import CustomersOverviewTab from "./customers/CustomersOverviewTab";
import CustomersListTab from "./customers/CustomersListTab";
import CustomersDebtsTab from "./customers/CustomersDebtsTab";
import CustomersPaymentsTab from "./customers/CustomersPaymentsTab";
import CustomersFollowUpsTab from "./customers/CustomersFollowUpsTab";
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
    crmProfiles,
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
          <h2>{isArabic ? "إدارة العملاء (CRM)" : "Customer CRM"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "ملفات العملاء، المبيعات، المديونيات، المتابعات، والتحصيلات في مكان واحد"
              : "Customer profiles, sales, debts, follow-ups, and payments in one place"}
          </p>
        </div>

        <div className="returnsHeaderBtns">
          {canCollectPayments && (
            <button
              type="button"
              className="printFullBtn"
              onClick={() => openCustomerPaymentModal()}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "تسجيل تحصيل" : "Collect payment"}
            </button>
          )}
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
        </div>
      </div>

      <CustomerCrmTabs
        isArabic={isArabic}
        activeTab={activeTab}
        customersCount={crmProfiles.length}
        debtsCount={customerDebts.filter((customer) => safeNumber(customer.remainingDebt) > 0).length}
        paymentsCount={customerPayments.length}
        openFollowUpsCount={openFollowUpsCount}
        onChange={setActiveTab}
      />

      <div className="crmTabPanels">
        <CustomersOverviewTab state={state} />
        <CustomersListTab state={state} />
        <CustomersDebtsTab state={state} />
        <CustomersPaymentsTab state={state} />
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
