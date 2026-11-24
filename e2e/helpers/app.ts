import { expect, type Dialog, type Page } from "@playwright/test";

const PAGE_URLS = {
  pos: "/pos",
  invoices: "/invoices",
  returns: "/returns",
  purchases: "/purchases",
  customers: "/customers",
  inventory: "/inventory",
  staff: "/staff",
  branches: "/branches",
  settings: "/settings",
} as const;

export type AppPageName = keyof typeof PAGE_URLS;

export type E2EEnv = {
  email: string;
  password: string;
  barcode: string;
};

export function getE2ELoginEnv(): Pick<E2EEnv, "email" | "password"> | null {
  const email = process.env.E2E_LOGIN_EMAIL?.trim();
  const password = process.env.E2E_LOGIN_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function requireE2ELoginEnv(): Pick<E2EEnv, "email" | "password"> {
  const env = getE2ELoginEnv();
  if (!env) {
    throw new Error("Missing E2E env vars. Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD in .env.e2e");
  }
  return env;
}

export function getE2EEnv(): E2EEnv | null {
  const email = process.env.E2E_LOGIN_EMAIL?.trim();
  const password = process.env.E2E_LOGIN_PASSWORD?.trim();
  const barcode = process.env.E2E_TEST_BARCODE?.trim();
  if (!email || !password || !barcode) return null;
  return { email, password, barcode };
}

export function requireE2EEnv(): E2EEnv {
  const env = getE2EEnv();
  if (!env) {
    throw new Error(
      "Missing E2E env vars. Set E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and E2E_TEST_BARCODE in .env.e2e",
    );
  }
  return env;
}

export async function acceptNextDialog(page: Page): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      page.off("dialog", onDialog);
      reject(new Error("Timed out waiting for browser dialog"));
    }, 30_000);

    const onDialog = async (dialog: Dialog) => {
      clearTimeout(timeout);
      page.off("dialog", onDialog);
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    };

    page.on("dialog", onDialog);
  });
}

export async function ensureLoginForm(page: Page) {
  const registerHeading = page.getByRole("heading", { name: /صيدلية جديدة|New pharmacy/i });
  if (await registerHeading.isVisible().catch(() => false)) {
    await page.getByTestId("auth-mode-toggle").click();
  }
  await expect(page.getByRole("heading", { name: /تسجيل الدخول|Sign in/i })).toBeVisible({
    timeout: 10_000,
  });
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await ensureLoginForm(page);
  await expect(page.getByTestId("login-email")).toBeVisible();

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  await page.getByTestId("login-submit").click();

  const appShell = page.locator(".app");
  const loginError = page.locator(".loginError");
  const denied = page.getByRole("heading", { name: /غير مسموح بالدخول|Access denied/i });

  const outcome = await Promise.race([
    appShell.waitFor({ state: "visible", timeout: 30_000 }).then(() => "app" as const),
    loginError.waitFor({ state: "visible", timeout: 30_000 }).then(() => "error" as const),
    denied.waitFor({ state: "visible", timeout: 30_000 }).then(() => "denied" as const),
  ]).catch(() => "timeout" as const);

  if (outcome === "app") {
    await ensureConcreteBranchSelected(page);
    return;
  }

  if (outcome === "error") {
    const message = (await loginError.textContent())?.trim() || "Unknown login error";
    throw new Error(`E2E login failed: ${message}`);
  }

  if (outcome === "denied") {
    throw new Error("E2E login denied — account is inactive or not linked to a pharmacy.");
  }

  throw new Error(
    "E2E login timed out — check E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD in .env.e2e (not the .example placeholders).",
  );
}

/** Prefer a real pharmacy branch over "All branches" so scoped writes/searches work in E2E. */
export async function ensureConcreteBranchSelected(page: Page) {
  const select = page
    .locator(".topbarBranchChip select, select[aria-label*='الفرع'], select[aria-label*='Branch']")
    .first();
  if ((await select.count()) === 0) return;
  if (!(await select.isVisible().catch(() => false))) return;

  // Wait briefly for concrete branch options to hydrate after login.
  await expect
    .poll(
      async () => {
        const values = await select.locator("option").evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLOptionElement).value),
        );
        return values.some((value) => value && value !== "__all__");
      },
      { timeout: 8_000 },
    )
    .toBe(true)
    .catch(() => undefined);

  const selectedValue = (await select.inputValue().catch(() => "")) || "";
  const selectedLabel = ((await select.locator("option:checked").textContent()) || "").trim();
  const isAllBranches =
    selectedValue === "__all__" || /كل الفروع|All branches/i.test(selectedLabel);
  if (selectedValue && !isAllBranches) return;

  const options = select.locator("option");
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const label = ((await option.textContent()) || "").trim();
    const value = await option.getAttribute("value");
    if (!value || value === "__all__" || /كل الفروع|All branches/i.test(label)) continue;
    await select.selectOption(value);
    return;
  }
}

export async function navigateToPage(page: Page, pageName: AppPageName) {
  await page.goto(PAGE_URLS[pageName]);

  if (pageName === "pos") {
    await expect(page.locator(".posOnlyPage, .posShiftGate, .posShiftWorkspace").first()).toBeVisible();
    return;
  }

  if (pageName === "customers") {
    await expect(page.locator(".crmPage, .customersPage")).toBeVisible({ timeout: 15_000 });
    return;
  }

  if (pageName === "inventory") {
    await expect(page.locator(".inventoryManagementPage")).toBeVisible({ timeout: 30_000 });
    return;
  }

  if (pageName === "staff") {
    await expect(page.locator(".staffPage")).toBeVisible({ timeout: 30_000 });
    return;
  }

  if (pageName === "invoices") {
    await expect(page.locator(".invoicesPage, .invoicePickerEmbed")).toBeVisible();
    return;
  }

  if (pageName === "purchases") {
    await expect(page.locator(".purchasesPage")).toBeVisible();
    return;
  }

  if (pageName === "branches") {
    // Dedicated /branches may redirect for super_admin; warehouse bar lives on inventory.
    const branchesPage = page.locator(".branchesPage");
    try {
      await expect(branchesPage).toBeVisible({ timeout: 8_000 });
      return;
    } catch {
      await page.goto("/inventory");
      await expect(
        page.locator(".inventoryManagementPage, .inventoryWarehouseBar").first(),
      ).toBeVisible({ timeout: 30_000 });
      return;
    }
  }

  if (pageName === "settings") {
    await expect(page.locator(".settingsPage")).toBeVisible({ timeout: 30_000 });
    return;
  }

  await expect(page.locator(".returnsPageWrap, .returnsPage")).toBeVisible();
}
