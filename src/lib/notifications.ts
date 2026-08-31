import { prisma } from "@/lib/prisma";
import { ROLE_PERMISSIONS, type Role } from "@/lib/authz";

export type NotificationInput = {
  type: string;
  title: string;
  body: string;
  href?: string | null;
};

/**
 * Roles that can read bookings. Notifications for a booking cancelled by a
 * guide go to every user in one of these roles.
 */
const BOOKING_ROLES = (Object.keys(ROLE_PERMISSIONS) as Role[]).filter(
  (role) => ROLE_PERMISSIONS[role].has("bookings.read"),
);

/**
 * Roles that can review guide applications. Notifications for a new guide
 * application go to every user in one of these roles.
 */
const GUIDE_APPLICATION_ROLES = (Object.keys(ROLE_PERMISSIONS) as Role[]).filter(
  (role) => ROLE_PERMISSIONS[role].has("guideApplications.manage"),
);

/** Maximum notifications kept per user; older ones are auto-cleared. */
const MAX_NOTIFICATIONS_PER_USER = 21;

/**
 * Delete every notification beyond the newest {@link MAX_NOTIFICATIONS_PER_USER}
 * for the given users.
 */
async function trimNotificationsToLimit(userIds: string[]) {
  await prisma.$transaction(async (tx) => {
    for (const userId of userIds) {
      const keep = await tx.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
        take: MAX_NOTIFICATIONS_PER_USER,
      });
      if (keep.length === 0) continue;

      await tx.notification.deleteMany({
        where: { userId, id: { notIn: keep.map((n) => n.id) } },
      });
    }
  });
}

/**
 * Create an in-app notification for every staff user who can read bookings.
 * Returns the notified users (so callers can also email them).
 */
export async function notifyBookingStaff(input: NotificationInput) {
  const users = await prisma.user.findMany({
    where: { role: { in: BOOKING_ROLES }, deletedAt: null },
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

  await trimNotificationsToLimit(users.map((user) => user.id));

  return users;
}

/**
 * Create an in-app notification for every staff user who can review guide
 * applications. Returns the notified users (so callers can also email them).
 */
export async function notifyGuideApplicationStaff(input: NotificationInput) {
  const users = await prisma.user.findMany({
    where: { role: { in: GUIDE_APPLICATION_ROLES }, deletedAt: null },
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

  await trimNotificationsToLimit(users.map((user) => user.id));

  return users;
}
