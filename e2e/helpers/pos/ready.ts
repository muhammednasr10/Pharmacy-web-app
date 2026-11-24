import { expect, type Page } from "@playwright/test";

export async function ensurePosReady(page: Page) {
  const activeShift = page.locator(".cashierShiftPanelActive");
  if (!(await activeShift.isVisible().catch(() => false))) {
    const startShiftBtn = page.locator(".cashierShiftOpenTrigger");
    if (await startShiftBtn.isVisible().catch(() => false)) {
      await startShiftBtn.click();
      const confirmStart = page.locator(".cashierShiftStartBtn");
      const opened = await Promise.race([
        confirmStart.waitFor({ state: "visible", timeout: 12_000 }).then(() => "confirm" as const),
        activeShift.waitFor({ state: "visible", timeout: 12_000 }).then(() => "active" as const),
      ]).catch(() => null);
      if (opened === "confirm") {
        await confirmStart.click();
      }
      await expect(activeShift).toBeVisible({ timeout: 20_000 });
    }
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
