import { expect, type Page } from "@playwright/test";

export function activeTabPanel(page: Page) {
  return page.locator('.invMgmtTabPanels > [aria-hidden="false"]');
}

export function stockPanel(page: Page) {
  return activeTabPanel(page)
    .locator(".invMgmtStockToolbar")
    .locator("xpath=ancestor::*[contains(@class,'invMgmtPanel')][1]");
}

export async function openInventoryStockTab(page: Page) {
  await page.getByRole("tab", { name: /المخزون الحالي|Current stock/ }).click();
  await expect(page.locator(".invMgmtStockToolbar")).toBeVisible({ timeout: 15_000 });
}

export async function openInventoryMovementsTab(page: Page) {
  await page.getByRole("tab", { name: /حركة المخزون|Stock movements/ }).click();
  await expect(
    page.locator(".invMgmtPanel").filter({ has: page.locator("select") }).first(),
  ).toBeVisible({
    timeout: 15_000,
  });
}

export async function openInventoryStockCountLogTab(page: Page) {
  await page.getByRole("tab", { name: /سجل الجرد|Stock count log/ }).click();
  const panel = activeTabPanel(page);
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.locator(".invMgmtPanel, .invMgmtStockCountLog, .empty").first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function openInventoryPurchaseRequestsTab(page: Page) {
  await page.getByRole("tab", { name: /طلبات الشراء|Purchase requests/ }).click();
  const panel = activeTabPanel(page);
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(
    panel.getByRole("heading", { name: /طلبات الشراء|Purchase requests/ }),
  ).toBeVisible({ timeout: 15_000 });
}
