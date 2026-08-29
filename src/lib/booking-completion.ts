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
  const candidates = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
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
