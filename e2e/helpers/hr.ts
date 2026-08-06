import { expect, type Page } from "@playwright/test";

export async function openStaffAttendanceTab(page: Page) {
  await page.getByRole("button", { name: /الحضور والانصراف|Attendance/ }).click();
  await expect(page.locator(".hrAttendanceTable")).toBeVisible({ timeout: 30_000 });
}

export async function expectAttendanceTableLoaded(page: Page) {
  await expect(page.locator(".hrAttendanceTable tbody tr").first()).toBeVisible({
    timeout: 30_000,
  });
}

export async function checkInFirstAvailableEmployee(page: Page) {
  const todayRow = page.locator(".hrAttendanceTable tbody tr").first();
  await expect(todayRow).toBeVisible({ timeout: 15_000 });

  const checkInBtn = todayRow.getByRole("button", { name: /^حضور$|^In$/ });
  if (await checkInBtn.isVisible()) {
    await checkInBtn.click();
    await expect(todayRow.locator("td.col-time").first()).not.toHaveText(/^—$|^-$/);
    return "checked_in";
  }

  const checkInCell = todayRow.locator("td.col-time").nth(0);
  await expect(checkInCell).not.toHaveText(/^—$|^-$/);
  return "already_checked_in";
}
