import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { bookingCardSelect, toBookingCardData } from "@/lib/booking-card";
import { completePastBookings } from "@/lib/booking-completion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedKind = searchParams.get("kind");
  const kind = ["completed", "cancelled"].includes(requestedKind ?? "")
    ? (requestedKind as "completed" | "cancelled")
    : "upcoming";

  const statusFilter: Record<
    "upcoming" | "completed" | "cancelled",
    NonNullable<Prisma.BookingWhereInput["status"]>
  > = {
    upcoming: { notIn: ["COMPLETED", "CANCELLED"] },
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };

  try {
    const now = new Date();
    // Scoped to this user only — a staff member expanding their sections never
    // scans every CONFIRMED booking in the app (the daily cron handles that).
    await completePastBookings(now, session.user.id);
    const [bookings, reviews] = await Promise.all([
      prisma.booking.findMany({
        where: {
          userId: session.user.id,
          status: statusFilter[kind],
          deletedAt: null,
          trip: { deletedAt: null },
        },
        orderBy: { createdAt: "desc" },
        select: bookingCardSelect,
      }),
      kind === "completed"
        ? prisma.review.findMany({
            where: { userId: session.user.id, deletedAt: null, trip: { deletedAt: null } },
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

    const items = bookings.map((booking) =>
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
