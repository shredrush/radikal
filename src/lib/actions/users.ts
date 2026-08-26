"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";
import { updateUserSchema } from "@/lib/validations/users";

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

/**
 * Admin action: update a user's profile details and role. Changes are
 * recorded in the target user's activity log so there is a full audit trail.
 */
export async function updateUserAction(formData: FormData) {
  const session = await requirePermission("users.manage", "/login?callbackUrl=/admin/users");

  const userId = asString(formData.get("userId"));
  const name = sanitizeText(asString(formData.get("name")), { maxLength: 100 });
  const email = asString(formData.get("email")).toLowerCase();
  const username = asString(formData.get("username"));
  const role = asString(formData.get("role"));

  const parsed = updateUserSchema.safeParse({ userId, name, email, username, role });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user details.");
  }

  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!target) {
    throw new Error("User not found.");
  }

  // Never let an admin change their own role — that could lock them (and the
  // last admin) out of the admin board.
  if (session.user.id === data.userId && target.role !== data.role) {
    throw new Error("You cannot change your own role.");
  }

  const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
  if (emailTaken && emailTaken.id !== data.userId) {
    throw new Error("An account with this email already exists.");
  }

  if (data.username) {
    const usernameTaken = await prisma.user.findUnique({ where: { username: data.username } });
    if (usernameTaken && usernameTaken.id !== data.userId) {
      throw new Error("This username is already taken.");
    }
  }

  try {
    await prisma.user.update({
      where: { id: data.userId },
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        role: data.role,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      throw new Error("This email or username is already taken.");
    }
    throw error;
  }

  await logActivity({
    userId: data.userId,
    action: "USER_PROFILE_UPDATED",
    label: "Profile updated by an admin",
    metadata: {
      name: data.name,
      email: data.email,
      username: data.username,
      role: data.role,
    },
  });

  if (target.role !== data.role) {
    await logActivity({
      userId: data.userId,
      action: "USER_ROLE_CHANGED",
      label: `Role changed from ${target.role} to ${data.role}`,
      metadata: { from: target.role, to: data.role },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${data.userId}`);
}
