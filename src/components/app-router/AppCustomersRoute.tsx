import { CustomersPage } from "../../pages/lazyPages";
import { canDeleteCustomerPayments } from "../../utils/roles";
import type { AppPageRouterProps } from "./types";

export type AppCustomersRouteProps = Pick<
  AppPageRouterProps,
  | "displayPage"
  | "canOpenPage"
  | "isArabic"
  | "t"
  | "customerDebts"
  | "customerPayments"
  | "invoices"
  | "totalCustomerPayments"
  | "appUser"
  | "user"
  | "isSubscriptionExpired"
  | "canViewCustomers"
  | "getPaymentLabel"
  | "getPharmacyId"
  | "pharmacySettings"
  | "addActivityLog"
  | "setSelectedInvoice"
  | "customerPaymentModalRequest"
  | "setCustomerPaymentModalRequest"
  | "customerSearchSeed"
  | "setCustomerSearchSeed"
>;

export default function AppCustomersRoute({
  displayPage,
  canOpenPage,
  isArabic,
  t,
  customerDebts,
  customerPayments,
  invoices,
  totalCustomerPayments,
  appUser,
  user,
  isSubscriptionExpired,
  canViewCustomers,
  getPaymentLabel,
  getPharmacyId,
  pharmacySettings,
  addActivityLog,
  setSelectedInvoice,
  customerPaymentModalRequest,
  setCustomerPaymentModalRequest,
  customerSearchSeed,
  setCustomerSearchSeed,
}: AppCustomersRouteProps) {
  if (displayPage !== "customers" || !canOpenPage("customers")) return null;

  return (
    <CustomersPage
      isArabic={isArabic}
      t={t}
      customerDebts={customerDebts}
      customerPayments={customerPayments}
      invoices={invoices}
      totalCustomerPayments={totalCustomerPayments}
      appUser={appUser}
      user={user}
      isSubscriptionExpired={isSubscriptionExpired}
      canCollectPayments={canViewCustomers()}
      canDeletePayments={canDeleteCustomerPayments(appUser)}
      getPaymentLabel={getPaymentLabel}
      getPharmacyId={getPharmacyId}
      pharmacySettings={pharmacySettings}
      onActivityLog={addActivityLog}
      onViewInvoice={setSelectedInvoice}
      openPaymentModalRequest={customerPaymentModalRequest}
      onOpenPaymentModalRequestConsumed={() => setCustomerPaymentModalRequest(0)}
      initialCustomerSearch={customerSearchSeed}
      onInitialCustomerSearchConsumed={() => setCustomerSearchSeed("")}
    />
  );
}
