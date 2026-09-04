import { describe, expect, it, vi } from "vitest";

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class PrismaPg {},
}));
vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: class PrismaClient {},
}));
vi.mock("@/lib/database-url", () => ({
  getDatabaseCaCert: () => undefined,
  getDatabaseConnectionLogInfo: () => ({ source: "test" }),
  getDatabaseUrl: () => "postgresql://test:test@localhost:5432/test",
}));

import { getDatabaseErrorStatus, loadDb, safeDb } from "./prisma";

describe("database query error handling", () => {
  it("propagates a schema mismatch instead of serving a fallback", async () => {
    const error = Object.assign(new Error("missing column"), { code: "P2022" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(safeDb("test.schema", async () => { throw error; }, null)).rejects.toBe(error);

    consoleError.mockRestore();
  });

  it("serves a fallback only for transient database failures", async () => {
    const error = Object.assign(new Error("database unavailable"), { code: "P1001" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(safeDb("test.transient", async () => { throw error; }, "fallback")).resolves.toBe("fallback");

    consoleError.mockRestore();
  });

  it("propagates primary query failures", async () => {
    const error = Object.assign(new Error("database unavailable"), { code: "P1001" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(loadDb("test.primary", async () => { throw error; })).rejects.toBe(error);

    consoleError.mockRestore();
  });

  it("maps transient database failures to 503 and query faults to 500", () => {
    expect(getDatabaseErrorStatus({ code: "P1001" })).toBe(503);
    expect(getDatabaseErrorStatus({ code: "P2022" })).toBe(500);
  });
});
