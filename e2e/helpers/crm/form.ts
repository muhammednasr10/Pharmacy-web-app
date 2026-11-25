import type { Locator, Page } from "@playwright/test";

export async function fillSaasField(
  modal: Locator,
  page: Page,
  labelRegex: RegExp,
  value: string,
  inputSelector = "input",
) {
  await modal
    .locator(".saasField")
    .filter({ has: page.locator("span", { hasText: labelRegex }) })
    .locator(inputSelector)
    .fill(value);
}

export async function fillEmptyDateFields(modal: Locator, fallback = "1990-01-01") {
  for (const dateInput of await modal.locator('input[type="date"]').all()) {
    const value = await dateInput.inputValue();
    if (!value) {
      await dateInput.fill(fallback);
    }
  }
}
