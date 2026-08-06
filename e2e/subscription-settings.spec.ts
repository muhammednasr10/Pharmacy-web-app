import { test } from "@playwright/test";
import { getE2ELoginEnv, login, navigateToPage } from "./helpers/app";
import { expectSubscriptionPanelLoaded, openSubscriptionSettingsTab } from "./helpers/settings";

test.describe("Subscription settings", () => {
  test("login, open subscription tab, verify tier panel", async ({ page }) => {
    const env = getE2ELoginEnv();
    test.skip(
      !env,
      "Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in .env.e2e (org admin / manager recommended)",
    );

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "settings");
    await openSubscriptionSettingsTab(page);
    await expectSubscriptionPanelLoaded(page);
  });
});
