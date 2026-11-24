import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  addBarcodeToCart,
  completePosSale,
  ensurePosReady,
  fillPosCustomerDetails,
  selectPosPaymentMethod,
} from "./helpers/pos";

test.describe("POS delivery + customer details", () => {
  test("select delivery, fill customer, complete sale, verify invoice", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    const customerName = `E2E Client ${Date.now()}`;
    const customerPhone = "01001234567";

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "pos");
    await ensurePosReady(page);

    await expect(page.locator(".posCustomerDataBtn").first()).toBeVisible();

    const paymentSelect = page.locator(".paymentMethodRow select").first();
    const cashOption = paymentSelect.locator('option[value="cash"]');
    if (await cashOption.count()) {
      await expect(cashOption).toContainText(/كاش\/صندوق|Cash \/ drawer/);
    }

    await addBarcodeToCart(page, env!.barcode);
    await selectPosPaymentMethod(page, "delivery");
    await fillPosCustomerDetails(page, { name: customerName, phone: customerPhone });

    const invoiceNumber = await completePosSale(page);
    expect(invoiceNumber).toMatch(/^INV-\d+$/);

    await navigateToPage(page, "invoices");
    await page.getByPlaceholder(/بحث برقم الفاتورة|Search invoice/).fill(invoiceNumber);
    const invoiceRow = page.locator("table tbody tr").filter({ hasText: invoiceNumber }).first();
    await expect(invoiceRow).toBeVisible({ timeout: 15_000 });
    await expect(invoiceRow.getByRole("cell", { name: /^دليفري$|^Delivery$/ })).toBeVisible();
    await expect(invoiceRow.getByRole("cell", { name: customerName })).toBeVisible();

    await invoiceRow.getByRole("button", { name: /عرض|View/ }).click();
    const modal = page.locator(".invoiceModal");
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByText(customerName)).toBeVisible();
    await expect(modal.getByText(customerPhone)).toBeVisible();
  });
});
