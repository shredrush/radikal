"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processPaymentSchema } from "@/lib/validations/booking";

export type ProcessPaymentResult =
  | { success: true }
  | { success: false; error: string };

/**
 * DUMMY payment action for the MVP — there is no real payment gateway call
 * here. It simulates network/processing latency and then confirms the
 * booking directly.
 *
 * This stands in for what, in production, only a verified Razorpay webhook
 * should do (see copilot-instructions.md): confirm the booking and
 * increment `Slot.booked` inside a transaction, re-checking capacity so we
 * never oversell a slot.
 */
export async function processDummyPayment(
  input: unknown
): Promise<ProcessPaymentResult> {
  const parsed = processPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid payment request." };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to pay." };
  }

  const { bookingId } = parsed.data;

  // Simulate a payment gateway round-trip.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
      });

      if (!booking || booking.userId !== userId) {
        throw new Error("Booking not found.");
      }

      if (booking.status === "CONFIRMED") {
        // Already confirmed (e.g. duplicate click) — nothing to do.
        return;
      }

      if (booking.status !== "PENDING") {
        throw new Error("This booking can no longer be paid for.");
      }

      if (booking.slot.booked + booking.participantCount > booking.slot.capacity) {
        throw new Error("This slot filled up before payment completed.");
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
      error instanceof Error ? error.message : "Payment failed. Please try again.";
    return { success: false, error: message };
  }

  return { success: true };
}
