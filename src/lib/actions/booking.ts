"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const { activityId, slotId, participantCount } = parsed.data;

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { activity: true },
  });

  if (!slot || slot.activityId !== activityId) {
    return { success: false, error: "This slot is no longer available." };
  }

  if (slot.booked + participantCount > slot.capacity) {
    return { success: false, error: "Not enough spots left in this slot." };
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      activityId,
      slotId,
      participantCount,
      totalPriceRupees: slot.activity.priceInRupees * participantCount,
      status: "PENDING",
    },
  });

  return { success: true, bookingId: booking.id };
}
