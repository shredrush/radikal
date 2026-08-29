import { prisma } from "@/lib/prisma";
import { isTripCompleted } from "@/lib/trip-dates";

/**
 * Persists the derived "completed" state to the database.
 *
 * A booking's `status` never flips to COMPLETED during the lifecycle; it becomes
 * complete once its final trip day has passed. There is no background scheduler
 * in this app, so this function is called lazily from booking read paths: it
 * transitions any CONFIRMED booking whose trip dates have fully passed to
 * COMPLETED before the caller reads the list. Idempotent — returns the number
 * of bookings transitioned.
 */
export async function completePastBookings(now = new Date()): Promise<number> {
  const candidates = await prisma.booking.findMany({
    where: { status: "CONFIRMED" },
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
