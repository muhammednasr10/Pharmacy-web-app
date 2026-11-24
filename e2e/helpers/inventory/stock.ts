import { expect, type Page } from "@playwright/test";
import { activeTabPanel, openInventoryStockTab, stockPanel } from "./tabs";

export async function searchInventoryStock(page: Page, term: string) {
  const input = page.locator(".invMgmtSearchInput").first();
  await input.fill("");
  await input.fill(term);
  await expect(input).toHaveValue(term);

  const panel = stockPanel(page);
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(panel.getByText(/جاري تحميل المخزون|Loading stock/)).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function expectInventoryStockResults(page: Page) {
  const panel = stockPanel(page);
  await expect(panel.locator(".invMgmtPagination").first()).toBeVisible({ timeout: 20_000 });
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });

  const dataRow = panel
    .locator("table tbody tr")
    .filter({ hasNotText: /جاري تحميل|Loading/ })
    .first();
  const empty = panel.getByText(/لا توجد نتائج|No results|No matching|لا يوجد/);
  await expect(dataRow.or(empty).first()).toBeVisible({ timeout: 30_000 });
}

export async function expectInventoryBarcodeVisible(page: Page, barcode: string) {
  const panel = stockPanel(page);
  await expect(panel.getByText(barcode, { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
}

export async function searchInventoryMovements(page: Page, term: string) {
  const panel = activeTabPanel(page);
  const input = panel
    .getByPlaceholder(/بحث بالدواء أو الباركود|Search medicine, barcode/)
    .first();
  await input.fill(term);
  await expect(panel.locator(".invMgmtPagination[aria-busy='true']")).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function expectInventoryPagination(page: Page) {
  const panel = activeTabPanel(page);
  await expect(panel.locator(".invMgmtPaginationMeta").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(panel.locator(".invMgmtPaginationPage").first()).toContainText(/صفحة|Page/);
}

export type ZeroStockMedicineInput = {
  barcode: string;
  nameAr: string;
  nameEn: string;
  sellPrice?: number;
  buyPrice?: number;
};

/** Creates a branch medicine with qty 0 so POS can flag it for purchase requests. */
export async function createZeroStockMedicine(page: Page, input: ZeroStockMedicineInput) {
  await openInventoryStockTab(page);
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.locator(".uiSpotlightOverlay").click({ timeout: 1_000 }).catch(() => undefined);

  const addBtn = page
    .locator('[data-tour-id="inventory-add-medicine"]')
    .or(page.getByRole("button", { name: /\+ إضافة دواء جديد|\+ Add New Medicine/ }));
  await expect(addBtn.first()).toBeVisible({ timeout: 20_000 });
  await addBtn.first().scrollIntoViewIfNeeded();
  await addBtn.first().click({ force: true });
  const modal = page.locator(".medicineFormModal");
  await expect(modal).toBeVisible({ timeout: 15_000 });

  const barcodeInput = modal.locator(".medicineEntryGridFields input").first();
  await barcodeInput.fill(input.barcode);

  await modal.getByPlaceholder(/اسم الدواء بالعربي|Arabic medicine name/).fill(input.nameAr);
  await modal.getByPlaceholder(/اسم الدواء بالإنجليزي|English medicine name/).fill(input.nameEn);

  const qtyInput = modal.locator('.medicineEntryField input[type="number"]').first();
  const sellPriceInput = modal.getByPlaceholder(/سعر البيع|Sell price/);
  const buyPriceInput = modal.getByPlaceholder(/سعر الشراء|Buy price/);

  await qtyInput.fill("0");
  await sellPriceInput.fill(String(input.sellPrice ?? 15));
  if (await buyPriceInput.isVisible().catch(() => false)) {
    await buyPriceInput.fill(String(input.buyPrice ?? 8));
  }

  const expiryInput = modal.locator('.medicineEntryField input[type="date"]').first();
  if (await expiryInput.isVisible().catch(() => false)) {
    await expiryInput.fill("2027-12-31");
  }

  await modal.getByRole("button", { name: /إضافة الدواء|Add Medicine|حفظ|Save/ }).click();
  await expect(modal).toBeHidden({ timeout: 25_000 });
}

export async function expectPurchaseRequestVisible(page: Page, barcode: string) {
  const panel = activeTabPanel(page);
  await expect(panel.getByText(barcode, { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  });
}
