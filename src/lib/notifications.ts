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

  return users;
}
