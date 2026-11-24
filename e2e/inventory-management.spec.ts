import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  expectInventoryBarcodeVisible,
  expectInventoryPagination,
  expectInventoryStockResults,
  openInventoryMovementsTab,
  openInventoryPurchaseRequestsTab,
  openInventoryStockCountLogTab,
  openInventoryStockTab,
  searchInventoryMovements,
  searchInventoryStock,
} from "./helpers/inventory";

test.describe("Inventory management", () => {
  test("login, search stock, browse tabs, verify pagination", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "inventory");

    await openInventoryStockTab(page);
    await searchInventoryStock(page, env!.barcode);
    await expectInventoryStockResults(page);
    await expectInventoryBarcodeVisible(page, env!.barcode);
    await expectInventoryPagination(page);

    await openInventoryPurchaseRequestsTab(page);
    const purchaseRequestsPanel = page.locator('.invMgmtTabPanels > [aria-hidden="false"]');
    await expect(
      purchaseRequestsPanel.locator(".tableWrap, .empty, .invMgmtError").first(),
    ).toBeVisible({ timeout: 15_000 });

    await openInventoryMovementsTab(page);
    await searchInventoryMovements(page, env!.barcode);
    await expectInventoryPagination(page);

    await openInventoryStockCountLogTab(page);
    const activePanel = page.locator('.invMgmtTabPanels > [aria-hidden="false"]');
    await expect(activePanel.locator(".invMgmtPagination, .empty, .invMgmtStockCountLog").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
