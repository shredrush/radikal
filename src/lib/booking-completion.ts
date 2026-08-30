import { prisma } from "@/lib/prisma";
import { isTripCompleted } from "@/lib/trip-dates";

/**
 * Persists the derived "completed" state to the database.
 *
 * A booking's `status` never flips to COMPLETED during the lifecycle; it becomes
 * complete once its final trip day has passed. A daily cron
 * (/api/cron/complete-bookings) sweeps the whole table, and per-user read paths
 * call this scoped to the current user so a single profile view never scans
 * every CONFIRMED booking in the app. Idempotent — returns the number of
 * bookings transitioned.
 */
export async function completePastBookings(
  now = new Date(),
  userId?: string,
): Promise<number> {
  if (!userId) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE bookings b
      SET status = 'COMPLETED'
      FROM slots s, trips t
      WHERE b."slotId" = s.id
        AND b."tripId" = t.id
        AND b.status = 'CONFIRMED'
        AND b."deletedAt" IS NULL
        AND s."deletedAt" IS NULL
        AND t."deletedAt" IS NULL
        AND (s.date + ((GREATEST(t."durationDays", 1) - 1) * INTERVAL '1 day')) < ${now}
      RETURNING b.id
    `;
    return rows.length;
  }

  const candidates = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      deletedAt: null,
      trip: { deletedAt: null },
      slot: { deletedAt: null },
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
      slot: { select: { date: true } },
      trip: { select: { durationDays: true } },
    },
  });

  const completedIds = candidates
    .filter((booking) =>
      isTripCompleted(booking.slot.date, booking.trip.durationDays, now),
    )
    .map((booking) => booking.id);

  if (completedIds.length === 0) {
    return 0;
  }

  const { count } = await prisma.booking.updateMany({
    where: { id: { in: completedIds }, status: "CONFIRMED" },
    data: { status: "COMPLETED" },
  });

  return count;
}
