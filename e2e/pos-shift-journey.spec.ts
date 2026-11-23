import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import { addBarcodeToCart, ensurePosReady } from "./helpers/pos";

test.describe("POS journey: shift → sale → return → close", () => {
  test("open shift, sell with qty confirm, instant return, close shift", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "pos");
    await ensurePosReady(page);
    await expect(page.locator(".cashierShiftPanelActive")).toBeVisible({ timeout: 20_000 });

    await addBarcodeToCart(page, env!.barcode);
    const plusBtn = page.locator(".posQtyBtn").last();
    if (await plusBtn.isVisible().catch(() => false)) {
      await plusBtn.click();
      await expect(page.locator(".posQtyValue").first()).toHaveText(/^[2-9]\d*$/);
    }

    page.on("dialog", (dialog) => {
      void dialog.accept();
    });

    await page.locator(".posCartCompleteBtn").click();
    await expect(page.locator(".posActionFeedback")).toContainText(/INV-\d+|تم تسجيل|completed|محلياً/i, {
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /مرتجع فوري|Instant return|^مرتجع$|^Return$/ }).first().click();
    await expect(page.getByRole("heading", { name: /مرتجع|Return/ })).toBeVisible({
      timeout: 15_000,
    });

    const barcodeInReturn = page
      .locator("#instant-return-barcode, input[placeholder*='باركود'], input[placeholder*='barcode']")
      .first();
    if (await barcodeInReturn.isVisible().catch(() => false)) {
      await barcodeInReturn.fill(env!.barcode);
      await barcodeInReturn.press("Enter");
    }

    const qtyInput = page
      .locator(".invoiceModal input[type='number'], .instantReturnModal input[type='number']")
      .first();
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.fill("1");
    }

    const reasonInput = page.locator(".invoiceModal textarea, .instantReturnModal textarea").first();
    if (await reasonInput.isVisible().catch(() => false)) {
      await reasonInput.fill("E2E journey return");
    }

    const confirmReturn = page
      .locator(".invoiceModal .printFullBtn, .invoiceModal .completeBtn, .instantReturnModal .completeBtn")
      .first();
    if (await confirmReturn.isVisible().catch(() => false)) {
      await confirmReturn.click();
    }

    await page.locator(".cashierShiftPanel .dangerBtn").click();
    await expect(page.getByRole("heading", { name: /إغلاق الوردية|Close shift/ })).toBeVisible();
    await page.locator(".cashierShiftModal input[type='number']").fill("0");
    await page.locator(".cashierShiftModal .dangerBtn").click();
    await expect(page.locator(".cashierShiftOpenTrigger")).toBeVisible({ timeout: 25_000 });
  });
});
