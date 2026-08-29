import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toBookingCardData } from "@/lib/booking-card";
import { completePastBookings } from "@/lib/booking-completion";

export const dynamic = "force-dynamic";

const tripSelect = {
  slug: true,
  title: true,
  location: true,
  description: true,
  categories: true,
  images: true,
  type: true,
  durationDays: true,
} as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") === "completed" ? "completed" : "upcoming";

  try {
    const now = new Date();
    await completePastBookings(now);
    const [bookings, reviews] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          tripId: true,
          participantCount: true,
          totalPriceRupees: true,
          paymentTransactionId: true,
          cancellationReason: true,
          createdAt: true,
          trip: { select: tripSelect },
          slot: { select: { date: true } },
        },
      }),
      kind === "completed"
        ? prisma.review.findMany({
            where: { userId: session.user.id },
            select: { id: true, tripId: true, rating: true, comment: true },
          })
        : Promise.resolve([]),
    ]);

    const reviewsByTripId = new Map(
      reviews
        .filter((review): review is typeof review & { tripId: string } =>
          Boolean(review.tripId),
        )
        .map((review) => [review.tripId, review] as const),
    );

    const items = bookings
      .filter((booking) => {
        const completed = booking.status === "COMPLETED";
        return kind === "completed" ? completed : !completed;
      })
      .map((booking) =>
        toBookingCardData(booking, {
          showUserCancel: kind === "upcoming",
          showReview: kind === "completed",
          review:
            kind === "completed"
              ? (reviewsByTripId.get(booking.tripId) ?? null)
              : undefined,
        }),
      );

    return NextResponse.json({ bookings: items });
  } catch (error) {
    console.error("[api/profile/bookings] failed to load bookings", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}
