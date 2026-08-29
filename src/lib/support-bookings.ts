import { prisma } from "@/lib/prisma";
import { toSupportBookingListItem } from "@/lib/support";
import { completePastBookings } from "@/lib/booking-completion";

/**
 * Shared data source for the support dashboard and the admin booking
 * management view. Both pages read from this single function so they always
 * show the same bookings in the same shape.
 */
export async function getSupportBookings() {
  // Persist past CONFIRMED bookings as COMPLETED before reading, so the status
  // filters and counts reflect the true state.
  await completePastBookings();

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, username: true } },
      // Only the trip fields the booking list renders; `trip: true` pulled
      // every scalar column (including large description/images arrays).
      trip: {
        select: {
          slug: true,
          title: true,
          location: true,
          durationDays: true,
          description: true,
          categories: true,
          images: true,
          type: true,
        },
      },
      slot: { select: { date: true } },
      cancelledBy: { select: { name: true } },
    },
  });

  return bookings.map(toSupportBookingListItem);
}
