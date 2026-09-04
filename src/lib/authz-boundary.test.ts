import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirst: vi.fn(),
  loadDb: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findFirst: mocks.findFirst } },
  loadDb: mocks.loadDb,
}));

import { getAuthorizedUser, requirePermission } from "./authz";

beforeEach(() => {
  mocks.loadDb.mockImplementation(async (_label: string, query: () => unknown) => query());
  mocks.redirect.mockImplementation((destination: string) => {
    throw new Error(`redirect:${destination}`);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("authorization boundaries", () => {
  it("does not query the database for an anonymous request", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(getAuthorizedUser("support.manage")).resolves.toBeNull();

    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("uses the current database role instead of a stale privileged session role", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "ADMAX" } });
    mocks.findFirst.mockResolvedValue({ role: "USER" });

    await expect(getAuthorizedUser("system.debug")).resolves.toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", deletedAt: null },
      select: { role: true },
    });
  });

  it("returns the database role for a permitted request", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "USER", name: "Support" } });
    mocks.findFirst.mockResolvedValue({ role: "SUPPORT" });

    await expect(getAuthorizedUser("support.manage")).resolves.toMatchObject({
      id: "user-1",
      role: "SUPPORT",
    });
  });

  it("redirects when a server action's account was deleted after its session was issued", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findFirst.mockResolvedValue(null);

    await expect(requirePermission("users.manage", "/login?callbackUrl=/admin/users")).rejects.toThrow(
      "redirect:/login?callbackUrl=/admin/users",
    );
  });

  it("returns a current role only after the requested permission is granted", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    mocks.findFirst.mockResolvedValue({ role: "FINANCE" });

    await expect(requirePermission("bookings.confirm")).resolves.toMatchObject({
      user: { id: "user-1", role: "FINANCE" },
    });
  });
});
