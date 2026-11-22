import { describe, expect, it } from "vitest";
import { finalizeAllowedPagesForRole, isCustomRoleKey } from "./roleAccess";

describe("isCustomRoleKey", () => {
  it("detects custom role prefixes", () => {
    expect(isCustomRoleKey("custom_cashier_1")).toBe(true);
    expect(isCustomRoleKey("cashier")).toBe(false);
  });
});

describe("finalizeAllowedPagesForRole", () => {
  it("removes sql migrations page for every role including super_admin", () => {
    expect(
      finalizeAllowedPagesForRole("super_admin", ["dashboard", "pos", "sqlMigrations"]),
    ).toEqual(["dashboard", "pos"]);
    expect(
      finalizeAllowedPagesForRole("pharmacy_admin", ["dashboard", "pos", "sqlMigrations"]),
    ).toEqual(["dashboard", "pos"]);
  });
});
