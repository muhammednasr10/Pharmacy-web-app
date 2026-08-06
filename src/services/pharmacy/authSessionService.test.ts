import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const loginWithAppAuthMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
}));

vi.mock("../appAuthSession", () => ({
  buildAppAuthSession: vi.fn(() => null),
  clearAppAuthSession: vi.fn(),
  loginWithAppAuth: (...args: unknown[]) => loginWithAppAuthMock(...args),
  subscribeAppAuth: vi.fn(() => ({ unsubscribe: vi.fn() })),
}));

import {
  resolveLoginEmail,
  signInWithUsernameOrEmail,
} from "./authSessionService";

describe("resolveLoginEmail", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("returns normalized email when identifier contains @", async () => {
    await expect(resolveLoginEmail("  Manager@Pharmacy.COM ")).resolves.toBe("manager@pharmacy.com");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns null for empty identifier", async () => {
    await expect(resolveLoginEmail("   ")).resolves.toBeNull();
  });

  it("resolves username via RPC", async () => {
    rpcMock.mockResolvedValue({ data: "cashier@pharmacy.com", error: null });

    await expect(resolveLoginEmail("salah-manager")).resolves.toBe("cashier@pharmacy.com");
    expect(rpcMock).toHaveBeenCalledWith("resolve_login_email", {
      login_identifier: "salah-manager",
    });
  });

  it("throws when username login RPC is missing", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "function resolve_login_email does not exist", code: "42883" },
    });

    await expect(resolveLoginEmail("cashier1")).rejects.toThrow("username_login_not_configured");
  });
});

describe("signInWithUsernameOrEmail", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    loginWithAppAuthMock.mockReset();
  });

  it("returns invalid_login_identifier when username cannot be resolved", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const result = await signInWithUsernameOrEmail("unknown-user", "secret");

    expect(result.error?.message).toBe("invalid_login_identifier");
    expect(result.data.user).toBeNull();
  });

  it("returns session when credentials are valid", async () => {
    loginWithAppAuthMock.mockResolvedValue({
      session: {
        access_token: "token-1",
        user: { id: "user-1", email: "manager@pharmacy.com" },
      },
      error: null,
    });

    const result = await signInWithUsernameOrEmail("manager@pharmacy.com", "secret");

    expect(loginWithAppAuthMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      "manager@pharmacy.com",
      "secret",
    );
    expect(result.error).toBeNull();
    expect(result.data.user).toEqual({ id: "user-1", email: "manager@pharmacy.com" });
  });

  it("returns invalid_credentials when login fails", async () => {
    loginWithAppAuthMock.mockResolvedValue({ session: null, error: "invalid_credentials" });

    const result = await signInWithUsernameOrEmail("manager@pharmacy.com", "wrong");

    expect(result.error?.message).toBe("invalid_credentials");
    expect(result.data.session).toBeNull();
  });
});
