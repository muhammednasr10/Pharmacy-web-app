import { expect, type Page } from "@playwright/test";

function activeTabPanel(page: Page) {
  return page.locator('.invMgmtTabPanels > [aria-hidden="false"]');
}

function stockPanel(page: Page) {
  return activeTabPanel(page)
    .locator(".invMgmtStockToolbar")
    .locator("xpath=ancestor::*[contains(@class,'invMgmtPanel')][1]");
}

export async function openInventoryStockTab(page: Page) {
  await page.getByRole("tab", { name: /المخزون الحالي|Current stock/ }).click();
  await expect(page.locator(".invMgmtStockToolbar")).toBeVisible({ timeout: 15_000 });
}

export async function searchInventoryStock(page: Page, term: string) {
  const input = page.locator(".invMgmtSearchInput").first();
  await input.fill("");
  await input.fill(term);
  await expect(input).toHaveValue(term);

  const panel = stockPanel(page);
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(panel.getByText(/جاري تحميل المخزون|Loading stock/)).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function expectInventoryStockResults(page: Page) {
  const panel = stockPanel(page);
  await expect(panel.locator(".invMgmtPagination").first()).toBeVisible({ timeout: 20_000 });
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });

  const dataRow = panel
    .locator("table tbody tr")
    .filter({ hasNotText: /جاري تحميل|Loading/ })
    .first();
  const empty = panel.getByText(/لا توجد نتائج|No results|No matching|لا يوجد/);
  await expect(dataRow.or(empty).first()).toBeVisible({ timeout: 30_000 });
}

export async function expectInventoryBarcodeVisible(page: Page, barcode: string) {
  const panel = stockPanel(page);
  await expect(panel.getByText(barcode, { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
}

export async function openInventoryMovementsTab(page: Page) {
  await page.getByRole("tab", { name: /حركة المخزون|Stock movements/ }).click();
  await expect(
    page.locator(".invMgmtPanel").filter({ has: page.locator("select") }).first(),
  ).toBeVisible({
    timeout: 15_000,
  });
}

export async function searchInventoryMovements(page: Page, term: string) {
  const panel = activeTabPanel(page);
  const input = panel
    .getByPlaceholder(/بحث بالدواء أو الباركود|Search medicine, barcode/)
    .first();
  await input.fill(term);
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function expectInventoryPagination(page: Page) {
  // Tabs keep panels mounted; only the active panel is visible.
  const panel = activeTabPanel(page);
  await expect(panel.locator(".invMgmtPaginationMeta").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(panel.locator(".invMgmtPaginationPage").first()).toContainText(/صفحة|Page/);
}

export async function openInventoryStockCountLogTab(page: Page) {
  await page.getByRole("tab", { name: /سجل الجرد|Stock count log/ }).click();
  const panel = activeTabPanel(page);
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.locator(".invMgmtPanel, .invMgmtStockCountLog, .empty").first()).toBeVisible({
    timeout: 15_000,
  });
}
