import { expect, type Page } from "@playwright/test";
import { acceptNextDialog } from "./app";

export type CrmCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
};

export type CrmFollowUpInput = {
  title: string;
  details: string;
  dueDate?: string;
};

export async function openCustomersTab(page: Page) {
  await page.getByRole("tab", { name: /العملاء|Customers/ }).click();
  await expect(page.locator(".crmCustomersPanel")).toBeVisible({ timeout: 15_000 });
}

export async function createCrmCustomer(page: Page, input: CrmCustomerInput) {
  await page.getByRole("button", { name: /\+ إضافة عميل|\+ Add customer/ }).click();
  await expect(page.locator(".crmFormModal")).toBeVisible();

  const modal = page.locator(".crmFormModal");
  await modal
    .locator(".saasField")
    .filter({ has: page.locator("span", { hasText: /^الاسم$|^Name$/ }) })
    .locator("input")
    .fill(input.name);

  if (input.phone) {
    await modal
      .locator(".saasField")
      .filter({ has: page.locator("span", { hasText: /^الهاتف$|^Phone$/ }) })
      .locator('input[dir="ltr"]')
      .fill(input.phone);
  }

  if (input.email) {
    await modal
      .locator(".saasField")
      .filter({ has: page.locator("span", { hasText: /^البريد$|^Email$/ }) })
      .locator('input[dir="ltr"]')
      .fill(input.email);
  }

  const dialogPromise = acceptNextDialog(page);
  await modal.getByRole("button", { name: /^حفظ$|^Save$/ }).click();
  const message = await dialogPromise;

  expect(message).toMatch(/تم حفظ بيانات العميل|Customer saved/);
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

export async function openCustomerProfile(page: Page, customerName: string) {
  await page.getByPlaceholder(/بحث بالاسم أو الهاتف|Search name or phone/).fill(customerName);
  await expect(page.getByRole("cell", { name: customerName })).toBeVisible({ timeout: 15_000 });

  const row = page.locator("tr", { hasText: customerName });
  await row.getByRole("button", { name: /^الملف$|^Profile$/ }).click();
  await expect(page.locator(".crmDetailModal")).toBeVisible({ timeout: 15_000 });
}

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
