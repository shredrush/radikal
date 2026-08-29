"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { createBookingSchema } from "@/lib/validations/booking";
import { ADVENTURE_INSURANCE_PER_PERSON_RUPEES } from "@/lib/booking-pricing";

export type CreateBookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string };

/**
 * Creates a PENDING booking for the logged-in user against a specific
 * trip + slot. The booking only becomes CONFIRMED once payment succeeds
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

  const { tripId, slotId, participantCount, adventureInsurance } = parsed.data;

  // The insurance amount is derived from a server-side constant (never a
  // client-supplied price), so opting in only adds a fixed per-person charge.
  const insuranceRupees = adventureInsurance
    ? ADVENTURE_INSURANCE_PER_PERSON_RUPEES * participantCount
    : 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { trip: true },
      });

      if (!slot || slot.tripId !== tripId) {
        return { status: "unavailable" as const };
      }

      // Lock the trip row too, so a concurrent trip deletion (which locks the
      // same row, then refuses to delete while bookings exist) serializes
      // against this checkout instead of deleting a booking created after its
      // guard passed.
      const [lockedTrip] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM trips WHERE id = ${tripId} FOR UPDATE
      `;
      if (!lockedTrip) {
        return { status: "unavailable" as const };
      }

      // Lock the slot row so concurrent checkouts serialize on the same row
      // (the payment confirmation path locks it too). This keeps the pending
      // count read below from racing a concurrent checkout and overselling a
      // slot before payment is captured.
      const [lockedSlot] = await tx.$queryRaw<Array<{ id: string; booked: number; reserved: number; capacity: number }>>`
        SELECT id, booked, reserved, capacity
        FROM slots
        WHERE id = ${slotId}
        FOR UPDATE
      `;

      if (!lockedSlot) {
        return { status: "unavailable" as const };
      }

      // `slot.booked` only counts CONFIRMED bookings (incremented when payment
      // is confirmed). Count PENDING bookings too so a burst of concurrent
      // checkouts cannot oversell a slot before payment is captured.
      const pendingCount = await tx.booking.count({
        where: { slotId, status: "PENDING" },
      });

      if (lockedSlot.booked + lockedSlot.reserved + pendingCount + participantCount > lockedSlot.capacity) {
        return { status: "full" as const };
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          tripId,
          slotId,
          participantCount,
          totalPriceRupees: slot.trip.priceInRupees * participantCount + insuranceRupees,
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
        tripId,
        slotId,
        participantCount,
        adventureInsurance,
        insuranceRupees,
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
