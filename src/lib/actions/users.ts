"use server";

import { revalidatePath, updateTag } from "next/cache";
import bcrypt from "bcryptjs";

import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { invalidateSessionVersion } from "@/lib/session-revocation";
import { sanitizeText } from "@/lib/sanitize";
import { deactivateGuide } from "@/lib/guide-teardown";
import { removeStoredMedia } from "@/lib/media";
import { passwordChangedEmail, sendEmailAfter } from "@/lib/email";
import { resolveGuideName } from "@/lib/guides";
import { revalidateGuidePages } from "@/lib/guide-revalidation";
import {
  adminChangeUserPasswordSchema,
  updateUserSchema,
} from "@/lib/validations/users";

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

/** Super-admin action: replace another active user's password. */
export async function changeUserPasswordAction(formData: FormData) {
  const session = await requirePermission(
    "users.password.manage",
    "/login?callbackUrl=/admin/users",
  );
  const parsed = adminChangeUserPasswordSchema.safeParse({
    userId: asString(formData.get("userId")),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid password.");
  }

  const { userId, newPassword } = parsed.data;
  if (session.user.id === userId) {
    throw new Error("Use your profile settings to change your own password.");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  if (!target) {
    throw new Error("User not found.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  invalidateSessionVersion(target.id);

  await logActivity({
    userId: target.id,
    action: "PASSWORD_RESET_BY_ADMIN",
    label: "Password reset by a super admin",
    metadata: { changedById: session.user.id },
  });
  await sendEmailAfter(passwordChangedEmail({ to: target.email, name: target.name }));

  revalidatePath(`/admin/users/${target.id}`);
}

/**
 * Admin action: update a user's profile details and role. Changes are
 * recorded in the target user's activity log so there is a full audit trail.
 */
export async function updateUserAction(formData: FormData) {
  const session = await requirePermission(
    "users.manage",
    "/login?callbackUrl=/admin/users",
  );

  const userId = asString(formData.get("userId"));
  const name = sanitizeText(asString(formData.get("name")), { maxLength: 100 });
  const email = asString(formData.get("email")).toLowerCase();
  const username = asString(formData.get("username"));
  const role = asString(formData.get("role"));

  const parsed = updateUserSchema.safeParse({
    userId,
    name,
    email,
    username,
    role,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user details.");
  }

  const data = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: data.userId },
    include: {
      guide: {
        select: { id: true, name: true, photos: true, videos: true, deletedAt: true },
      },
    },
  });
  if (!target || target.deletedAt) {
    throw new Error("User not found.");
  }

  const activeGuide =
    target.guide && !target.guide.deletedAt ? target.guide : null;

  // Never let an admin change their own role — that could lock them (and the
  // last admin) out of the admin board.
  if (session.user.id === data.userId && target.role !== data.role) {
    throw new Error("You cannot change your own role.");
  }

  // A user can only be a GUIDE when a guide profile is actually linked — the
  // guide's dashboard, trips, and public profile all depend on that row. Set
  // the role first via Admin → Guides instead of orphaning the account.
  if (data.role === "GUIDE" && !activeGuide) {
    throw new Error(
      "This account has no guide profile. Create one under Admin → Guides before assigning the GUIDE role.",
    );
  }

  // Moving a user away from the GUIDE role removes their guide profile too.
  // Leaving the Guide row behind would keep a "vetted guide" public page and
  // bookable trips alive that nobody can manage.
  const demotingGuide =
    target.role === "GUIDE" && data.role !== "GUIDE" && !!activeGuide;

  // Demoting a guide retires their active trips, so active bookings must be
  // cancelled or the trips reassigned before the role can change.
  if (demotingGuide && activeGuide) {
    const activeBookings = await prisma.booking.count({
      where: {
        trip: { guideId: activeGuide.id, deletedAt: null },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (activeBookings > 0) {
      throw new Error(
        "This guide's trips have active bookings. Cancel the bookings or reassign the trips before changing their role.",
      );
    }
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (emailTaken && emailTaken.id !== data.userId) {
    throw new Error("An account with this email already exists.");
  }

  if (data.username) {
    const usernameTaken = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (usernameTaken && usernameTaken.id !== data.userId) {
      throw new Error("This username is already taken.");
    }
  } else if (data.role === "GUIDE") {
    // A guide's username is its public URL — it can never be cleared.
    throw new Error(
      "A guide account must have a username. Enter one instead of clearing it.",
    );
  }

  const previousUsername = target.username;
  const usernameChanged = previousUsername !== data.username;

  try {
    await prisma.$transaction(async (tx) => {
      if (data.username) {
        // The handle is now live, so retire any alias that still points to it.
        await tx.usernameAlias.deleteMany({
          where: { username: data.username },
        });
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

      // `User.name` is the single source of truth for a guide's display name,
      // so mirror it onto the linked profile to keep Admin → Guides in sync.
      if (activeGuide) {
        await tx.guide.update({
          where: { id: activeGuide.id },
          data: { name: resolveGuideName(data) },
        });
      }

      // Demoting a guide tears down the guide linkage in the same transaction
      // so the role change can never leave an orphaned, unmanaged guide live.
      if (demotingGuide && activeGuide) {
        await deactivateGuide(tx, activeGuide.id);
      }

      // Keep the old handle resolving to this user's guide page — only when
      // they remain a guide (a demoted user has no guide page to resolve to).
      if (
        usernameChanged &&
        previousUsername &&
        activeGuide &&
        data.role === "GUIDE"
      ) {
        await tx.usernameAlias.create({
          data: { username: previousUsername, userId: data.userId },
        });
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      throw new Error("This email or username is already taken.");
    }
    throw error;
  }

  // The guide row is deactivated; reclaim its storage objects best-effort.
  if (demotingGuide && activeGuide) {
    await removeStoredMedia([
      ...(activeGuide.photos ?? []),
      ...(activeGuide.videos ?? []),
    ]);
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
    // The account's role changed mid-session — clear the cached session
    // lookup so the next request reflects it immediately.
    invalidateSessionVersion(data.userId);
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
      label:
        "Guide profile removed because the role was changed away from GUIDE",
      metadata: { guideId: activeGuide?.id },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${data.userId}`);

  // A username rename, a guide removal, or a display-name change all touch the
  // same guide-facing surfaces, so refresh them through one shared helper.
  const guideSurfacesDirty =
    !!activeGuide &&
    ((data.role === "GUIDE" && usernameChanged) ||
      demotingGuide ||
      activeGuide.name !== data.name);

  if (guideSurfacesDirty) {
    revalidateGuidePages(previousUsername, data.username);
  }

  // The header and profile shell read the account row directly, so a name or
  // handle change must expire their cached profile lookup.
  if (target.name !== data.name || previousUsername !== data.username) {
    updateTag("profiles");
  }
}

/**
 * Admin action: deactivate an account without deleting connected history.
 * Active bookings must be resolved first so support and finance records remain
 * actionable and capacity stays consistent.
 */
export async function deactivateUserAction(userId: string) {
  const session = await requirePermission(
    "users.manage",
    "/login?callbackUrl=/admin/users",
  );

  if (!userId) {
    throw new Error("Missing user id.");
  }
  if (session.user.id === userId) {
    throw new Error("You cannot deactivate your own account.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { guide: { select: { id: true, deletedAt: true } } },
  });
  if (!target || target.deletedAt) {
    throw new Error("User not found.");
  }

  const activeBookings = await prisma.booking.count({
    where: {
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        { userId },
        ...(target.guide && !target.guide.deletedAt
          ? [{ trip: { guideId: target.guide.id, deletedAt: null } }]
          : []),
      ],
    },
  });
  if (activeBookings > 0) {
    throw new Error(
      "Cancel or complete this account's active bookings before deactivating it.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    if (target.guide && !target.guide.deletedAt) {
      await deactivateGuide(tx, target.guide.id);
    }
  });

  // The account no longer matches the session-version lookup — clear the
  // cached row so their session is revoked immediately rather than on cache
  // expiry.
  invalidateSessionVersion(userId);

  await logActivity({
    userId,
    action: "USER_DEACTIVATED",
    label: "Account deactivated by an admin",
    metadata: { deactivatedById: session.user.id },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/");
  revalidatePath("/community");
  updateTag("guides");
}

/** Admin action: reactivate an account without restoring its retired guide profile. */
export async function restoreUserAction(userId: string) {
  const session = await requirePermission(
    "users.manage",
    "/login?callbackUrl=/admin/users",
  );

  if (!userId) {
    throw new Error("Missing user id.");
  }

  const restored = await prisma.user.updateMany({
    where: { id: userId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (restored.count !== 1) {
    throw new Error("Deactivated account not found.");
  }

  invalidateSessionVersion(userId);
  await logActivity({
    userId,
    action: "USER_RESTORED",
    label: "Account restored by an admin",
    metadata: { restoredById: session.user.id },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Super-admin action: permanently remove a deactivated account when no
 * operational or audit records still rely on it.
 */
export async function hardDeleteUserAction(userId: string) {
  await requirePermission(
    "users.delete",
    "/login?callbackUrl=/admin/users",
  );

  if (!userId) {
    throw new Error("Missing user id.");
  }

  const mediaUrls = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id: userId, deletedAt: { not: null } },
      select: {
        id: true,
        image: true,
        guideApplications: {
          select: { photo: true, photos: true, videos: true },
        },
      },
    });
    if (!target) {
      throw new Error("Only deactivated accounts can be permanently deleted.");
    }

    const [
      bookings,
      reviews,
      guide,
      supportChats,
      supportMessages,
      customTripMessages,
      referrals,
      reviewedApplications,
      tripChanges,
    ] = await Promise.all([
      tx.booking.count({ where: { OR: [{ userId }, { cancelledById: userId }, { deletedById: userId }] } }),
      tx.review.count({ where: { userId } }),
      tx.guide.count({ where: { userId } }),
      tx.supportChat.count({ where: { userId } }),
      tx.supportMessage.count({ where: { senderId: userId } }),
      tx.customTripMessage.count({ where: { senderId: userId } }),
      tx.referral.count({ where: { referrerId: userId } }),
      tx.guideApplication.count({ where: { reviewedById: userId } }),
      tx.tripChangeRequest.count({ where: { OR: [{ submittedById: userId }, { reviewedById: userId }] } }),
    ]);

    if (bookings + reviews + guide + supportChats + supportMessages + customTripMessages + referrals + reviewedApplications + tripChanges > 0) {
      throw new Error(
        "This account has booking, guide, support, referral, or audit history and cannot be permanently deleted.",
      );
    }

    await tx.user.delete({ where: { id: userId } });
    return [
      target.image,
      ...target.guideApplications.flatMap((application) => [
        application.photo,
        ...application.photos,
        ...application.videos,
      ]),
    ].filter((url): url is string => Boolean(url));
  });

  invalidateSessionVersion(userId);
  await removeStoredMedia(mediaUrls);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}
