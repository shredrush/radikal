import { prisma } from "@/lib/prisma";
import { bookingDetailInclude } from "@/lib/bookings";
import { toSupportBookingListItem } from "@/lib/support";
import { completePastBookings } from "@/lib/booking-completion";

/**
 * Shared data source for the support board and the admin booking
 * management view. Both pages read from this single function so they always
 * show the same bookings in the same shape.
 */
export async function getSupportBookings() {
  // Persist past CONFIRMED bookings as COMPLETED before reading, so the status
  // filters and counts reflect the true state.
  await completePastBookings();

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: bookingDetailInclude,
  });

  return bookings.map(toSupportBookingListItem);
}
