import type { Page, UserRole } from "../types";
import { defaultPagesForBuiltinRole, ROLE_PAGE_OPTIONS } from "./rolePermissions";

export type CustomRolePageOption = {
  page: Page;
  labelAr: string;
  labelEn: string;
};

export const CUSTOM_ROLE_PAGE_OPTIONS: CustomRolePageOption[] = ROLE_PAGE_OPTIONS.filter(
  (item) => item.page !== "branches" && item.page !== "sqlMigrations",
);

export const CUSTOM_ROLE_TEMPLATE_OPTIONS: UserRole[] = [
  "cashier",
  "inventory",
  "accountant",
  "branch_manager",
];

export function defaultPagesForCustomRoleTemplate(baseRole: UserRole): Page[] {
  const pages = defaultPagesForBuiltinRole(baseRole);
  const allowed = new Set(CUSTOM_ROLE_PAGE_OPTIONS.map((item) => item.page));
  return pages.filter((page) => allowed.has(page));
}

export function slugifyCustomRoleKey(nameEn: string, nameAr: string): string {
  const raw = (nameEn || nameAr || "role")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const latin = raw.replace(/[^\x00-\x7F]+/g, "").replace(/_+/g, "_");
  const slug = (latin || "role").replace(/^_|_$/g, "") || "role";
  return `custom_${slug}`;
}
