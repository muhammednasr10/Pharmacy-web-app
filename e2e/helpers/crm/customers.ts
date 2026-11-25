import { expect, type Page } from "@playwright/test";
import { acceptNextDialog } from "../app";
import { fillEmptyDateFields, fillSaasField } from "./form";

export type CrmCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
};

export async function openCustomersTab(page: Page) {
  await page.getByRole("tab", { name: /العملاء|Customers/ }).click();
  await expect(page.locator(".crmCustomersPanel")).toBeVisible({ timeout: 15_000 });
}

export async function createCrmCustomer(page: Page, input: CrmCustomerInput) {
  await page.getByRole("button", { name: /\+ إضافة عميل|\+ Add customer/ }).click();
  await expect(page.locator(".crmFormModal")).toBeVisible();

  const modal = page.locator(".crmFormModal");
  await fillSaasField(
    modal,
    page,
    /^اسم العميل$|^الاسم$|^Customer name$|^Name$/,
    input.name,
  );

  if (input.phone) {
    await fillSaasField(
      modal,
      page,
      /^رقم التليفون$|^الهاتف$|^Phone$/,
      input.phone,
      'input[dir="ltr"]',
    );
  }

  if (input.email) {
    await fillSaasField(modal, page, /^البريد$|^Email$/, input.email, 'input[dir="ltr"]');
  }

  await fillEmptyDateFields(modal);

  const dialogPromise = acceptNextDialog(page);
  await modal.getByRole("button", { name: /^حفظ$|^Save$/ }).click();
  const message = await dialogPromise;

  expect(message).toMatch(/تم حفظ بيانات العميل|Customer saved/);
  await expect(modal).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText(input.name, { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function openCustomerProfile(page: Page, customerName: string) {
  const search = page.getByPlaceholder(/بحث بالاسم أو الهاتف|Search name or phone/);
  await search.fill(customerName);
  await expect(page.getByText(customerName, { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });

  const row = page.locator("tr", { hasText: customerName }).first();
  await row.getByRole("button", { name: /^الملف$|^Profile$/ }).click();
  await expect(page.locator(".crmDetailModal")).toBeVisible({ timeout: 15_000 });
}
