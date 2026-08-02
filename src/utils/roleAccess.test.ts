import { describe, expect, it } from "vitest";
import { finalizeAllowedPagesForRole, isCustomRoleKey } from "./roleAccess";

describe("isCustomRoleKey", () => {
  it("detects custom role prefixes", () => {
    expect(isCustomRoleKey("custom_cashier_1")).toBe(true);
    expect(isCustomRoleKey("cashier")).toBe(false);
  });
});

describe("finalizeAllowedPagesForRole", () => {
  it("adds sql migrations page only for super_admin", () => {
    const pages = finalizeAllowedPagesForRole("super_admin", ["dashboard", "pos"]);
    expect(pages).toContain("sqlMigrations");
  });

  it("removes sql migrations page from non-super roles", () => {
    const pages = finalizeAllowedPagesForRole("pharmacy_admin", [
      "dashboard",
      "pos",
      "sqlMigrations",
    ]);
    expect(pages).not.toContain("sqlMigrations");
    expect(pages).toEqual(["dashboard", "pos"]);
  });
});
