import { expect, type Page } from "@playwright/test";
import { ensureConcreteBranchSelected, navigateToPage } from "../app";
import {
  addPurchaseBatchItem,
  openNewPurchaseModal,
  savePurchaseBatch,
} from "../purchases";
import { ensurePosReady } from "./ready";

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
