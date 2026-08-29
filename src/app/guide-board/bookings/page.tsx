import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/guide-board";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatTripDateRange } from "@/lib/trip-dates";
import { formatMessageTime } from "@/lib/format";
import { formatCancelledBy } from "@/lib/support";
import { GuideBoardHeader } from "@/components/guides/guide-board-header";
import {
  GuideBookingsBoard,
  type GuideBookingItem,
} from "@/components/guides/guide-bookings-board";

export const dynamic = "force-dynamic";

export default async function GuideBoardBookingsPage() {
  const { guide } = await requireGuide();

  const guideBookings = await prisma.booking.findMany({
    where: { trip: { guideId: guide.id } },
    include: {
      trip: true,
      slot: true,
      user: { select: { id: true, name: true, username: true, email: true, image: true } },
      cancelledBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const items: GuideBookingItem[] = guideBookings.map((booking) => ({
    tripId: booking.trip.id,
    slug: booking.trip.slug,
    title: booking.trip.title,
    location: booking.trip.location,
    image: getTripCardImage(booking.trip),
    durationDays: booking.trip.durationDays,
    slotId: booking.slot.id,
    slotLabel: formatTripDateRange(booking.slot.date, booking.trip.durationDays),
    slotSort: new Date(booking.slot.date).getTime(),
    status: booking.status,
    customer: {
      name: booking.user.name,
      username: booking.user.username,
      email: booking.user.email,
      image: booking.user.image,
    },
    participantCount: booking.participantCount,
    bookedAt: formatMessageTime(booking.createdAt),
    cancellationReason: booking.cancellationReason,
    cancelledByText: booking.cancelledBy
      ? formatCancelledBy(booking.cancelledBy.name, booking.cancelledByRole)
      : null,
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <GuideBoardHeader
          title="My Bookings"
          description="Trips travellers have reserved with you as their guide."
          active="bookings"
          guideId={guide.id}
        />

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <GuideBookingsBoard items={items} />
        </section>
      </div>
    </div>
  );
}
