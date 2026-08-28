import { prisma } from "@/lib/prisma";
import { toSupportBookingListItem } from "@/lib/support";

/**
 * Shared data source for the support dashboard and the admin booking
 * management view. Both pages read from this single function so they always
 * show the same bookings in the same shape.
 */
export async function getSupportBookings() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, username: true } },
      trip: true,
      slot: { select: { date: true } },
      cancelledBy: { select: { name: true } },
    },
  });

  return bookings.map(toSupportBookingListItem);
}
