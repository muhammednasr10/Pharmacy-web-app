import { describe, expect, it } from "vitest";
import { DEFAULT_APP_LOGO_URL, isInlineLogoSource, resolveAppLogoUrl } from "./appLogoAsset";

describe("appLogoAsset", () => {
  it("uses default static logo when unset", () => {
    expect(resolveAppLogoUrl()).toBe(DEFAULT_APP_LOGO_URL);
    expect(resolveAppLogoUrl("")).toBe(DEFAULT_APP_LOGO_URL);
  });

  it("keeps inline data URLs", () => {
    const dataUrl = "data:image/png;base64,abc";
    expect(resolveAppLogoUrl(dataUrl)).toBe(dataUrl);
    expect(isInlineLogoSource(dataUrl)).toBe(true);
  });

  it("keeps absolute static paths", () => {
    expect(resolveAppLogoUrl("/icon.svg")).toBe("/icon.svg");
  });
});
