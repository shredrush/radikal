"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";
import { unlinkAndDeleteGuide } from "@/lib/guide-teardown";
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

  const target = await prisma.user.findUnique({
    where: { id: data.userId },
    include: { guide: { select: { id: true } } },
  });
  if (!target) {
    throw new Error("User not found.");
  }

  // Never let an admin change their own role — that could lock them (and the
  // last admin) out of the admin board.
  if (session.user.id === data.userId && target.role !== data.role) {
    throw new Error("You cannot change your own role.");
  }

  // A user can only be a GUIDE when a guide profile is actually linked — the
  // guide's dashboard, trips, and public profile all depend on that row. Set
  // the role first via Admin → Guides instead of orphaning the account.
  if (data.role === "GUIDE" && !target.guide) {
    throw new Error(
      "This account has no guide profile. Create one under Admin → Guides before assigning the GUIDE role.",
    );
  }

  // Moving a user away from the GUIDE role removes their guide profile too.
  // Leaving the Guide row behind would keep a "vetted guide" public page and
  // bookable trips alive that nobody can manage.
  const demotingGuide = target.role === "GUIDE" && data.role !== "GUIDE" && !!target.guide;

  // The teardown unlinks the guide's trips but leaves them live and bookable,
  // so refuse to demote while any of their trips has an active booking — the
  // admin must cancel the bookings or reassign the trips first.
  if (demotingGuide && target.guide) {
    const activeBookings = await prisma.booking.count({
      where: {
        trip: { guideId: target.guide.id },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (activeBookings > 0) {
      throw new Error(
        "This guide's trips have active bookings. Cancel the bookings or reassign the trips before changing their role.",
      );
    }
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
  } else if (data.role === "GUIDE") {
    // A guide's username is its public URL — it can never be cleared.
    throw new Error("A guide account must have a username. Enter one instead of clearing it.");
  }

  const previousUsername = target.username;
  const usernameChanged = previousUsername !== data.username;

  try {
    await prisma.$transaction(async (tx) => {
      if (data.username) {
        // The handle is now live, so retire any alias that still points to it.
        await tx.usernameAlias.deleteMany({ where: { username: data.username } });
      }

      await tx.user.update({
        where: { id: data.userId },
        data: {
          name: data.name,
          email: data.email,
          username: data.username,
          role: data.role,
        },
      });

      // Demoting a guide tears down the guide linkage in the same transaction
      // so the role change can never leave an orphaned, unmanaged guide live.
      if (demotingGuide && target.guide) {
        await unlinkAndDeleteGuide(tx, target.guide.id);
      }

      // Keep the old handle resolving to this user's guide page — only when
      // they remain a guide (a demoted user has no guide page to resolve to).
      if (usernameChanged && previousUsername && target.guide && data.role === "GUIDE") {
        await tx.usernameAlias.create({
          data: { username: previousUsername, userId: data.userId },
        });
      }
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

  if (demotingGuide) {
    await logActivity({
      userId: data.userId,
      action: "GUIDE_PROFILE_REMOVED",
      label: "Guide profile removed because the role was changed away from GUIDE",
      metadata: { guideId: target.guide?.id },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${data.userId}`);

  // For guide accounts the username is the public URL, so a rename must
  // invalidate both the old and the new guide pages.
  if (target.guide && data.role === "GUIDE" && usernameChanged) {
    if (previousUsername) revalidatePath(`/${previousUsername}`);
    if (data.username) revalidatePath(`/${data.username}`);
    revalidatePath("/");
    revalidatePath("/community");
    updateTag("guides");
  }

  // Removing a guide invalidates every surface that renders them.
  if (demotingGuide && previousUsername) {
    revalidatePath("/admin/guides");
    revalidatePath(`/${previousUsername}`);
    revalidatePath("/");
    revalidatePath("/community");
    updateTag("guides");
  }
}
