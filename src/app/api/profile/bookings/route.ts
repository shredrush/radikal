import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { bookingCardSelect, toBookingCardData } from "@/lib/booking-card";

export const dynamic = "force-dynamic";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;

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
  const cursor = searchParams.get("cursor") || undefined;
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const statusFilter: Record<
    "upcoming" | "completed" | "cancelled",
    NonNullable<Prisma.BookingWhereInput["status"]>
  > = {
    upcoming: { notIn: ["COMPLETED", "CANCELLED"] },
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };

  try {
    const bookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
          status: statusFilter[kind],
          deletedAt: null,
          trip: { deletedAt: null },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: bookingCardSelect,
      });
    const page = bookings.slice(0, limit);
    const reviews = kind === "completed" && page.length > 0
      ? await prisma.review.findMany({
          where: { userId: session.user.id, deletedAt: null, tripId: { in: page.map((booking) => booking.tripId) } },
          select: { id: true, tripId: true, rating: true, comment: true },
        })
      : [];

    const reviewsByTripId = new Map(
      reviews
        .filter((review): review is typeof review & { tripId: string } =>
          Boolean(review.tripId),
        )
        .map((review) => [review.tripId, review] as const),
    );

    const items = page.map((booking) =>
      toBookingCardData(booking, {
        showUserCancel: kind === "upcoming",
        showReview: kind === "completed",
        review:
          kind === "completed"
            ? (reviewsByTripId.get(booking.tripId) ?? null)
            : undefined,
      }),
    );
    return NextResponse.json({
      bookings: items,
      nextCursor: bookings.length > limit ? page.at(-1)?.id : null,
    });
  } catch (error) {
    console.error("[api/profile/bookings] failed to load bookings", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: getDatabaseErrorStatus(error) });
  }
}
