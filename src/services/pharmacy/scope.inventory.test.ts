import { beforeEach, describe, expect, it } from "vitest";
import { ALL_BRANCHES_ID } from "../../constants/branches";
import type { AppUser } from "../../types";
import {
  applyPharmacyFilter,
  prepareMedicinePayloadForPharmacy,
  resolveReadPharmacyId,
  resolveStampPharmacyId,
  setActivePharmacy,
  setCurrentAppUser,
  setOrganizationBranchIds,
  stampPharmacy,
} from "./scope";

function user(role: AppUser["role"], pharmacyId = "main"): AppUser {
  return {
    uid: "user-1",
    name: "Test",
    email: "test@example.com",
    role,
    pharmacyId,
    isActive: true,
  };
}

function createQuerySpy() {
  const calls: Array<{ method: "eq" | "in"; args: unknown[] }> = [];
  const query = {
    eq(col: string, val: string) {
      calls.push({ method: "eq", args: [col, val] });
      return query;
    },
    in(col: string, vals: string[]) {
      calls.push({ method: "in", args: [col, vals] });
      return query;
    },
  };
  return { query, calls };
}

describe("inventory scope helpers", () => {
  beforeEach(() => {
    setActivePharmacy(null);
    setCurrentAppUser(null);
    setOrganizationBranchIds([]);
  });

  it("stamps pharmacy_id onto payloads without one", () => {
    setCurrentAppUser(user("cashier", "branch-a"));
    expect(stampPharmacy({ name_ar: "دواء" })).toEqual({
      name_ar: "دواء",
      pharmacy_id: "branch-a",
    });
  });

  it("resolveStampPharmacyId prefers active branch over user pharmacy", () => {
    setActivePharmacy("branch-b");
    setCurrentAppUser(user("cashier", "branch-a"));
    expect(resolveStampPharmacyId()).toBe("branch-b");
  });

  it("resolveReadPharmacyId uses single org branch when all-branches selected", () => {
    setActivePharmacy(ALL_BRANCHES_ID);
    setOrganizationBranchIds(["branch-a"]);
    setCurrentAppUser(user("pharmacy_admin", "main"));
    expect(resolveReadPharmacyId()).toBe("branch-a");
  });

  it("prepareMedicinePayloadForPharmacy always sets pharmacy_id", () => {
    expect(
      prepareMedicinePayloadForPharmacy(
        { name_ar: "دواء", barcode: "123", qty: 4, price: 10 },
        "branch-x",
      ),
    ).toEqual(
      expect.objectContaining({
        name_ar: "دواء",
        barcode: "123",
        qty: 4,
        price: 10,
        pharmacy_id: "branch-x",
      }),
    );
  });

  it("applyPharmacyFilter scopes non-admin users to their pharmacy", () => {
    setCurrentAppUser(user("cashier", "branch-a"));
    const { query, calls } = createQuerySpy();

    applyPharmacyFilter(query);

    expect(calls).toEqual([{ method: "eq", args: ["pharmacy_id", "branch-a"] }]);
  });
});
