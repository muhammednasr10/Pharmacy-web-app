import { expect, type Page } from "@playwright/test";
import { acceptNextDialog, ensureConcreteBranchSelected, navigateToPage } from "./app";
import {
  addPurchaseBatchItem,
  openNewPurchaseModal,
  savePurchaseBatch,
} from "./purchases";

export async function ensurePosReady(page: Page) {
  const startShiftBtn = page.locator(".cashierShiftOpenTrigger");
  if (await startShiftBtn.isVisible().catch(() => false)) {
    await startShiftBtn.click();
    const confirmStart = page.locator(".cashierShiftStartBtn");
    await expect(confirmStart).toBeVisible({ timeout: 10_000 });
    await confirmStart.click();
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

/** Receive stock so POS barcode scans stay green across the suite. */
export async function restockBarcode(page: Page, barcode: string, qty = 10) {
  await navigateToPage(page, "purchases");
  await openNewPurchaseModal(page);
  await addPurchaseBatchItem(page, {
    barcode,
    qty,
    supplierName: "E2E Auto Restock",
  });
  await savePurchaseBatch(page);
}

async function scanBarcodeOnce(page: Page, barcode: string): Promise<string | null> {
  const input = page.locator("#pos-barcode-input");
  const dialogPromise = page.waitForEvent("dialog", { timeout: 4_000 }).then(
    async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    },
    () => null,
  );

  await input.fill("");
  await input.fill(barcode);
  await input.press("Enter");
  return dialogPromise;
}

export async function addBarcodeToCart(page: Page, barcode: string) {
  const cartItem = page.locator(".posCartItem, .cartItem").first();

  let alertMessage = await scanBarcodeOnce(page, barcode);
  if (await cartItem.isVisible().catch(() => false)) return;

  if (alertMessage && /اختر فرعاً|Select a specific branch/i.test(alertMessage)) {
    await ensureConcreteBranchSelected(page);
    await ensurePosReady(page);
    alertMessage = await scanBarcodeOnce(page, barcode);
    if (await cartItem.isVisible().catch(() => false)) return;
  }

  if (alertMessage && /غير متوفر|out of stock|كمية كافية|Not enough stock/i.test(alertMessage)) {
    await restockBarcode(page, barcode, 10);
    await navigateToPage(page, "pos");
    await ensurePosReady(page);
    alertMessage = await scanBarcodeOnce(page, barcode);
  }

  if (alertMessage && !(await cartItem.isVisible().catch(() => false))) {
    throw new Error(`POS barcode scan failed: ${alertMessage}`);
  }

  await expect(cartItem).toBeVisible({ timeout: 10_000 });
}

export async function completePosSale(page: Page): Promise<string> {
  await page.locator(".posCartCompleteBtn").click();
  const feedback = page.locator(".posActionFeedback");
  await expect(feedback).toContainText(/INV-\d+|تم تسجيل|completed|محلياً/i, {
    timeout: 20_000,
  });
  const message = ((await feedback.textContent()) || "").trim();
  const invoiceMatch = message.match(/INV-\d+/);
  // Fallback: some builds confirm via browser dialog instead of inline feedback.
  if (!invoiceMatch) {
    try {
      const dialogMessage = await acceptNextDialog(page);
      const fromDialog = dialogMessage.match(/INV-\d+/);
      if (fromDialog) return fromDialog[0];
    } catch {
      // keep going with feedback text
    }
  }
  expect(message).toMatch(/INV-\d+|تم تسجيل|completed|محلياً/i);
  return invoiceMatch?.[0] || "";
}

export async function holdCurrentCart(page: Page) {
  await page.locator(".posActionBtn.holdBtn").click();
  await expect(page.locator(".posActionFeedback")).toContainText(
    /تم تعليق الفاتورة بنجاح|Invoice held successfully/,
    { timeout: 15_000 },
  );
  await expect(page.locator(".posCartEmpty, .posCartPanel").first()).toBeVisible();
}

export async function resumeFirstHeldInvoice(page: Page) {
  await page.getByRole("button", { name: /الفواتير المعلقة|Held Invoices/ }).click();
  await expect(page.getByRole("heading", { name: /الفواتير المعلقة|Held Invoices/ })).toBeVisible();

  const resumeBtn = page.getByRole("button", { name: /^استرجاع$|^Resume$/ }).first();
  await expect(resumeBtn).toBeVisible({ timeout: 10_000 });
  await resumeBtn.click();

  await expect(page.locator(".posCartItem, .cartItem").first()).toBeVisible({ timeout: 10_000 });
}
