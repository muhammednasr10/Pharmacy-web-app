import { describe, expect, it } from "vitest";
import type { PharmacySettings } from "../../types";
import {
  buildLoginAccountRequestNumber,
  buildSubscriptionRequestNumber,
  isMissingRpcError,
  isSubscriptionEndDatePassed,
  resolveOrgIdFromPharmacy,
} from "./authServiceShared";

describe("isSubscriptionEndDatePassed", () => {
  it("returns false when end date is empty", () => {
    expect(isSubscriptionEndDatePassed(null)).toBe(false);
    expect(isSubscriptionEndDatePassed(undefined)).toBe(false);
  });

  it("returns true when end date is in the past", () => {
    expect(isSubscriptionEndDatePassed("2020-01-01")).toBe(true);
  });

  it("returns false when end date is in the future", () => {
    expect(isSubscriptionEndDatePassed("2099-12-31")).toBe(false);
  });
});

describe("resolveOrgIdFromPharmacy", () => {
  it("uses organizationId when present", () => {
    const pharmacy = { id: "ph-1", organizationId: "org-99" } as PharmacySettings;
    expect(resolveOrgIdFromPharmacy(pharmacy)).toBe("org-99");
  });

  it("falls back to org-{pharmacyId}", () => {
    const pharmacy = { id: "ph-1" } as PharmacySettings;
    expect(resolveOrgIdFromPharmacy(pharmacy)).toBe("org-ph-1");
  });
});

describe("isMissingRpcError", () => {
  it("detects missing function errors", () => {
    expect(isMissingRpcError("Could not find the function public.foo()", "foo")).toBe(true);
  });

  it("detects schema cache errors", () => {
    expect(isMissingRpcError("schema cache issue for complete_sale", "complete_sale")).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingRpcError("insufficient_stock", "complete_sale")).toBe(false);
  });
});

describe("request number builders", () => {
  it("builds login account request numbers with ACC prefix", () => {
    expect(buildLoginAccountRequestNumber()).toMatch(/^ACC-\d+$/);
  });

  it("builds subscription request numbers with SUB prefix", () => {
    expect(buildSubscriptionRequestNumber()).toMatch(/^SUB-\d{8}-\d{4}$/);
  });
});
