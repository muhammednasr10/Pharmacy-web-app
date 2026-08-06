import { test, expect } from "@playwright/test";
import { getE2ELoginEnv, login, navigateToPage } from "./helpers/app";
import {
  expectBranchesPageLoaded,
  expectBranchSwitcherIfPresent,
  expectTransferStockButtonIfPresent,
} from "./helpers/branches";

test.describe("Branches page", () => {
  test("login, open branches, verify list and branch controls", async ({ page }) => {
    const env = getE2ELoginEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in .env.e2e");

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "branches");
    await expectBranchesPageLoaded(page);

    await expect(page.getByRole("heading", { name: /الفروع|Branches/i })).toBeVisible();
    await expectBranchSwitcherIfPresent(page);
    await expectTransferStockButtonIfPresent(page);
  });
});
