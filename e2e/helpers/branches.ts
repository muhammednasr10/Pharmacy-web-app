import { expect, type Page } from "@playwright/test";

export async function expectBranchesPageLoaded(page: Page) {
  const branchesPage = page.locator(".branchesPage");
  if (await branchesPage.isVisible().catch(() => false)) {
    await expect(branchesPage).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".branchesPage table, .branchesPage .empty").first()).toBeVisible({
      timeout: 15_000,
    });
    return;
  }

  // Fallback: multi-branch UX moved into inventory warehouse bar for some roles.
  await expect(page.locator(".inventoryManagementPage, .inventoryWarehouseBar").first()).toBeVisible({
    timeout: 30_000,
  });
}

export async function expectBranchSwitcherIfPresent(page: Page) {
  const select = page.locator(".topbarBranchChip select").first();
  const count = await select.count();
  if (count === 0) return;

  await expect(select).toBeVisible();
  expect(await select.locator("option").count()).toBeGreaterThan(0);
}

export async function expectTransferStockButtonIfPresent(page: Page) {
  const transferBtn = page.getByRole("button", { name: /نقل مخزون|Transfer stock/i });
  if ((await transferBtn.count()) === 0) return;
  await expect(transferBtn.first()).toBeVisible();
}
