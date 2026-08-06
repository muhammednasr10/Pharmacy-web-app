import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  addPurchaseBatchItem,
  expectPurchaseInHistory,
  openNewPurchaseModal,
  savePurchaseBatch,
} from "./helpers/purchases";

test.describe("Purchase batch receiving", () => {
  test("login, receive purchase batch, verify in purchases history", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);

    await navigateToPage(page, "purchases");
    await openNewPurchaseModal(page);

    await addPurchaseBatchItem(page, {
      barcode: env!.barcode,
      qty: 3,
      supplierName: "E2E Supplier",
    });

    const purchaseNumber = await savePurchaseBatch(page);
    expect(purchaseNumber).toMatch(/^PUR-\d+$/);

    await expectPurchaseInHistory(page, purchaseNumber, env!.barcode);
  });
});
