import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./scope", () => ({
  applyPharmacyFilter: vi.fn((query: unknown) => query),
  applyPharmacyScopeFilter: vi.fn((query: unknown) => query),
  stampPharmacy: vi.fn((payload: unknown) => payload),
}));

vi.mock("../../utils/workSchedule", () => ({
  DEFAULT_ALLOWED_LATE_MINUTES: 15,
  isCheckInLate: vi.fn(() => false),
}));

import {
  getAttendanceForDay,
  recordCheckIn,
  recordCheckOut,
  setAttendanceStatus,
} from "./attendanceService";

function createMaybeSingleChain(result: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "order", "delete"] as const;
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("getAttendanceForDay", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns null when no record exists", async () => {
    fromMock.mockReturnValue(createMaybeSingleChain({ data: null, error: null }));

    await expect(getAttendanceForDay("user-1", "2026-08-05")).resolves.toBeNull();
  });
});

describe("recordCheckIn", () => {
  beforeEach(() => {
    fromMock.mockReset();
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
  });

  it("throws when employee already checked in", async () => {
    fromMock.mockReturnValue(
      createMaybeSingleChain({
        data: { id: 1, user_id: "user-1", work_date: "2026-08-05", check_in: "2026-08-05T08:00:00Z" },
        error: null,
      }),
    );

    await expect(recordCheckIn("user-1", "Employee", "2026-08-05")).rejects.toThrow(
      "already_checked_in",
    );
  });

  it("upserts attendance when check-in is allowed", async () => {
    fromMock
      .mockReturnValueOnce(createMaybeSingleChain({ data: null, error: null }))
      .mockReturnValueOnce({ upsert: upsertMock });

    await recordCheckIn("user-1", "Employee", "2026-08-05");

    expect(upsertMock).toHaveBeenCalled();
  });
});

describe("recordCheckOut", () => {
  beforeEach(() => {
    fromMock.mockReset();
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
  });

  it("throws when check-in is missing", async () => {
    fromMock.mockReturnValue(createMaybeSingleChain({ data: null, error: null }));

    await expect(recordCheckOut("user-1", "Employee", "2026-08-05")).rejects.toThrow(
      "check_in_required",
    );
  });

  it("throws when already checked out", async () => {
    fromMock.mockReturnValue(
      createMaybeSingleChain({
        data: {
          id: 1,
          user_id: "user-1",
          work_date: "2026-08-05",
          check_in: "2026-08-05T08:00:00Z",
          check_out: "2026-08-05T16:00:00Z",
        },
        error: null,
      }),
    );

    await expect(recordCheckOut("user-1", "Employee", "2026-08-05")).rejects.toThrow(
      "already_checked_out",
    );
  });

  it("upserts check-out when check-in exists", async () => {
    fromMock
      .mockReturnValueOnce(
        createMaybeSingleChain({
          data: {
            id: 1,
            user_id: "user-1",
            work_date: "2026-08-05",
            check_in: "2026-08-05T08:00:00Z",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce({ upsert: upsertMock });

    await recordCheckOut("user-1", "Employee", "2026-08-05");

    expect(upsertMock).toHaveBeenCalled();
  });
});

describe("setAttendanceStatus", () => {
  beforeEach(() => {
    fromMock.mockReset();
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
  });

  it("clears times when status is absent", async () => {
    fromMock
      .mockReturnValueOnce(
        createMaybeSingleChain({
          data: {
            id: 1,
            user_id: "user-1",
            work_date: "2026-08-05",
            check_in: "2026-08-05T08:00:00Z",
            check_out: "2026-08-05T16:00:00Z",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce({ upsert: upsertMock });

    await setAttendanceStatus("user-1", "Employee", "2026-08-05", "absent");

    const payload = upsertMock.mock.calls[0]?.[0]?.[0];
    expect(payload.check_in).toBeUndefined();
    expect(payload.check_out).toBeUndefined();
    expect(payload.status).toBe("absent");
  });
});
