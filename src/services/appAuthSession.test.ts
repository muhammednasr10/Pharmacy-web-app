import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function buildToken(expSeconds: number) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds, sub: "user-1" })).toString(
    "base64url",
  );
  return `${header}.${payload}.signature`;
}

describe("appAuthSession", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when token is expired", async () => {
    const expiredToken = buildToken(Math.floor(Date.now() / 1000) - 60);
    const { setAppAccessToken, getAppAccessToken } = await import("./appAuthSession");

    setAppAccessToken(expiredToken, "user-1");
    expect(getAppAccessToken()).toBeNull();
  });

  it("returns token when still valid", async () => {
    const validToken = buildToken(Math.floor(Date.now() / 1000) + 3600);
    const { setAppAccessToken, getAppAccessToken, hasValidAppAccessToken } = await import(
      "./appAuthSession"
    );

    setAppAccessToken(validToken, "user-1");
    expect(getAppAccessToken()).toBe(validToken);
    expect(hasValidAppAccessToken()).toBe(true);
  });

  it("builds session from stored token and uid", async () => {
    const validToken = buildToken(Math.floor(Date.now() / 1000) + 3600);
    const { setAppAccessToken, buildAppAuthSession } = await import("./appAuthSession");

    setAppAccessToken(validToken, "user-42");
    expect(buildAppAuthSession()).toEqual({
      access_token: validToken,
      user: { id: "user-42" },
    });
  });

  it("clears session on sign out", async () => {
    const validToken = buildToken(Math.floor(Date.now() / 1000) + 3600);
    const { setAppAccessToken, clearAppAuthSession, getAppAccessToken } = await import(
      "./appAuthSession"
    );

    setAppAccessToken(validToken, "user-1");
    clearAppAuthSession();
    expect(getAppAccessToken()).toBeNull();
  });
});
