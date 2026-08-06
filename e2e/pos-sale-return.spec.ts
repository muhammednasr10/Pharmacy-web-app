import { test, expect } from "@playwright/test";
import { acceptNextDialog, getE2EEnv, login, navigateToPage } from "./helpers/app";
import { addBarcodeToCart, completePosSale, ensurePosReady } from "./helpers/pos";

test.describe("POS sale → invoice → return", () => {
  test("login, complete POS sale, verify invoice, create return", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);

    await navigateToPage(page, "pos");
    await ensurePosReady(page);
    await addBarcodeToCart(page, env!.barcode);
    const invoiceNumber = await completePosSale(page);
    expect(invoiceNumber).toMatch(/^INV-\d+$/);

    await navigateToPage(page, "invoices");
    await page.getByPlaceholder(/بحث برقم الفاتورة|Search invoice/).fill(invoiceNumber);
    await expect(page.getByRole("cell", { name: invoiceNumber })).toBeVisible();

    const returnDialogPromise = acceptNextDialog(page);
    await page.getByRole("button", { name: /^مرتجع$|^Return$/ }).first().click();
    await expect(page.getByRole("heading", { name: /تسجيل مرتجع|Create Return/ })).toBeVisible();

    const returnQtyInput = page.locator(".invoiceModal .tableInput").first();
    await returnQtyInput.fill("1");
    await page.locator(".invoiceModal .printFullBtn").click();

    const returnDialogMessage = await returnDialogPromise;
    expect(returnDialogMessage).toMatch(/RET-\d+/);
    const returnNumber = returnDialogMessage.match(/RET-\d+/)?.[0] || "";

    await navigateToPage(page, "returns");
    if (returnNumber) {
      await expect(page.getByText(returnNumber)).toBeVisible();
    } else {
      await expect(page.getByText(invoiceNumber)).toBeVisible();
    }

    await expect(
      page.getByText(/مرتجع|Returned|RET-/i).first(),
    ).toBeVisible();
  });
});
