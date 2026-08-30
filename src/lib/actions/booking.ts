"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  createBookingSchema,
  SPECIAL_REQUESTS_MAX_LENGTH,
} from "@/lib/validations/booking";
import { ADVENTURE_INSURANCE_PER_PERSON_RUPEES } from "@/lib/booking-pricing";
import { sanitizeText } from "@/lib/sanitize";
import {
  paymentReferenceReceivedEmail,
  sendEmailAfter,
} from "@/lib/email";

export type CreateBookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: string };

/**
 * Creates a PENDING booking for the logged-in user against a specific trip +
 * slot. In checkout, this is called after the traveller submits their payment
 * reference so unpaid review screens do not appear as pending bookings.
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

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
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

  const { tripId, slotId, participantCount, adventureInsurance, transactionId } = parsed.data;
  const cleanTransactionId = transactionId
    ? sanitizeText(transactionId, { maxLength: 100 })
    : null;
  // Free text is stripped of control characters, whitespace-normalized
  // (newlines preserved), length-capped, and trimmed before persisting. React
  // escapes all rendered output, so this keeps storage and log surfaces clean.
  const cleanSpecialRequests = parsed.data.specialRequests
    ? sanitizeText(parsed.data.specialRequests, {
        maxLength: SPECIAL_REQUESTS_MAX_LENGTH,
        allowNewlines: true,
      })
    : null;

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

      if (!slot || slot.tripId !== tripId || slot.deletedAt || slot.trip.deletedAt) {
        return { status: "unavailable" as const };
      }

      // Lock the trip row too, so a concurrent trip deletion (which locks the
      // same row, then refuses to delete while bookings exist) serializes
      // against this checkout instead of deleting a booking created after its
      // guard passed.
      const [lockedTrip] = await tx.$queryRaw<Array<{ id: string; deletedAt: Date | null }>>`
        SELECT id, "deletedAt" FROM trips WHERE id = ${tripId} FOR UPDATE
      `;
      if (!lockedTrip || lockedTrip.deletedAt) {
        return { status: "unavailable" as const };
      }

      // Lock the slot row so concurrent checkouts serialize on the same row
      // (the payment confirmation path locks it too). This keeps the pending
      // count read below from racing a concurrent checkout and overselling a
      // slot before payment is captured.
      const [lockedSlot] = await tx.$queryRaw<Array<{ id: string; booked: number; reserved: number; capacity: number; deletedAt: Date | null }>>`
        SELECT id, booked, reserved, capacity, "deletedAt"
        FROM slots
        WHERE id = ${slotId}
        FOR UPDATE
      `;

      if (!lockedSlot || lockedSlot.deletedAt) {
        return { status: "unavailable" as const };
      }

      // `slot.booked` only counts CONFIRMED bookings (incremented when payment
      // is confirmed). Count PENDING bookings too so a burst of concurrent
      // checkouts cannot oversell a slot before payment is captured.
      const pendingCount = await tx.booking.count({
        where: { slotId, status: "PENDING", deletedAt: null },
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
          paymentTransactionId: cleanTransactionId,
          specialRequests: cleanSpecialRequests,
        },
        include: {
          user: { select: { email: true, name: true } },
          trip: { select: { title: true, location: true } },
          slot: { select: { date: true } },
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
        transactionId: cleanTransactionId,
      },
    });

    if (cleanTransactionId) {
      await logActivity({
        userId,
        action: "PAYMENT_REFERENCE_SUBMITTED",
        label: "Submitted a payment reference",
        metadata: { bookingId: result.booking.id, transactionId: cleanTransactionId },
      });

      sendEmailAfter(
        paymentReferenceReceivedEmail({
          to: result.booking.user.email,
          name: result.booking.user.name,
          tripTitle: result.booking.trip.title,
          location: result.booking.trip.location,
          date: result.booking.slot.date,
          participantCount: result.booking.participantCount,
          totalPriceRupees: result.booking.totalPriceRupees,
          transactionId: cleanTransactionId,
          specialRequests: result.booking.specialRequests,
        }),
      );
    }

    revalidatePath("/profile");
    revalidatePath("/admin/bookings");

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
