import { expect, type Page } from "@playwright/test";

export type CrmFollowUpInput = {
  title: string;
  details: string;
  dueDate?: string;
};

export async function addCustomerFollowUp(page: Page, input: CrmFollowUpInput) {
  const modal = page.locator(".crmDetailModal");
  const activityForm = modal.locator(".crmActivityForm");

  await activityForm.locator("select").selectOption("follow_up");
  await activityForm.getByPlaceholder(/العنوان|Title/).fill(input.title);

  const dueDate = input.dueDate ?? "2027-06-15";
  await activityForm.locator('input[type="date"]').fill(dueDate);
  await activityForm.getByPlaceholder(/التفاصيل|Details/).fill(input.details);

  await activityForm.getByRole("button", { name: /حفظ النشاط|Save activity/ }).click();

  await expect(modal.locator(".crmTimelineItem", { hasText: input.title })).toBeVisible({
    timeout: 15_000,
  });
}

export async function openFollowUpsTab(page: Page) {
  await page.getByRole("tab", { name: /المتابعات|Follow-ups/ }).click();
  await expect(page.locator(".crmFollowUpsPanel")).toBeVisible({ timeout: 15_000 });
}

export async function expectFollowUpInTab(page: Page, customerName: string, title: string) {
  await expect(page.locator(".crmFollowUpCard", { hasText: customerName })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".crmFollowUpCard", { hasText: title })).toBeVisible();
}
