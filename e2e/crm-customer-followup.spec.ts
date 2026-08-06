import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  addCustomerFollowUp,
  createCrmCustomer,
  expectFollowUpInTab,
  openCustomerProfile,
  openCustomersTab,
  openFollowUpsTab,
} from "./helpers/crm";

test.describe("CRM customer + follow-up", () => {
  test("login, add customer, create follow-up, verify in follow-ups tab", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    const customerName = `E2E Customer ${Date.now()}`;
    const followUpTitle = `E2E Follow-up ${Date.now()}`;

    await login(page, env!.email, env!.password);

    await navigateToPage(page, "customers");
    await openCustomersTab(page);

    await createCrmCustomer(page, {
      name: customerName,
      phone: "01001234567",
      email: `e2e-${Date.now()}@example.com`,
    });

    await openCustomerProfile(page, customerName);
    await addCustomerFollowUp(page, {
      title: followUpTitle,
      details: "E2E automated follow-up note",
      dueDate: "2027-06-15",
    });

    await page.locator(".crmDetailModal .closeBtn").click();
    await expect(page.locator(".crmDetailModal")).toBeHidden();

    await openFollowUpsTab(page);
    await expectFollowUpInTab(page, customerName, followUpTitle);
  });
});
