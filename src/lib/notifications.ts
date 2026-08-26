import { prisma } from "@/lib/prisma";
import { ROLE_PERMISSIONS, type Role } from "@/lib/authz";

/**
 * Roles that are allowed to review guide trip changes. Notifications for a new
 * pending change go to every user in one of these roles.
 */
const TRIP_REVIEW_ROLES = (Object.keys(ROLE_PERMISSIONS) as Role[]).filter(
  (role) => ROLE_PERMISSIONS[role].has("trips.manage"),
);

export type NotificationInput = {
  type: string;
  title: string;
  body: string;
  href?: string | null;
};

/**
 * Create an in-app notification for every staff user who can review trips.
 * Returns the notified users (so callers can also email them).
 */
export async function notifyTripReviewStaff(input: NotificationInput) {
  const users = await prisma.user.findMany({
    where: { role: { in: TRIP_REVIEW_ROLES } },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return users;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })),
  });

  return users;
}

/** Create a single in-app notification for a specific user. */
export async function notifyUser(userId: string, input: NotificationInput) {
  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}
