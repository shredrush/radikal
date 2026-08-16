"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@/lib/auth";
import {
  passwordChangedEmail,
  passwordResetOtpEmail,
  sendEmailAfter,
  welcomeEmail,
} from "@/lib/email";
import { findUserByIdentifier } from "@/lib/login";
import { getClientIp, rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
  sanitizeText,
} from "@/lib/sanitize";
import {
  changePasswordSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  usernameSchema,
} from "@/lib/validations/auth";

// Password reset codes are 6 digits and single-use, expiring after 60 seconds.
// A new code can't be requested until this cooldown elapses.
const OTP_TTL_MS = 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;
// Burn a code after this many wrong guesses, on top of the in-memory rate
// limiter. Persisted per code so it survives restarts and works across
// serverless instances.
const OTP_MAX_ATTEMPTS = 5;

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

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
  if (!existingUser) {
    return { error: "No account found with this email or username.", identifier };
  }

  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid password", identifier };
    }
    throw error;
  }

  return { identifier };
}

export type SignupActionState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "username" | "password", string>>;
  values?: {
    name?: string;
    email?: string;
    username?: string;
  };
};

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  // Echo back the safe, sanitized form values so the user doesn't have to
  // re-type everything when one field (e.g. username) fails validation.
  const values: SignupActionState["values"] = {
    name: sanitizeText(formData.get("name")?.toString() ?? "", { maxLength: 100 }),
    email: (formData.get("email")?.toString() ?? "").trim().slice(0, 254),
    username: normalizeUsername(formData.get("username")?.toString() ?? ""),
  };

  if (!parsed.success) {
    const fieldErrors: SignupActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name" || field === "email" || field === "username" || field === "password") {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, values };
  }

  const { name, email, username, password } = parsed.data;

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

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return { fieldErrors: { username: "This username is already taken." }, values };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { name, email, username, passwordHash },
    });
  } catch (error) {
    // Handles a race where the username is taken between the check above and
    // the insert. The DB unique constraint is the final guard.
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { fieldErrors: { username: "This username is already taken." }, values };
    }
    throw error;
  }

  // Welcome the new account in the background — never block signup on email.
  sendEmailAfter(welcomeEmail({ to: email, name }));

  try {
    // Log the new user in immediately after signup. The credentials provider
    // reads `identifier` (email or username), not `email` — passing `email`
    // here would fail `loginSchema` and abort the automatic sign-in.
    await signIn("credentials", {
      identifier: email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    // next-auth signals a successful redirect by throwing a special error —
    // let Next.js handle it, don't swallow it as a login failure.
    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Please log in." };
    }
    throw error;
  }

  return {};
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
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
    data: { passwordHash: newPasswordHash },
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

export async function changeUsernameAction(
  _prevState: ChangeUsernameActionState,
  formData: FormData
): Promise<ChangeUsernameActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be logged in to change your username." };
  }

  // Throttle username changes per user to curb rapid renames and enumeration.
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "Account not found." };
  }

  // Nothing to do when the username is unchanged.
  if (user.username === username) {
    return { success: true };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { fieldErrors: { username: "This username is already taken." } };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { username },
    });
  } catch (error) {
    // The DB unique constraint is the final guard against a rename race.
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { fieldErrors: { username: "This username is already taken." } };
    }
    throw error;
  }

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
      data: { passwordHash: newPasswordHash },
    });
    return true;
  });

  if (!consumed) {
    return { error: "Invalid or expired code.", identifier };
  }

  // Security notification — let the account owner know the password changed.
  sendEmailAfter(passwordChangedEmail({ to: user.email, name: user.name }));

  return { success: true, identifier };
}
