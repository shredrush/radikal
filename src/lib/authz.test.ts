import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: () => {},
}));
vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(null),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: () => Promise.resolve(null) } },
}));

import {
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "./authz";

describe("hasPermission", () => {
  it("fails closed for an undefined role", () => {
    expect(hasPermission(undefined, "bookings.read")).toBe(false);
  });

  it("grants no capabilities to USER and GUIDE", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("USER", permission)).toBe(false);
      expect(hasPermission("GUIDE", permission)).toBe(false);
    }
  });

  it("grants every permission to ADMAX", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission("ADMAX", permission)).toBe(true);
    }
  });

  it("grants SUPPORT booking triage and support desk, but not user management", () => {
    expect(hasPermission("SUPPORT", "bookings.read")).toBe(true);
    expect(hasPermission("SUPPORT", "bookings.confirm")).toBe(true);
    expect(hasPermission("SUPPORT", "bookings.cancel")).toBe(true);
    expect(hasPermission("SUPPORT", "support.manage")).toBe(true);
    expect(hasPermission("SUPPORT", "users.manage")).toBe(false);
    expect(hasPermission("SUPPORT", "trips.manage")).toBe(false);
  });

  it("grants FINANCE read + confirm only", () => {
    expect(hasPermission("FINANCE", "bookings.read")).toBe(true);
    expect(hasPermission("FINANCE", "bookings.confirm")).toBe(true);
    expect(hasPermission("FINANCE", "bookings.cancel")).toBe(false);
  });

  it("fails closed for an unknown role", () => {
    expect(hasPermission("SUPERADMIN" as Role, "bookings.read")).toBe(false);
    expect(hasPermission("SUPERADMIN" as Role, "system.debug")).toBe(false);
  });
});

describe("permission matrix", () => {
  it("covers every declared role", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ROLES].sort());
  });

  it("only maps declared permissions", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect((PERMISSIONS as readonly string[]).includes(permission)).toBe(true);
      }
    }
  });

  it("does not grant system.debug to anyone but ADMAX", () => {
    const debug: Permission = "system.debug";
    for (const role of ROLES) {
      if (role === "ADMAX") {
        expect(hasPermission(role, debug)).toBe(true);
      } else {
        expect(hasPermission(role, debug)).toBe(false);
      }
    }
  });
});
