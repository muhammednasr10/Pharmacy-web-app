/** CRM E2E helpers — barrel re-exports for stable import paths. */
export type { CrmCustomerInput } from "./crm/customers";
export {
  createCrmCustomer,
  openCustomerProfile,
  openCustomersTab,
} from "./crm/customers";
export type { CrmFollowUpInput } from "./crm/followUps";
export {
  addCustomerFollowUp,
  expectFollowUpInTab,
  openFollowUpsTab,
} from "./crm/followUps";
