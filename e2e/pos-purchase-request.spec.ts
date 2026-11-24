import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  createZeroStockMedicine,
  expectPurchaseRequestVisible,
  openInventoryPurchaseRequestsTab,
} from "./helpers/inventory";
import { ensurePosReady, requestPurchaseFromSmartSearch } from "./helpers/pos";

test.describe("POS purchase requests", () => {
  test("flag out-of-stock medicine from POS and see it in inventory tab", async ({ page }) => {
    test.setTimeout(180_000);
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    const stamp = Date.now();
    const barcode = `E2E-PR-${stamp}`;
    const nameAr = `طلب شراء E2E ${stamp}`;
    const nameEn = `E2E Purchase Request ${stamp}`;

    await login(page, env!.email, env!.password);

    await navigateToPage(page, "inventory");
    await createZeroStockMedicine(page, { barcode, nameAr, nameEn });

    await navigateToPage(page, "pos");
    await ensurePosReady(page);
    await requestPurchaseFromSmartSearch(page, barcode);

    await navigateToPage(page, "inventory");
    await openInventoryPurchaseRequestsTab(page);
    await expectPurchaseRequestVisible(page, barcode);
    await expect(page.getByText(nameAr).first()).toBeVisible();

    const row = page
      .locator('.invMgmtTabPanels > [aria-hidden="false"] table tbody tr')
      .filter({ hasText: barcode })
      .first();
    await row.getByRole("button", { name: /حذف|Remove/ }).click();
    await expect(page.getByText(barcode, { exact: true })).toHaveCount(0, { timeout: 15_000 });
  });
});
