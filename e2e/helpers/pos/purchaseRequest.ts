import { expect, type Page } from "@playwright/test";

export async function requestPurchaseFromSmartSearch(page: Page, query: string) {
  const input = page.locator("#pos-smart-search");
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill("");
  await input.fill(query);

  const results = page.locator(".posSmartSearchResults");
  await expect(results).toBeVisible({ timeout: 15_000 });
  const requestBtn = results.locator(".posPurchaseRequestBtn").first();
  await expect(requestBtn).toBeVisible({ timeout: 20_000 });
  await requestBtn.click();
  await expect(requestBtn).toHaveClass(/is-done/, { timeout: 10_000 });
}
