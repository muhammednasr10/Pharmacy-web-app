import { expect, type Page } from "@playwright/test";

export async function fillPosCustomerDetails(
  page: Page,
  customer: { name: string; phone?: string; address?: string },
) {
  const btn = page.locator(".posCustomerDataBtn").first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  if ((await btn.getAttribute("aria-expanded")) !== "true") {
    await btn.click();
  }
  const modal = page.locator(".posCustomerDataModal");
  const panel = modal.locator(".posCustomerDataPanel");
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await expect(panel).toBeVisible({ timeout: 10_000 });
  // Order: phone → name → address
  if (customer.phone) {
    await panel.locator('input[type="tel"]').fill(customer.phone);
  }
  await panel.locator("input").nth(1).fill(customer.name);
  if (customer.address) {
    await panel.locator("input").nth(2).fill(customer.address);
  }
  await expect(btn).toHaveClass(/has-data/);
  await modal.getByRole("button", { name: /^تم$|^Done$/ }).click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}
