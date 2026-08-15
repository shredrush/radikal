"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { processPaymentSchema } from "@/lib/validations/booking";

export type ProcessPaymentResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Records the traveller's bank-transfer reference against their PENDING
 * booking. This does NOT confirm the booking — the booking stays PENDING
 * until an admin verifies the payment and confirms it (see
 * confirmBookingPayment below).
 */
export async function submitTransactionId(
  input: unknown
): Promise<ProcessPaymentResult> {
  const parsed = processPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid transaction ID." };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to pay." };
  }

  const { bookingId, transactionId } = parsed.data;

  // Defense in depth: strip control characters and collapse whitespace before
  // persisting, even though the schema already whitelists safe characters.
  const cleanTransactionId = sanitizeText(transactionId, { maxLength: 100 });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.userId !== userId) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.status !== "PENDING") {
      return { success: false, error: "This booking can no longer be paid for." };
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentTransactionId: cleanTransactionId },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return { success: false, error: message };
  }

  revalidatePath("/profile");
  revalidatePath("/admin/bookings");
  return { success: true };
}

/**
 * Admin-only action that verifies a PENDING booking's payment and marks it
 * CONFIRMED. It increments `Slot.booked` inside a transaction, re-checking
 * capacity so we never oversell a slot.
 */
export async function confirmBookingPayment(
  bookingId: string
): Promise<ProcessPaymentResult> {
  await requireAdmin("/login?callbackUrl=/admin/bookings");

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking) {
        throw new Error("Booking not found.");
      }

      if (booking.status === "CONFIRMED") {
        // Already confirmed (e.g. duplicate click) — nothing to do.
        return;
      }

      if (booking.status !== "PENDING") {
        throw new Error("Only pending bookings can be confirmed.");
      }

      if (booking.slot.booked + booking.participantCount > booking.slot.capacity) {
        throw new Error("This slot filled up before the payment could be confirmed.");
      }

      await tx.slot.update({
        where: { id: booking.slotId },
        data: { booked: { increment: booking.participantCount } },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm payment.";
    return { success: false, error: message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Admin-only action that cancels a booking. If the booking was CONFIRMED, the
 * reserved spots are released back to the slot so the capacity stays accurate.
 */
export async function cancelBooking(
  bookingId: string
): Promise<ProcessPaymentResult> {
  await requireAdmin("/login?callbackUrl=/admin/bookings");

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking) {
        throw new Error("Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        // Already cancelled (e.g. duplicate click) — nothing to do.
        return;
      }

      // Release the reserved spots if the booking had been confirmed.
      if (booking.status === "CONFIRMED") {
        await tx.slot.update({
          where: { id: booking.slotId },
          data: {
            booked: { decrement: Math.min(booking.participantCount, booking.slot.booked) },
          },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking.";
    return { success: false, error: message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/profile");
  return { success: true };
}
