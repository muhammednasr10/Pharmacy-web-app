import { describe, expect, it } from "vitest";
import { formatPosSaleError } from "./posSaleErrors";

describe("formatPosSaleError", () => {
  it("returns Arabic copy for known sale error codes", () => {
    const message = formatPosSaleError(new Error("cashier_shift_invalid"), true);
    expect(message).toContain("الوردية");
  });

  it("returns English copy for known sale error codes", () => {
    const message = formatPosSaleError(new Error("empty_cart"), false);
    expect(message).toBe("Cart is empty.");
  });

  it("maps legacy medicine not found message", () => {
    const message = formatPosSaleError(new Error("Medicine not found"), true);
    expect(message).toContain("غير موجود");
  });

  it("falls back to generic sale error when message is empty", () => {
    const message = formatPosSaleError(null, false);
    expect(message).toBe("An error occurred while completing the sale");
  });
});
