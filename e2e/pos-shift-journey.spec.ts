import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import { addBarcodeToCart, ensurePosReady } from "./helpers/pos";

test.describe("POS journey: shift → sale → return → close", () => {
  test("open shift, sell with qty confirm, instant return, close shift", async ({ page }) => {
    test.setTimeout(180_000);
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

    await page.getByRole("button", { name: /مرتجع سريع|Quick Return/ }).first().click();
    await expect(page.getByRole("heading", { name: /مرتجع بيع لحظي|Instant Sale Return/ })).toBeVisible({
      timeout: 15_000,
    });

    const barcodeInReturn = page.locator("#instant-return-barcode-input");
    await expect(barcodeInReturn).toBeVisible({ timeout: 10_000 });
    await barcodeInReturn.fill(env!.barcode);
    await barcodeInReturn.press("Enter");

    const returnForm = page.locator(".instantReturnForm");
    const qtyInput = returnForm.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible({ timeout: 20_000 });
    await qtyInput.fill("1");

    const reasonInput = returnForm
      .locator('input[placeholder*="خطأ"], input[placeholder*="wrong"], input[placeholder*="مثال"]')
      .first();
    await expect(reasonInput).toBeVisible({ timeout: 10_000 });
    await reasonInput.fill("E2E journey return");

    const confirmReturn = page.locator(".invoiceModal.posModalWide .completeBtn").first();
    await expect(confirmReturn).toBeEnabled({ timeout: 10_000 });
    await confirmReturn.click();
    await expect(page.locator(".invoiceModal.posModalWide")).toBeHidden({ timeout: 25_000 });

    // Fullscreen quick-sale overlay intercepts shift panel clicks — close it first.
    const closeQuickSale = page.locator(".posQuickSaleActionBtn--danger");
    if (await closeQuickSale.isVisible().catch(() => false)) {
      await closeQuickSale.click();
      await expect(page.locator(".posQuickSaleOverlay")).toBeHidden({ timeout: 10_000 });
    }

    await page.locator(".cashierShiftPanel .dangerBtn").click();
    await expect(page.getByRole("heading", { name: /إغلاق الوردية|Close shift/ })).toBeVisible();
    await page.locator(".cashierShiftModal input[type='number']").fill("0");
    await page.locator(".cashierShiftModal .dangerBtn").click();
    await expect(page.locator(".cashierShiftOpenTrigger")).toBeVisible({ timeout: 25_000 });
  });
});
