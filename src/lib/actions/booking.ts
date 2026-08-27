"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { createBookingSchema } from "@/lib/validations/booking";

export type CreateBookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string };

/**
 * Creates a PENDING booking for the logged-in user against a specific
 * activity + slot. The booking only becomes CONFIRMED once payment succeeds
 * (see lib/actions/payment.ts) — never on the client alone.
 */
export async function createBooking(
  input: unknown
): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid booking details." };
  }

  const session = await auth();
  // Never trust a userId passed from the client — always derive it from the
  // server-side session.
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to book." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return {
      success: false,
      error: "Your session is no longer valid. Please sign out and sign in again.",
    };
  }

  const bookingLimit = rateLimit(`booking-create:user:${userId}`, 10, 15 * 60_000);
  if (!bookingLimit.success) {
    return { success: false, error: rateLimitError(bookingLimit) };
  }

  const { activityId, slotId, participantCount } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { activity: true },
      });

      if (!slot || slot.activityId !== activityId) {
        return { status: "unavailable" as const };
      }

      // `slot.booked` only counts CONFIRMED bookings (incremented when payment
      // is confirmed). Count PENDING bookings too so a burst of concurrent
      // checkouts cannot oversell a slot before payment is captured.
      const pendingCount = await tx.booking.count({
        where: { slotId, status: "PENDING" },
      });

      if (slot.booked + slot.reserved + pendingCount + participantCount > slot.capacity) {
        return { status: "full" as const };
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          activityId,
          slotId,
          participantCount,
          totalPriceRupees: slot.activity.priceInRupees * participantCount,
          status: "PENDING",
        },
      });

      return { status: "created" as const, booking };
    });

    if (result.status === "unavailable") {
      return { success: false, error: "This slot is no longer available." };
    }

    if (result.status === "full") {
      return { success: false, error: "Not enough spots left in this slot." };
    }

    await logActivity({
      userId,
      action: "BOOKING_CREATED",
      label: "Created a booking",
      metadata: {
        bookingId: result.booking.id,
        activityId,
        slotId,
        participantCount,
      },
    });

    return { success: true, bookingId: result.booking.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        error: "Your session is no longer valid. Please sign out and sign in again.",
      };
    }
    throw error;
  }
}
