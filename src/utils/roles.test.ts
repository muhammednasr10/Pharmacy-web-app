import { describe, expect, it } from "vitest";
import {
  canManageStaffRolePermissions,
  canViewInventoryCostProfit,
  isOrgPharmacyAdmin,
  isStaffAssignableLoginAccount,
  isStaffAssignableSystemUser,
  isSuperAdmin,
  normalizeRole,
  parseLoginAccountRole,
} from "./roles";
import type { AppUser } from "../types";

function user(role: AppUser["role"]): AppUser {
  return {
    uid: "test-user",
    name: "Test User",
    email: "test@example.com",
    role,
    pharmacyId: "pharmacy-1",
    isActive: true,
  };
}

describe("normalizeRole", () => {
  it("maps legacy admin roles to pharmacy_admin", () => {
    expect(normalizeRole("admin")).toBe("pharmacy_admin");
    expect(normalizeRole("pharmacy_admin")).toBe("pharmacy_admin");
  });

  it("preserves custom role keys", () => {
    expect(normalizeRole("custom_cashier_plus")).toBe("custom_cashier_plus");
  });

  it("falls back unknown roles to cashier", () => {
    expect(normalizeRole("unknown_role")).toBe("cashier");
  });
});

describe("parseLoginAccountRole", () => {
  it("accepts builtin roles", () => {
    expect(parseLoginAccountRole("cashier")).toBe("cashier");
  });

  it("preserves custom role keys", () => {
    expect(parseLoginAccountRole("custom_front_desk")).toBe("custom_front_desk");
  });
});

describe("role permission gates", () => {
  it("grants org admin powers to pharmacy_admin", () => {
    expect(isOrgPharmacyAdmin(user("pharmacy_admin"))).toBe(true);
    expect(canManageStaffRolePermissions(user("pharmacy_admin"))).toBe(true);
  });

  it("blocks cashier from managing role permissions", () => {
    expect(canManageStaffRolePermissions(user("cashier"))).toBe(false);
  });

  it("treats super_admin as org admin but not role editor", () => {
    expect(isSuperAdmin(user("super_admin"))).toBe(true);
    expect(isOrgPharmacyAdmin(user("super_admin"))).toBe(true);
    expect(canManageStaffRolePermissions(user("super_admin"))).toBe(true);
  });

  it("excludes super_admin from staff assignable users and login accounts", () => {
    expect(isStaffAssignableSystemUser(user("super_admin"))).toBe(false);
    expect(isStaffAssignableSystemUser(user("cashier"))).toBe(true);
    expect(isStaffAssignableLoginAccount({ role: "super_admin" })).toBe(false);
    expect(isStaffAssignableLoginAccount({ role: "cashier" })).toBe(true);
  });

  it("shows inventory buy price and profit only to system owner and pharmacy admin", () => {
    expect(canViewInventoryCostProfit(user("super_admin"))).toBe(true);
    expect(canViewInventoryCostProfit(user("pharmacy_admin"))).toBe(true);
    expect(canViewInventoryCostProfit(user("branch_manager"))).toBe(false);
    expect(canViewInventoryCostProfit(user("cashier"))).toBe(false);
    expect(canViewInventoryCostProfit(user("inventory"))).toBe(false);
  });
});
