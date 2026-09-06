"use server";

import { revalidatePath, updateTag } from "next/cache";

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
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid booking details.",
    };
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
    select: { email: true, name: true },
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
      // Lock the matching slot and trip together. This replaces the earlier
      // read plus separate locks while retaining serialization with trip
      // deletion, checkout, and payment confirmation.
      const [lockedSlot] = await tx.$queryRaw<Array<{
        booked: number;
        reserved: number;
        capacity: number;
        priceInRupees: number;
        tripTitle: string;
        tripLocation: string;
        slotDate: Date;
        slotDeletedAt: Date | null;
        tripDeletedAt: Date | null;
      }>>`
        SELECT
          slots.booked,
          slots.reserved,
          slots.capacity,
          trips."priceInRupees",
          trips.title AS "tripTitle",
          trips.location AS "tripLocation",
          slots.date AS "slotDate",
          slots."deletedAt" AS "slotDeletedAt",
          trips."deletedAt" AS "tripDeletedAt"
        FROM slots
        INNER JOIN trips ON trips.id = slots."tripId"
        WHERE slots.id = ${slotId} AND slots."tripId" = ${tripId}
        FOR UPDATE OF slots, trips
      `;

      if (!lockedSlot || lockedSlot.slotDeletedAt || lockedSlot.tripDeletedAt) {
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
          totalPriceRupees: lockedSlot.priceInRupees * participantCount + insuranceRupees,
          status: "PENDING",
          paymentTransactionId: cleanTransactionId,
          specialRequests: cleanSpecialRequests,
        },
        select: {
          id: true,
          participantCount: true,
          totalPriceRupees: true,
          specialRequests: true,
        },
      });

      return {
        status: "created" as const,
        booking,
        tripTitle: lockedSlot.tripTitle,
        tripLocation: lockedSlot.tripLocation,
        slotDate: lockedSlot.slotDate,
      };
    });

    if (result.status === "unavailable") {
      return { success: false, error: "This slot is no longer available." };
    }

    if (result.status === "full") {
      return { success: false, error: "Not enough spots left in this slot." };
    }

    const activityLogs = [
      logActivity({
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
      }),
    ];

    if (cleanTransactionId) {
      activityLogs.push(
        logActivity({
          userId,
          action: "PAYMENT_REFERENCE_SUBMITTED",
          label: "Submitted a payment reference",
          metadata: { bookingId: result.booking.id, transactionId: cleanTransactionId },
        }),
      );

      await Promise.all(activityLogs);

      sendEmailAfter(
        paymentReferenceReceivedEmail({
          to: user.email,
          name: user.name,
          tripTitle: result.tripTitle,
          location: result.tripLocation,
          date: result.slotDate,
          participantCount: result.booking.participantCount,
          totalPriceRupees: result.booking.totalPriceRupees,
          transactionId: cleanTransactionId,
          specialRequests: result.booking.specialRequests,
        }),
      );
    } else {
      await Promise.all(activityLogs);
    }

    revalidatePath("/profile");
    revalidatePath("/admin/bookings");
    updateTag("trips");

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
