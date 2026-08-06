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

export async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(page.getByTestId("login-email")).toBeVisible();

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  await page.getByTestId("login-submit").click();
  await expect(page.locator(".app")).toBeVisible({ timeout: 30_000 });
}

export async function navigateToPage(page: Page, pageName: AppPageName) {
  await page.goto(PAGE_URLS[pageName]);

  if (pageName === "pos") {
    await expect(page.locator(".posOnlyPage, .posShiftGate, .posShiftWorkspace")).toBeVisible();
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
    await expect(page.locator(".branchesPage")).toBeVisible({ timeout: 30_000 });
    return;
  }

  if (pageName === "settings") {
    await expect(page.locator(".settingsPage")).toBeVisible({ timeout: 30_000 });
    return;
  }

  await expect(page.locator(".returnsPageWrap, .returnsPage")).toBeVisible();
}
