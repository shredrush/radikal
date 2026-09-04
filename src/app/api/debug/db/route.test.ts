import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthorizedUser: vi.fn(),
  getDatabaseErrorStatus: vi.fn(),
  getDatabaseConnectionLogInfo: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  getAuthorizedUser: mocks.getAuthorizedUser,
}));
vi.mock("@/lib/database-url", () => ({
  getDatabaseConnectionLogInfo: mocks.getDatabaseConnectionLogInfo,
}));
vi.mock("@/lib/prisma", () => ({
  getDatabaseErrorStatus: mocks.getDatabaseErrorStatus,
  prisma: { $queryRaw: mocks.queryRaw },
}));

import { GET } from "./route";

beforeEach(() => {
  mocks.getDatabaseConnectionLogInfo.mockReturnValue({ host: "db.internal", source: "test" });
  mocks.getDatabaseErrorStatus.mockReturnValue(503);
  mocks.queryRaw.mockResolvedValue([{ ok: 1 }]);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/debug/db", () => {
  it("rejects unauthorized callers without querying the database or exposing metadata", async () => {
    mocks.getAuthorizedUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.getDatabaseConnectionLogInfo).not.toHaveBeenCalled();
  });

  it("returns the health-check result only after the system.debug authorization gate", async () => {
    mocks.getAuthorizedUser.mockResolvedValue({ id: "admin-1", role: "ADMAX" });

    const response = await GET();

    expect(mocks.getAuthorizedUser).toHaveBeenCalledWith("system.debug");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      connection: { host: "db.internal", source: "test" },
      result: [{ ok: 1 }],
    });
  });

  it("hides database errors and returns a controlled unavailable response", async () => {
    mocks.getAuthorizedUser.mockResolvedValue({ id: "admin-1", role: "ADMAX" });
    mocks.queryRaw.mockRejectedValue(Object.assign(new Error("database unavailable"), { code: "P1001" }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      connection: { host: "db.internal", source: "test" },
    });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
