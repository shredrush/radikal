import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  cookies: vi.fn(),
  findUserByIdentifier: vi.fn(),
  getClientIp: vi.fn(),
  invalidateSessionVersion: vi.fn(),
  logActivity: vi.fn(),
  rateLimit: vi.fn(),
  rateLimitError: vi.fn(),
  recordActivity: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  sendEmailAfter: vi.fn(),
  updateTag: vi.fn(),
  userUpdate: vi.fn(),
  otpCreate: vi.fn(),
  otpDeleteMany: vi.fn(),
  otpFindFirst: vi.fn(),
  otpUpdate: vi.fn(),
  otpUpdateMany: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: mocks.bcryptHash,
  },
}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));
vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  signIn: vi.fn(),
}));
vi.mock("@/lib/activity-log", () => ({
  logActivity: mocks.logActivity,
  recordActivity: mocks.recordActivity,
}));
vi.mock("@/lib/email", () => ({
  emailChangedEmail: vi.fn(),
  passwordChangedEmail: vi.fn(),
  passwordResetOtpEmail: vi.fn(),
  sendEmailAfter: mocks.sendEmailAfter,
  welcomeEmail: vi.fn(),
}));
vi.mock("@/lib/login", () => ({
  findUserByIdentifier: mocks.findUserByIdentifier,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetOtp: {
      create: mocks.otpCreate,
      deleteMany: mocks.otpDeleteMany,
      findFirst: mocks.otpFindFirst,
      update: mocks.otpUpdate,
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: mocks.userUpdate,
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        passwordResetOtp: { updateMany: mocks.otpUpdateMany },
        user: { update: mocks.userUpdate },
      }),
    ),
  },
  safeDb: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: mocks.getClientIp,
  rateLimit: mocks.rateLimit,
  rateLimitError: mocks.rateLimitError,
}));
vi.mock("@/lib/referrals", () => ({
  parseReferralAttribution: vi.fn(),
  REFERRAL_COOKIE_NAME: "radikal_referral",
}));
vi.mock("@/lib/session-revocation", () => ({
  invalidateSessionVersion: mocks.invalidateSessionVersion,
}));
vi.mock("@/lib/username-generator", () => ({
  generateUsername: vi.fn(),
}));

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "./auth";

const allowedRateLimit = {
  success: true,
  limit: 10,
  remaining: 9,
  resetAt: 0,
  retryAfterSeconds: 0,
};

function resetForm(otp = "123456") {
  const formData = new FormData();
  formData.set("identifier", "traveler@example.com");
  formData.set("otp", otp);
  formData.set("newPassword", "new-password");
  formData.set("confirmPassword", "new-password");
  return formData;
}

beforeEach(() => {
  mocks.bcryptHash.mockResolvedValue("hashed-password");
  mocks.getClientIp.mockResolvedValue("203.0.113.8");
  mocks.rateLimit.mockReturnValue(allowedRateLimit);
  mocks.rateLimitError.mockReturnValue("Too many attempts.");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("password recovery security boundaries", () => {
  it("does not disclose whether a password-reset identifier belongs to an account", async () => {
    mocks.findUserByIdentifier.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("identifier", "unknown@example.com");

    await expect(requestPasswordResetAction({}, formData)).resolves.toEqual({
      sent: true,
      identifier: "unknown@example.com",
    });

    expect(mocks.bcryptHash).toHaveBeenCalledOnce();
    expect(mocks.otpCreate).not.toHaveBeenCalled();
    expect(mocks.sendEmailAfter).not.toHaveBeenCalled();
  });

  it("increments the persisted attempt counter after an invalid reset code", async () => {
    mocks.findUserByIdentifier.mockResolvedValue({ id: "user-1" });
    mocks.otpFindFirst.mockResolvedValue({ id: "otp-1", attempts: 0, codeHash: "hash" });
    mocks.bcryptCompare.mockResolvedValue(false);

    await expect(resetPasswordAction({}, resetForm("654321"))).resolves.toEqual({
      error: "Invalid or expired code.",
      identifier: "traveler@example.com",
    });

    expect(mocks.otpUpdate).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data: { attempts: { increment: 1 } },
    });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("atomically consumes a valid reset code before changing the password and revoking sessions", async () => {
    mocks.findUserByIdentifier.mockResolvedValue({
      id: "user-1",
      email: "traveler@example.com",
      name: "Traveler",
    });
    mocks.otpFindFirst.mockResolvedValue({ id: "otp-1", attempts: 0, codeHash: "hash" });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.otpUpdateMany.mockResolvedValue({ count: 1 });

    await expect(resetPasswordAction({}, resetForm())).resolves.toEqual({
      success: true,
      identifier: "traveler@example.com",
    });

    expect(mocks.otpUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "otp-1", usedAt: null }),
      data: { usedAt: expect.any(Date) },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-password", sessionVersion: { increment: 1 } },
    });
    expect(mocks.invalidateSessionVersion).toHaveBeenCalledWith("user-1");
  });

  it("fails safely when another request has already consumed the reset code", async () => {
    mocks.findUserByIdentifier.mockResolvedValue({ id: "user-1" });
    mocks.otpFindFirst.mockResolvedValue({ id: "otp-1", attempts: 0, codeHash: "hash" });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.otpUpdateMany.mockResolvedValue({ count: 0 });

    await expect(resetPasswordAction({}, resetForm())).resolves.toEqual({
      error: "Invalid or expired code.",
      identifier: "traveler@example.com",
    });

    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.invalidateSessionVersion).not.toHaveBeenCalled();
  });
});
