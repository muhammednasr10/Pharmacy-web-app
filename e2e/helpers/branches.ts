import { expect, type Page } from "@playwright/test";

export async function expectBranchesPageLoaded(page: Page) {
  await expect(page.locator(".branchesPage")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".branchesPage table, .branchesPage .empty")).toBeVisible({
    timeout: 15_000,
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
