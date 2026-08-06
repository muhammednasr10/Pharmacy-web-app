import { expect, type Page } from "@playwright/test";
import { acceptNextDialog } from "./app";

export async function ensurePosReady(page: Page) {
  const startShiftBtn = page.locator(".cashierShiftOpenTrigger");
  if (await startShiftBtn.isVisible().catch(() => false)) {
    await startShiftBtn.click();
    await page.locator(".cashierShiftStartBtn").click();
    await expect(page.locator(".cashierShiftPanelActive")).toBeVisible({ timeout: 20_000 });
  }

  const useShiftBtn = page.locator(".posShiftsTableUseBtn").first();
  if (await useShiftBtn.isVisible().catch(() => false)) {
    await useShiftBtn.click();
  }

  const quickSaleBtn = page.getByRole("button", { name: /فتح البيع السريع|Open quick sale/ });
  if (await quickSaleBtn.isVisible().catch(() => false)) {
    await quickSaleBtn.click();
  }

  await expect(page.locator("#pos-barcode-input")).toBeVisible({ timeout: 20_000 });
}

export async function addBarcodeToCart(page: Page, barcode: string) {
  const input = page.locator("#pos-barcode-input");
  await input.fill(barcode);
  await input.press("Enter");
  await expect(page.locator(".posCartItem, .cartItem").first()).toBeVisible({ timeout: 10_000 });
}

export async function completePosSale(page: Page): Promise<string> {
  const dialogPromise = acceptNextDialog(page);
  await page.locator(".posCartCompleteBtn").click();
  const message = await dialogPromise;
  expect(message).toMatch(/INV-\d+/);
  return message.match(/INV-\d+/)?.[0] || "";
}

export async function holdCurrentCart(page: Page) {
  await page.locator(".posActionBtn.holdBtn").click();
  await expect(page.locator(".posActionFeedback")).toContainText(
    /تم تعليق الفاتورة بنجاح|Invoice held successfully/,
    { timeout: 15_000 },
  );
  await expect(page.locator(".posCartEmpty, .posCartPanel")).toBeVisible();
}

export async function resumeFirstHeldInvoice(page: Page) {
  await page.getByRole("button", { name: /الفواتير المعلقة|Held Invoices/ }).click();
  await expect(page.getByRole("heading", { name: /الفواتير المعلقة|Held Invoices/ })).toBeVisible();

  const resumeBtn = page.getByRole("button", { name: /^استرجاع$|^Resume$/ }).first();
  await expect(resumeBtn).toBeVisible({ timeout: 10_000 });
  await resumeBtn.click();

  await expect(page.locator(".posCartItem, .cartItem").first()).toBeVisible({ timeout: 10_000 });
}
