import { expect, type Page } from "@playwright/test";

export async function openSubscriptionSettingsTab(page: Page) {
  const tab = page.getByRole("button", { name: /الاشتراك والترخيص|Subscription/i });
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
  await expect(page.locator(".subscriptionTab")).toBeVisible({ timeout: 15_000 });
}

export async function expectSubscriptionPanelLoaded(page: Page) {
  await expect(
    page.locator(".subscriptionCompareSection, .subscriptionHero, .subscriptionProgressCard"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".subscriptionCompareGrid, .subscriptionHistoryCard")).toBeVisible({
    timeout: 15_000,
  });
}
