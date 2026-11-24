import { expect, type Page } from "@playwright/test";
import { acceptNextDialog } from "./app";

export type PurchaseBatchInput = {
  barcode: string;
  qty?: number;
  expiry?: string;
  supplierName?: string;
};

export async function openNewPurchaseModal(page: Page) {
  await page.getByRole("button", { name: /تسجيل توريد جديد|New Purchase/ }).click();
  await expect(page.locator(".purchaseModal")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".purchaseNumberReadonly")).toHaveValue(/^PUR-\d+$/);
}

export async function addPurchaseBatchItem(page: Page, input: PurchaseBatchInput) {
  const modal = page.locator(".purchaseModal");
  const qty = input.qty ?? 5;
  const expiry = input.expiry ?? "2027-12-31";

  if (input.supplierName) {
    await modal.getByPlaceholder(/اسم المورد|Supplier name/).fill(input.supplierName);
  }

  const barcodeInput = modal.locator(".medicineEntryGridFields input").first();
  await barcodeInput.fill(input.barcode);
  await barcodeInput.press("Enter");

  await expect(modal.locator(".medicineLookupStatus")).toBeVisible({ timeout: 15_000 });
  await expect(modal.locator(".medicineLookupStatus.isLoading")).toHaveCount(0, {
    timeout: 15_000,
  });

  const nameArInput = modal.getByPlaceholder(/اسم الدواء بالعربي|Arabic medicine name/);
  if ((await nameArInput.inputValue()).trim() === "") {
    await nameArInput.fill("دواء E2E");
  }

  const nameEnInput = modal.getByPlaceholder(/اسم الدواء بالإنجليزي|English medicine name/);
  if ((await nameEnInput.inputValue()).trim() === "") {
    await nameEnInput.fill("E2E Medicine");
  }

  const qtyInput = modal.locator('.medicineEntryField input[type="number"]').first();
  const sellPriceInput = modal.getByPlaceholder(/سعر البيع|Sell price/);
  const buyPriceInput = modal.getByPlaceholder(/سعر الشراء|Buy price/);
  const expiryInput = modal.locator('.medicineEntryField input[type="date"]').first();

  // Lookup re-apply can wipe qty/expiry shortly after match — fill then verify.
  await expect
    .poll(
      async () => {
        const sellPriceValue = await sellPriceInput.inputValue();
        if (!sellPriceValue || sellPriceValue === "0") {
          await sellPriceInput.fill("20");
        }
        const buyPriceValue = await buyPriceInput.inputValue();
        if (!buyPriceValue || buyPriceValue === "0") {
          await buyPriceInput.fill("12");
        }
        await qtyInput.fill(String(qty));
        await expiryInput.fill(expiry);
        const qtyValue = await qtyInput.inputValue();
        const expiryValue = await expiryInput.inputValue();
        return qtyValue === String(qty) && expiryValue === expiry;
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  await modal.getByRole("button", { name: /\+ إضافة للتوريد|\+ Add to purchase/ }).click();
  await expect(modal.locator(".purchaseDraftTableWrap tbody tr")).toHaveCount(1, {
    timeout: 10_000,
  });
}

export async function savePurchaseBatch(page: Page): Promise<string> {
  const modal = page.locator(".purchaseModal");
  const purchaseNumber = await modal.locator(".purchaseNumberReadonly").inputValue();

  const dialogPromise = acceptNextDialog(page);
  await modal.getByRole("button", { name: /حفظ التوريد|Save Purchase/ }).click();

  const message = await dialogPromise;
  expect(message).toMatch(/تم تسجيل التوريد بنجاح|Purchase saved successfully/);
  await expect(modal).toBeHidden({ timeout: 15_000 });

  return purchaseNumber;
}

export async function expectPurchaseInHistory(page: Page, purchaseNumber: string, barcode: string) {
  await page
    .getByPlaceholder(/بحث برقم التوريد|Search purchase no/)
    .fill(purchaseNumber);

  await expect(page.locator(".purchaseNumberTag", { hasText: purchaseNumber })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /^عرض$|^View$/ }).first().click();
  await expect(page.locator(".purchaseViewModal")).toBeVisible();
  await expect(page.getByText(barcode)).toBeVisible();
}
