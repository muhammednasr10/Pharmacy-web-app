import { test, expect } from "@playwright/test";
import { getE2EEnv, login, navigateToPage } from "./helpers/app";
import {
  checkInFirstAvailableEmployee,
  expectAttendanceTableLoaded,
  openStaffAttendanceTab,
} from "./helpers/hr";

test.describe("HR attendance", () => {
  test("login, open attendance tab, verify table, record check-in", async ({ page }) => {
    const env = getE2EEnv();
    test.skip(!env, "Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e");

    await login(page, env!.email, env!.password);
    await navigateToPage(page, "staff");

    await openStaffAttendanceTab(page);
    await expectAttendanceTableLoaded(page);

    const outcome = await checkInFirstAvailableEmployee(page);
    expect(["checked_in", "already_checked_in"]).toContain(outcome);
  });
});
