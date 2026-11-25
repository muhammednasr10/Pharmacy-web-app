import { expect, type Page } from "@playwright/test";

export async function completePosSale(page: Page): Promise<string> {
  const completeBtn = page.locator(".posCartCompleteBtn");
  await expect(completeBtn).toBeEnabled({ timeout: 10_000 });

  // Only handle the qty-confirm dialog for this click — do not leave a lingering handler.
  const qtyDialogPromise = page.waitForEvent("dialog", { timeout: 3_000 }).then(
    async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    },
    () => null,
  );

  await completeBtn.click();
  await qtyDialogPromise;

  const feedback = page.locator(".posActionFeedback");
  await expect(feedback).toBeVisible({ timeout: 45_000 });
  await expect(feedback).toContainText(/INV-\d+|تم تسجيل|completed|محلياً|خطأ|error|فشل|failed/i, {
    timeout: 45_000,
  });
  const message = ((await feedback.textContent()) || "").trim();
  if (/خطأ|error|فشل|failed/i.test(message) && !/INV-\d+/.test(message)) {
    throw new Error(`POS sale failed: ${message}`);
  }
  const invoiceMatch = message.match(/INV-\d+/);
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

export async function selectPosPaymentMethod(
  page: Page,
  method: "cash" | "visa" | "wallet" | "credit" | "delivery",
) {
  const select = page.locator(".paymentMethodRow select").first();
  await expect(select).toBeVisible({ timeout: 10_000 });

  if (method === "delivery") {
    const deliveryByLabel = select.locator("option", { hasText: /دليفري|Delivery/ }).first();
    if (await deliveryByLabel.count()) {
      const value = await deliveryByLabel.getAttribute("value");
      if (value) {
        await select.selectOption(value);
        return;
      }
    }
  }

  const byValue = select.locator(`option[value="${method}"]`);
  if (await byValue.count()) {
    await select.selectOption(method);
    return;
  }

  throw new Error(`Payment method option not found: ${method}`);
}
