import { describe, expect, it } from "vitest";
import { pageFromPath, pageToPath } from "./pageRoutes";

describe("pageRoutes", () => {
  it("maps root to dashboard", () => {
    expect(pageFromPath("/")).toBe("dashboard");
    expect(pageToPath("dashboard")).toBe("/dashboard");
  });

  it("maps inventory sub-routes", () => {
    expect(pageFromPath("/inventory")).toBe("inventory");
    expect(pageFromPath("/inventory/movements")).toBe("stockMovements");
    expect(pageToPath("stockMovements")).toBe("/inventory/movements");
  });

  it("maps reports and investment alias", () => {
    expect(pageFromPath("/reports")).toBe("reports");
    expect(pageFromPath("/reports/investment")).toBe("costs");
    expect(pageToPath("costs")).toBe("/reports/investment");
  });

  it("maps staff and legacy hr page", () => {
    expect(pageFromPath("/staff")).toBe("users");
    expect(pageToPath("hr")).toBe("/staff");
  });
});
