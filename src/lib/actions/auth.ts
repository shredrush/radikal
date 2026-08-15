"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@/lib/auth";
import {
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
  sanitizeText,
} from "@/lib/sanitize";
import { changePasswordSchema, loginSchema, signupSchema } from "@/lib/validations/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export type LoginActionState = {
  error?: string;
  email?: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const email = formData.get("email")?.toString().trim() ?? "";
    return { error: "Enter a valid email and password.", email };
  }

  const rawCallbackUrl = formData.get("callbackUrl");
  // Only ever redirect to a relative, same-site path — never trust an
  // absolute URL coming from client input.
  const redirectTo =
    typeof rawCallbackUrl === "string" && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  const { email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    return { error: "Invalid email. Create an account", email };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid password", email };
    }
    throw error;
  }

  return { email };
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

  try {
    // Log the new user in immediately after signup.
    await signIn("credentials", {
      email,
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

  return { success: true };
}
