import { expect, type Page } from "@playwright/test";

/** Picks the first delivery employee when the staff addon picker is available. */
export async function selectPosDeliveryEmployee(page: Page) {
  const trigger = page.locator(".posDeliveryEmployeeBtn").first();
  if (!(await trigger.count())) return false;
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();

  const picker = page.locator(".posDeliveryPickerModal");
  await expect(picker).toBeVisible({ timeout: 10_000 });
  const option = picker.locator(".posDeliveryEmployeeOption").first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(picker).toBeHidden({ timeout: 10_000 });
  await expect(trigger).toHaveClass(/has-data/);
  return true;
}
