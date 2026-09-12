import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bcryptHash: vi.fn(),
  invalidateSessionVersion: vi.fn(),
  logActivity: vi.fn(),
  passwordChangedEmail: vi.fn(),
  prismaUserFindFirst: vi.fn(),
  prismaUserUpdate: vi.fn(),
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
  sendEmailAfter: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: { hash: mocks.bcryptHash } }));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}));
vi.mock("@/lib/authz", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mocks.prismaUserFindFirst,
      findUnique: vi.fn(),
      update: mocks.prismaUserUpdate,
    },
    booking: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/activity-log", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/session-revocation", () => ({
  invalidateSessionVersion: mocks.invalidateSessionVersion,
}));
vi.mock("@/lib/email", () => ({
  passwordChangedEmail: mocks.passwordChangedEmail,
  sendEmailAfter: mocks.sendEmailAfter,
}));

import { changeUserPasswordAction } from "./users";

function passwordForm(userId = "user-1") {
  const formData = new FormData();
  formData.set("userId", userId);
  formData.set("newPassword", "new-password");
  formData.set("confirmPassword", "new-password");
  return formData;
}

beforeEach(() => {
  mocks.requirePermission.mockResolvedValue({ user: { id: "super-admin-1" } });
  mocks.prismaUserFindFirst.mockResolvedValue({
    id: "user-1",
    name: "Traveller",
    email: "traveller@example.com",
  });
  mocks.bcryptHash.mockResolvedValue("hashed-password");
  mocks.passwordChangedEmail.mockReturnValue({ subject: "Password changed" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("changeUserPasswordAction", () => {
  it("allows only the super-admin capability and revokes the target's sessions", async () => {
    await changeUserPasswordAction(passwordForm());

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "users.password.manage",
      "/login?callbackUrl=/admin/users",
    );
    expect(mocks.prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-password", sessionVersion: { increment: 1 } },
    });
    expect(mocks.invalidateSessionVersion).toHaveBeenCalledWith("user-1");
    expect(mocks.logActivity).toHaveBeenCalledWith({
      userId: "user-1",
      action: "PASSWORD_RESET_BY_ADMIN",
      label: "Password reset by a super admin",
      metadata: { changedById: "super-admin-1" },
    });
  });

  it("rejects attempts to bypass the current-password check for the super admin", async () => {
    await expect(changeUserPasswordAction(passwordForm("super-admin-1"))).rejects.toThrow(
      "Use your profile settings to change your own password.",
    );

    expect(mocks.prismaUserFindFirst).not.toHaveBeenCalled();
    expect(mocks.prismaUserUpdate).not.toHaveBeenCalled();
  });
});
