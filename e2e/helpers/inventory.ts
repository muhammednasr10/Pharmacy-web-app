import { expect, type Page } from "@playwright/test";

export async function openInventoryStockTab(page: Page) {
  await page.getByRole("tab", { name: /المخزون الحالي|Current stock/ }).click();
  await expect(page.locator(".invMgmtStockToolbar")).toBeVisible({ timeout: 15_000 });
}

export async function searchInventoryStock(page: Page, term: string) {
  const input = page.locator(".invMgmtSearchInput");
  await input.fill(term);
  await expect(input).toHaveValue(term);
  await page.waitForTimeout(400);
}

export async function expectInventoryStockResults(page: Page) {
  await expect(page.locator(".invMgmtPagination")).toBeVisible({ timeout: 20_000 });
  const empty = page.getByText(/لا توجد نتائج|No results/);
  const table = page.locator(".invMgmtPanel table tbody tr");
  await expect(empty.or(table.first())).toBeVisible({ timeout: 20_000 });
}

export async function openInventoryMovementsTab(page: Page) {
  await page.getByRole("tab", { name: /حركة المخزون|Stock movements/ }).click();
  await expect(page.locator(".invMgmtPanel").filter({ has: page.locator("select") })).toBeVisible({
    timeout: 15_000,
  });
}

export async function searchInventoryMovements(page: Page, term: string) {
  await page
    .getByPlaceholder(/بحث بالدواء أو الباركود|Search medicine, barcode/)
    .fill(term);
  await page.waitForTimeout(400);
}

export async function expectInventoryPagination(page: Page) {
  await expect(page.locator(".invMgmtPaginationMeta")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".invMgmtPaginationPage")).toContainText(/صفحة|Page/);
}

export async function openInventoryStockCountLogTab(page: Page) {
  await page.getByRole("tab", { name: /سجل الجرد|Stock count log/ }).click();
  await expect(page.locator(".invMgmtPanel")).toBeVisible({ timeout: 15_000 });
}
