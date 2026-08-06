import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  addBarcodeToCart,
  completePosSale,
  ensurePosReady,
  holdCurrentCart,
  resumeFirstHeldInvoice,
} from "./helpers/pos";

test.describe("POS held invoice flow", () => {
  test("hold cart, resume held invoice, then complete sale", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);

    await navigateToPage(page, "pos");
    await ensurePosReady(page);
    await addBarcodeToCart(page, env!.barcode);

    await holdCurrentCart(page);

    await resumeFirstHeldInvoice(page);

    const invoiceNumber = await completePosSale(page);
    expect(invoiceNumber).toMatch(/^INV-\d+$/);

    await navigateToPage(page, "invoices");
    await page.getByPlaceholder(/بحث برقم الفاتورة|Search invoice/).fill(invoiceNumber);
    await expect(page.getByRole("cell", { name: invoiceNumber })).toBeVisible();
  });
});
