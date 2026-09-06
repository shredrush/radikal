import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateProfileSummaries } from "@/lib/profile-summary";
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

/** Create notifications and retain only the newest rows for each recipient. */
async function createNotifications(userIds: string[], input: NotificationInput) {
  const recipientIds = [...new Set(userIds)];
  if (recipientIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
      })),
    });

    // Rank every affected recipient in one query, then remove only rows beyond
    // the retention cap. This avoids a read/delete pair for every recipient.
    await tx.$executeRaw`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY "userId"
          ORDER BY "createdAt" DESC, id DESC
        ) AS position
        FROM notifications
        WHERE "userId" IN (${Prisma.join(recipientIds)})
      )
      DELETE FROM notifications AS notification
      USING ranked
      WHERE notification.id = ranked.id
        AND ranked.position > ${MAX_NOTIFICATIONS_PER_USER}
    `;
  });

  invalidateProfileSummaries(recipientIds);
}

/** Create one notification and refresh its recipient's profile summary. */
export async function notifyUser(userId: string, input: NotificationInput) {
  await createNotifications([userId], input);
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

  await createNotifications(users.map((user) => user.id), input);

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

  await createNotifications(users.map((user) => user.id), input);

  return users;
}
