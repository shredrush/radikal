"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requireAdmin, requireSupport } from "@/lib/authz";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  paymentReferenceReceivedEmail,
  sendEmailAfter,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { processPaymentSchema } from "@/lib/validations/booking";

type CancellationEmail = {
  to: string;
  name: string;
  tripTitle: string;
  date: Date;
  cancelledByUser: boolean;
};

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
      include: {
        user: { select: { email: true, name: true } },
        activity: { select: { title: true, location: true } },
        slot: { select: { date: true } },
      },
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

    sendEmailAfter(
      paymentReferenceReceivedEmail({
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        location: booking.activity.location,
        date: booking.slot.date,
        participantCount: booking.participantCount,
        totalPriceRupees: booking.totalPriceRupees,
        transactionId: cleanTransactionId,
      }),
    );
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

  let confirmationEmail:
    | {
        to: string;
        name: string;
        tripTitle: string;
        location: string;
        date: Date;
        participantCount: number;
        totalPriceRupees: number;
      }
    | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          activity: { select: { title: true, location: true } },
        },
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

      confirmationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        location: booking.activity.location,
        date: booking.slot.date,
        participantCount: booking.participantCount,
        totalPriceRupees: booking.totalPriceRupees,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm payment.";
    return { success: false, error: message };
  }

  if (confirmationEmail) {
    sendEmailAfter(bookingConfirmedEmail(confirmationEmail));
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
  const session = await requireAdmin("/login?callbackUrl=/admin/bookings");

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  let cancellationEmail: CancellationEmail | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          activity: { select: { title: true } },
        },
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
        data: {
          status: "CANCELLED",
          cancelledById: session.user.id,
          cancelledByRole: session.user.role,
        },
      });

      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        date: booking.slot.date,
        cancelledByUser: false,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking.";
    return { success: false, error: message };
  }

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/support");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Guide-only action that cancels a booking on one of the trips they guide.
 * If the booking was CONFIRMED, the reserved spots are released back to the
 * slot so the capacity stays accurate.
 */
export async function cancelBookingAsGuide(
  bookingId: string
): Promise<ProcessPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || session.user.role !== "GUIDE") {
    return { success: false, error: "Not authorized." };
  }

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  let cancellationEmail: CancellationEmail | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          activity: { include: { guide: true } },
        },
      });

      if (!booking || booking.activity.guide?.userId !== userId) {
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
        data: {
          status: "CANCELLED",
          cancelledById: userId,
          cancelledByRole: session.user.role,
        },
      });

      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        date: booking.slot.date,
        cancelledByUser: false,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel trip.";
    return { success: false, error: message };
  }

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/profile");
  revalidatePath("/support");
  return { success: true };
}

/**
 * Traveller action that cancels one of their own bookings. If the booking was
 * CONFIRMED, the reserved spots are released back to the slot.
 */
export async function cancelBookingAsUser(
  bookingId: string
): Promise<ProcessPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to cancel." };
  }

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  let cancellationEmail: CancellationEmail | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          activity: { select: { title: true } },
        },
      });

      if (!booking || booking.userId !== userId) {
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
        data: {
          status: "CANCELLED",
          cancelledById: userId,
          cancelledByRole: session.user.role,
        },
      });

      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        date: booking.slot.date,
        cancelledByUser: true,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking.";
    return { success: false, error: message };
  }

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/profile");
  revalidatePath("/support");
  return { success: true };
}

/**
 * Support-desk action that lets a support agent (SUPPORT or ADMIN) cancel any
 * booking — including already CONFIRMED ones — from the support dashboard.
 * The reserved spots are released back to the slot when relevant.
 */
export async function cancelBookingAsSupport(
  bookingId: string
): Promise<ProcessPaymentResult> {
  const session = await requireSupport("/login?callbackUrl=/support");

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  let cancellationEmail: CancellationEmail | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          activity: { select: { title: true } },
        },
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
        data: {
          status: "CANCELLED",
          cancelledById: session.user.id,
          cancelledByRole: session.user.role,
        },
      });

      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.activity.title,
        date: booking.slot.date,
        cancelledByUser: false,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking.";
    return { success: false, error: message };
  }

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/support");
  revalidatePath("/admin/bookings");
  revalidatePath("/profile");
  return { success: true };
}
