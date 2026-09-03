"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { auth, signIn } from "@/lib/auth";
import {
  emailChangedEmail,
  passwordChangedEmail,
  passwordResetOtpEmail,
  sendEmailAfter,
  welcomeEmail,
} from "@/lib/email";
import { findUserByIdentifier } from "@/lib/login";
import { invalidateSessionVersion } from "@/lib/session-revocation";
import { generateUsername } from "@/lib/username-generator";
import { logActivity } from "@/lib/activity-log";
import { getClientIp, rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
  sanitizeText,
} from "@/lib/sanitize";
import {
  changeEmailSchema,
  changePasswordSchema,
  changePhoneSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  usernameSchema,
} from "@/lib/validations/auth";

// Password reset codes are 6 digits and single-use, expiring after 5 minutes.
// A new code can't be requested until this cooldown elapses.
const OTP_TTL_MS = 5 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;
// Burn a code after this many wrong guesses, on top of the in-memory rate
// limiter. Persisted per code so it survives restarts and works across
// serverless instances.
const OTP_MAX_ATTEMPTS = 5;

export type LoginActionState = {
  error?: string;
  identifier?: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const identifier = formData.get("identifier")?.toString().trim() ?? "";
    return { error: "Enter your email or username and password.", identifier };
  }

  const rawCallbackUrl = formData.get("callbackUrl");
  // Only ever redirect to a relative, same-site path — never trust an
  // absolute URL coming from client input.
  const redirectTo =
    typeof rawCallbackUrl === "string" && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const { identifier, password } = parsed.data;

  // Throttle brute-force attempts both across many accounts (per client IP)
  // and against a single account (per identifier).
  const ip = await getClientIp();
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  if (!ipLimit.success) {
    return { error: rateLimitError(ipLimit), identifier };
  }
  const idLimit = rateLimit(
    `login:id:${identifier.trim().toLowerCase()}`,
    10,
    15 * 60_000,
  );
  if (!idLimit.success) {
    return { error: rateLimitError(idLimit), identifier };
  }

  const existingUser = await findUserByIdentifier(identifier);
  const invalidCredentials = "Invalid email/username or password.";
  if (!existingUser) {
    return { error: invalidCredentials, identifier };
  }

  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      await logActivity({
        userId: existingUser.id,
        action: "LOGIN_FAILED",
        label: "Failed to sign in (incorrect password)",
        metadata: { reason: "invalid_password" },
      });
      return { error: invalidCredentials, identifier };
    }
    throw error;
  }

  return { identifier };
}

export type SignupActionState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "username" | "password" | "phone", string>>;
  values?: {
    name?: string;
    email?: string;
    username?: string;
    phone?: string;
  };
};

async function generateAvailableUsername(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateUsername();
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing) return candidate;
  }
  return `traveler-${crypto.randomInt(0, 1_000_000)}`;
}

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });

  // Echo back the safe, sanitized form values so the user doesn't have to
  // re-type everything when one field (e.g. username) fails validation.
  const values: SignupActionState["values"] = {
    name: sanitizeText(formData.get("name")?.toString() ?? "", { maxLength: 100 }),
    email: (formData.get("email")?.toString() ?? "").trim().slice(0, 254),
    username: normalizeUsername(formData.get("username")?.toString() ?? ""),
    phone: (formData.get("phone")?.toString() ?? "").trim().slice(0, 16),
  };

  if (!parsed.success) {
    const fieldErrors: SignupActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "name" ||
        field === "email" ||
        field === "username" ||
        field === "password" ||
        field === "phone"
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, values };
  }

  const { name, email, username, password, phone } = parsed.data;

  // Limit account creation per client IP to curb scripted signups.
  const ip = await getClientIp();
  const ipLimit = rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000);
  if (!ipLimit.success) {
    return { error: rateLimitError(ipLimit), values };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with this email already exists.", values };
  }

  const resolvedUsername = username ?? (await generateAvailableUsername());

  if (username) {
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return { fieldErrors: { username: "This username is already taken." }, values };
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let newUserId = "";
  try {
    const createdUser = await prisma.user.create({
      data: { name, email, username: resolvedUsername, passwordHash, phone },
    });
    newUserId = createdUser.id;
  } catch (error) {
    // Handles a race where the username is taken between the check above and
    // the insert. The DB unique constraint is the final guard.
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { fieldErrors: { username: "This username is already taken." }, values };
    }
    throw error;
  }

  await logActivity({
    userId: newUserId,
    action: "ACCOUNT_CREATED",
    label: "Account created",
    metadata: { email },
  });

  // Welcome the new account in the background — never block signup on email.
  sendEmailAfter(welcomeEmail({ to: email, name }));

  redirect("/login");
}

export type UsernameAvailabilityState = {
  status: "available" | "taken" | "invalid" | "reserved" | "empty";
  message?: string;
};

/**
 * Checks whether a username can be registered. Runs the same sanitization and
 * reserved-name rules as `signupAction`, then checks the DB for an existing
 * user. Used by the signup form for live (on-blur) feedback.
 */
export async function checkUsernameAvailability(
  username: string
): Promise<UsernameAvailabilityState> {
  // Throttle the live availability check to prevent username enumeration and
  // abuse of the endpoint.
  const ip = await getClientIp();
  const ipLimit = rateLimit(`username-check:ip:${ip}`, 30, 60_000);
  if (!ipLimit.success) {
    return { status: "invalid", message: rateLimitError(ipLimit) };
  }

  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { status: "empty" };
  }

  if (isReservedUsername(normalized)) {
    return { status: "reserved", message: "This username is not available." };
  }

  if (!isValidUsername(normalized)) {
    return {
      status: "invalid",
      message:
        "Use 3–30 lowercase letters or numbers, with single -, _, or . separators.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { username: normalized } });
  if (existing) {
    return { status: "taken", message: "This username is already taken." };
  }

  return { status: "available", message: "This username is available." };
}

export type ChangePasswordActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;
};

export async function changePasswordAction(
  _prevState: ChangePasswordActionState,
  formData: FormData
): Promise<ChangePasswordActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be logged in to change your password." };
  }

  // Limit password-change attempts per user to slow brute-forcing of the
  // current-password field.
  const pwLimit = rateLimit(`change-password:user:${userId}`, 5, 15 * 60_000);
  if (!pwLimit.success) {
    return { error: rateLimitError(pwLimit) };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: ChangePasswordActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "currentPassword" || field === "newPassword" || field === "confirmPassword") {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) {
    return { error: "Account not found." };
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    return { fieldErrors: { currentPassword: "Current password is incorrect" } };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash, sessionVersion: { increment: 1 } },
  });
  invalidateSessionVersion(userId);

  await logActivity({
    userId,
    action: "PASSWORD_CHANGED",
    label: "Changed password",
  });

  // Security notification — let the account owner know the password changed.
  sendEmailAfter(passwordChangedEmail({ to: user.email, name: user.name }));

  return { success: true };
}

export type ChangeUsernameActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<Record<"username", string>>;
};

const USERNAME_CHANGE_LIMIT_MESSAGE =
  "you can only change username once, for help contact support";

export async function changeUsernameAction(
  _prevState: ChangeUsernameActionState,
  formData: FormData
): Promise<ChangeUsernameActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be logged in to change your username." };
  }

  // Throttle requests per user to curb rapid rename attempts and enumeration.
  const usernameLimit = rateLimit(`change-username:user:${userId}`, 10, 15 * 60_000);
  if (!usernameLimit.success) {
    return { error: rateLimitError(usernameLimit) };
  }

  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Enter a valid username.";
    return { fieldErrors: { username: message } };
  }

  const username = parsed.data;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      username: true,
      usernameChangeCount: true,
      guide: { select: { id: true, deletedAt: true } },
    },
  });
  if (!user) {
    return { error: "Account not found." };
  }

  // Nothing to do when the username is unchanged.
  if (user.username === username) {
    return { success: true };
  }

  if (user.usernameChangeCount >= 1) {
    return { error: USERNAME_CHANGE_LIMIT_MESSAGE };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { fieldErrors: { username: "This username is already taken." } };
  }

  const previousUsername = user.username;

  try {
    const changed = await prisma.$transaction(async (tx) => {
      // The conditional update is the concurrency guard: only one request can
      // consume the account's single username change.
      const update = await tx.user.updateMany({
        where: { id: userId, deletedAt: null, usernameChangeCount: 0 },
        data: { username, usernameChangeCount: { increment: 1 } },
      });

      if (update.count === 0) return false;

      // The handle is now live, so retire any alias that still points to it.
      await tx.usernameAlias.deleteMany({ where: { username } });

      // Keep the old handle resolving to this user's guide page.
      if (previousUsername) {
        await tx.usernameAlias.create({
          data: { username: previousUsername, userId },
        });
      }

      return true;
    });

    if (!changed) {
      return { error: USERNAME_CHANGE_LIMIT_MESSAGE };
    }
  } catch (error) {
    // The DB unique constraint is the final guard against a rename race.
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { fieldErrors: { username: "This username is already taken." } };
    }
    throw error;
  }

  await logActivity({
    userId,
    action: "USERNAME_CHANGED",
    label: "Changed username",
    metadata: { username },
  });

  updateTag("profiles");

  // For guide accounts the username is the public URL, so a rename must
  // invalidate both the old and the new guide pages.
  if (user.guide && !user.guide.deletedAt) {
    if (previousUsername) revalidatePath(`/${previousUsername}`);
    revalidatePath(`/${username}`);
    revalidatePath("/");
    revalidatePath("/community");
    updateTag("guides");
  }

  return { success: true };
}

export type ChangeEmailActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<Record<"email", string>>;
};

export async function changeEmailAction(
  _prevState: ChangeEmailActionState,
  formData: FormData
): Promise<ChangeEmailActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be logged in to change your email." };
  }

  // Throttle email changes per user to curb account-takeover probes.
  const emailLimit = rateLimit(`change-email:user:${userId}`, 5, 15 * 60_000);
  if (!emailLimit.success) {
    return { error: rateLimitError(emailLimit) };
  }

  const parsed = changeEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "Enter a valid email address." },
    };
  }

  const email = parsed.data.email;

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) {
    return { error: "Account not found." };
  }

  // Nothing to do when the email is unchanged.
  if (user.email === email) {
    return { success: true };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { email },
    });
  } catch (error) {
    // The DB unique constraint is the final guard against a rename race.
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { fieldErrors: { email: "An account with this email already exists." } };
    }
    throw error;
  }

  await logActivity({
    userId,
    action: "EMAIL_CHANGED",
    label: "Changed email",
    metadata: { email },
  });

  // Notify both the old and the new address so the change is always visible.
  sendEmailAfter(emailChangedEmail({ to: email, name: user.name, newEmail: email }));
  if (user.email !== email) {
    sendEmailAfter(emailChangedEmail({ to: user.email, name: user.name, newEmail: email }));
  }

  return { success: true };
}

export type ChangePhoneActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<Record<"phone", string>>;
};

export async function changePhoneAction(
  _prevState: ChangePhoneActionState,
  formData: FormData
): Promise<ChangePhoneActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be logged in to change your phone number." };
  }

  const phoneLimit = rateLimit(`change-phone:user:${userId}`, 5, 15 * 60_000);
  if (!phoneLimit.success) {
    return { error: rateLimitError(phoneLimit) };
  }

  const parsed = changePhoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return {
      fieldErrors: { phone: parsed.error.issues[0]?.message ?? "Enter a valid phone number." },
    };
  }

  const phone = parsed.data.phone;

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) {
    return { error: "Account not found." };
  }

  // Nothing to do when the phone number is unchanged.
  if (user.phone === phone) {
    return { success: true };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  await logActivity({
    userId,
    action: "PHONE_CHANGED",
    label: "Changed phone number",
    metadata: { phone },
  });

  return { success: true };
}

export type RequestPasswordResetState = {
  error?: string;
  identifier?: string;
  sent?: boolean;
};

export async function requestPasswordResetAction(
  _prevState: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const parsed = requestPasswordResetSchema.safeParse({
    identifier: formData.get("identifier"),
  });

  if (!parsed.success) {
    const identifier = formData.get("identifier")?.toString().trim() ?? "";
    return { error: "Enter your email or username.", identifier };
  }

  const { identifier } = parsed.data;

  // Throttle code requests both per client IP and per account identifier to
  // prevent OTP spam and enumeration sweeps. These apply uniformly whether or
  // not the account exists, so they don't reveal account existence.
  const ip = await getClientIp();
  const ipLimit = rateLimit(`password-reset:ip:${ip}`, 5, 15 * 60_000);
  if (!ipLimit.success) {
    return { error: rateLimitError(ipLimit), identifier };
  }
  const idLimit = rateLimit(
    `password-reset:id:${identifier.trim().toLowerCase()}`,
    5,
    15 * 60_000,
  );
  if (!idLimit.success) {
    return { error: rateLimitError(idLimit), identifier };
  }

  // Generate and hash a code up front. bcrypt dominates this action's runtime,
  // so doing it before the account lookup keeps the response timing roughly
  // identical whether or not the account exists — a faster "no account" path
  // would otherwise leak which emails/usernames are registered.
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    // Always report success so the response can't be used to enumerate which
    // email addresses or usernames have accounts.
    return { sent: true, identifier };
  }

  // Enforce a resend cooldown silently: within the cooldown window we still
  // report success but skip issuing and sending a fresh code. Returning an
  // error here would reveal the account exists (non-existent identifiers never
  // reach this branch), so the response stays identical either way.
  const latestOtp = await prisma.passwordResetOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (latestOtp) {
    const elapsed = Date.now() - latestOtp.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return { sent: true, identifier };
    }
  }

  // Delete any consumed or expired codes for this account (keeps the table
  // small and guarantees only one active code exists), then issue a fresh
  // single-use code.
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetOtp.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: { lte: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    await tx.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
  });

  await logActivity({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    label: "Requested a password reset code",
  });

  // Deliver the code in the background so the action never blocks on email.
  sendEmailAfter(passwordResetOtpEmail({ to: user.email, name: user.name, code }));

  return { sent: true, identifier };
}

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"identifier" | "otp" | "newPassword" | "confirmPassword", string>
  >;
  identifier?: string;
  success?: boolean;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    identifier: formData.get("identifier"),
    otp: formData.get("otp"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  const identifier = formData.get("identifier")?.toString().trim() ?? "";

  if (!parsed.success) {
    const fieldErrors: ResetPasswordState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "identifier" ||
        field === "otp" ||
        field === "newPassword" ||
        field === "confirmPassword"
      ) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, identifier };
  }

  const { otp, newPassword } = parsed.data;

  // Throttle verification attempts both per client IP and per identifier to
  // slow brute-forcing of the 6-digit code.
  const ip = await getClientIp();
  const ipLimit = rateLimit(`password-reset-verify:ip:${ip}`, 20, 15 * 60_000);
  if (!ipLimit.success) {
    return { error: rateLimitError(ipLimit), identifier };
  }
  const idLimit = rateLimit(
    `password-reset-verify:id:${identifier.trim().toLowerCase()}`,
    10,
    15 * 60_000,
  );
  if (!idLimit.success) {
    return { error: rateLimitError(idLimit), identifier };
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return { error: "Invalid or expired code.", identifier };
  }

  const record = await prisma.passwordResetOtp.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { error: "Invalid or expired code.", identifier };
  }

  // Persistent lockout: burn a code after too many wrong guesses. This is
  // stored on the record itself, so — unlike the in-memory rate limiter — it
  // survives restarts and is shared across serverless instances.
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { error: "Invalid or expired code.", identifier };
  }

  const matches = await bcrypt.compare(otp, record.codeHash);
  if (!matches) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { error: "Invalid or expired code.", identifier };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Consume the code atomically. The conditional update returns a count so a
  // code can't be replayed by two concurrent requests — both would otherwise
  // pass the bcrypt check above before either marks it used.
  const consumed = await prisma.$transaction(async (tx) => {
    const result = await tx.passwordResetOtp.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (result.count !== 1) {
      return false;
    }
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, sessionVersion: { increment: 1 } },
    });
    return true;
  });

  if (!consumed) {
    return { error: "Invalid or expired code.", identifier };
  }
  invalidateSessionVersion(user.id);

  await logActivity({
    userId: user.id,
    action: "PASSWORD_RESET_COMPLETED",
    label: "Reset password",
  });

  // Security notification — let the account owner know the password changed.
  sendEmailAfter(passwordChangedEmail({ to: user.email, name: user.name }));

  return { success: true, identifier };
}
