"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  guideCancelledBookingAdminEmail,
  paymentReferenceReceivedEmail,
  sendEmailAfter,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";
import { notifyBookingStaff } from "@/lib/notifications";
import { processPaymentSchema } from "@/lib/validations/booking";
import type { BookingStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { startOfTodayIST } from "@/lib/dates";

export type CancellationEmail = {
  to: string;
  name: string;
  tripTitle: string;
  date: Date;
  cancelledByUser: boolean;
};

/** Columns read back from the `slots` table when taking a row lock. */
type SlotRow = {
  id: string;
  booked: number;
  reserved: number;
  capacity: number;
};

/**
 * Require a signed-in guide whose role is read from the database (not the
 * possibly-stale JWT), so a demotion takes effect immediately. Returns the
 * session's user id and the current role, or null when not authorized.
 */
async function requireGuideSession() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, guide: { select: { deletedAt: true } } },
  });
  if (!user || user.role !== "GUIDE" || user.guide?.deletedAt) return null;
  return { userId, role: user.role };
}

function safePaymentError(
  error: unknown,
  fallback: string,
  expectedMessages: readonly string[],
): string {
  if (error instanceof Error && expectedMessages.includes(error.message)) {
    return error.message;
  }

  console.error(`[payment] ${fallback}`, error);
  return fallback;
}

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
        trip: { select: { title: true, location: true } },
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

    await logActivity({
      userId,
      action: "PAYMENT_REFERENCE_SUBMITTED",
      label: "Submitted a payment reference",
      metadata: { bookingId: booking.id, transactionId: cleanTransactionId },
    });

    sendEmailAfter(
      paymentReferenceReceivedEmail({
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.trip.title,
        location: booking.trip.location,
        date: booking.slot.date,
        participantCount: booking.participantCount,
        totalPriceRupees: booking.totalPriceRupees,
        transactionId: cleanTransactionId,
        specialRequests: booking.specialRequests,
      }),
    );
  } catch (error) {
    const message = safePaymentError(error, "Something went wrong. Please try again.", []);
    return { success: false, error: message };
  }

  revalidatePath("/profile");
  revalidatePath("/admin/bookings");
  return { success: true };
}

/**
 * Staff action (FINANCE, SUPPORT or ADMIN) that verifies a PENDING booking's payment
 * and marks it CONFIRMED. It increments `Slot.booked` inside a transaction,
 * re-checking capacity so we never oversell a slot.
 */
export async function confirmBookingPayment(
  bookingId: string
): Promise<ProcessPaymentResult> {
  await requirePermission("bookings.confirm", "/login?callbackUrl=/admin/bookings");

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
  let confirmationUserId = "";

  try {
    await prisma.$transaction(async (tx) => {
      // Serialize cancellation attempts for one booking. The fresh read below
      // observes a preceding cancellation after waiting for this row lock.
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { email: true, name: true } },
          trip: { select: { title: true, location: true } },
          slot: { select: { date: true } },
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

      // Lock the slot row for the duration of the transaction so concurrent
      // confirmations serialize on the same row: the capacity check below and
      // the increment can't interleave and oversell the slot.
      const [lockedSlot] = await tx.$queryRaw<SlotRow[]>`
        SELECT id, booked, reserved, capacity
        FROM slots
        WHERE id = ${booking.slotId}
        FOR UPDATE
      `;

      if (!lockedSlot) {
        throw new Error("Booking not found.");
      }

      // A concurrent confirmation may have committed between our initial read
      // and acquiring the lock — re-check the status against fresh data.
      const current = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      });
      if (!current) {
        throw new Error("Booking not found.");
      }
      if (current.status === "CONFIRMED") {
        return;
      }
      if (current.status !== "PENDING") {
        throw new Error("Only pending bookings can be confirmed.");
      }

      if (lockedSlot.booked + lockedSlot.reserved + booking.participantCount > lockedSlot.capacity) {
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

      confirmationUserId = booking.userId;
      confirmationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.trip.title,
        location: booking.trip.location,
        date: booking.slot.date,
        participantCount: booking.participantCount,
        totalPriceRupees: booking.totalPriceRupees,
      };
    });
  } catch (error) {
    const message = safePaymentError(error, "Failed to confirm payment.", [
      "Booking not found.",
      "Only pending bookings can be confirmed.",
      "This slot filled up before the payment could be confirmed.",
    ]);
    return { success: false, error: message };
  }

  await logActivity({
    userId: confirmationUserId,
    action: "BOOKING_CONFIRMED",
    label: "Booking confirmed (payment verified)",
    metadata: { bookingId },
  });

  if (confirmationEmail) {
    sendEmailAfter(bookingConfirmedEmail(confirmationEmail));
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/support");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Staff action (SUPPORT or ADMIN) that cancels a booking. If the booking was
 * CONFIRMED, the reserved spots are released back to the slot so the capacity
 * stays accurate.
 */
export async function cancelBooking(
  bookingId: string,
  reason: string
): Promise<ProcessPaymentResult> {
  const session = await requirePermission("bookings.cancel", "/login?callbackUrl=/admin/bookings");

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  const cleanReason = sanitizeText(reason, { maxLength: 500 });
  if (!cleanReason) {
    return { success: false, error: "Please provide a reason for cancellation." };
  }

  let cancellationEmail: CancellationEmail | null = null;
  let cancellationUserId = "";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          trip: { select: { title: true } },
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
          cancellationReason: cleanReason,
        },
      });

      cancellationUserId = booking.userId;
      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.trip.title,
        date: booking.slot.date,
        cancelledByUser: false,
      };
    });
  } catch (error) {
    const message = safePaymentError(error, "Failed to cancel booking.", [
      "Booking not found.",
    ]);
    return { success: false, error: message };
  }

  await logActivity({
    userId: cancellationUserId,
    action: "BOOKING_CANCELLED",
    label: "Booking cancelled",
    metadata: { bookingId, reason: cleanReason },
  });

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
  bookingId: string,
  reason: string
): Promise<ProcessPaymentResult> {
  const actor = await requireGuideSession();
  if (!actor) {
    return { success: false, error: "Not authorized." };
  }
  const { userId, role } = actor;

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  const cleanReason = sanitizeText(reason, { maxLength: 500 });
  if (!cleanReason) {
    return { success: false, error: "Please provide a reason for cancellation." };
  }

  let cancellationEmail: CancellationEmail | null = null;
  let cancellationUserId = "";

  try {
    await prisma.$transaction(async (tx) => {
      // The lock makes both the booking cancellation and its capacity release
      // idempotent when a customer double-submits the request.
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          trip: { include: { guide: true } },
        },
      });

      if (!booking || booking.trip.guide?.userId !== userId) {
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
          cancelledByRole: role,
          cancellationReason: cleanReason,
        },
      });

      cancellationUserId = booking.userId;
      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.trip.title,
        date: booking.slot.date,
        cancelledByUser: false,
      };
    });
  } catch (error) {
    const message = safePaymentError(error, "Failed to cancel trip.", [
      "Booking not found.",
    ]);
    return { success: false, error: message };
  }

  await logActivity({
    userId: cancellationUserId,
    action: "BOOKING_CANCELLED",
    label: "Booking cancelled by guide",
    metadata: { bookingId, reason: cleanReason },
  });

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/profile");
  revalidatePath("/support");
  return { success: true };
}

/**
 * Cancel every active (PENDING or CONFIRMED) booking on a slot inside the
 * caller's transaction: confirmed spots are released back to the slot and every
 * affected booking is marked CANCELLED with the actor and reason recorded.
 * Returns the cancellation emails for the affected travellers.
 */
export async function cancelActiveBookingsForSlot(
  tx: Prisma.TransactionClient,
  slot: {
    id: string;
    date: Date;
    booked: number;
    trip: { title: string; guide?: { name: string } | null };
    bookings: Array<{
      id: string;
      participantCount: number;
      status: BookingStatus;
      user: { email: string; name: string | null };
    }>;
  },
  actor: { id: string; role: UserRole },
  reason: string,
): Promise<CancellationEmail[]> {
  const active = slot.bookings.filter(
    (booking) => booking.status === "PENDING" || booking.status === "CONFIRMED",
  );
  if (active.length === 0) return [];

  // Release the reserved spots for any confirmed bookings.
  const confirmedCount = active
    .filter((booking) => booking.status === "CONFIRMED")
    .reduce((sum, booking) => sum + booking.participantCount, 0);
  if (confirmedCount > 0) {
    await tx.slot.update({
      where: { id: slot.id },
      data: {
        booked: { decrement: Math.min(confirmedCount, slot.booked) },
      },
    });
  }

  await tx.booking.updateMany({
    where: { id: { in: active.map((booking) => booking.id) } },
    data: {
      status: "CANCELLED",
      cancelledById: actor.id,
      cancelledByRole: actor.role,
      cancellationReason: reason,
    },
  });

  return active.map((booking) => ({
    to: booking.user.email,
    name: booking.user.name ?? "",
    tripTitle: slot.trip.title,
    date: slot.date,
    cancelledByUser: false,
  }));
}

/**
 * Guide-only action that cancels every active booking (PENDING or CONFIRMED)
 * on a trip slot they guide, in one go. Confirmed spots are released back to
 * the slot so the capacity stays accurate. Staff are notified in-app and by
 * email so the cancellation can be reviewed.
 */
export async function cancelSlotBookingsAsGuide(
  slotId: string,
  reason: string
): Promise<ProcessPaymentResult> {
  const actor = await requireGuideSession();
  if (!actor) {
    return { success: false, error: "Not authorized." };
  }
  const { userId, role } = actor;

  if (!slotId) {
    return { success: false, error: "Missing slot id." };
  }

  const cleanReason = sanitizeText(reason, { maxLength: 500 });
  if (!cleanReason) {
    return { success: false, error: "Please provide a reason for cancellation." };
  }

  let emails: CancellationEmail[] = [];
  let cancelled = false;
  let guideName = "";
  let tripTitle = "";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM slots WHERE id = ${slotId} FOR UPDATE`;
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: {
          trip: { include: { guide: true } },
          bookings: {
            where: { status: { in: ["PENDING", "CONFIRMED"] } },
            include: {
              user: { select: { email: true, name: true } },
            },
          },
        },
      });

      if (!slot || slot.trip.guide?.userId !== userId) {
        throw new Error("Booking not found.");
      }
      if (slot.deletedAt) {
        throw new Error("This date has already been cancelled.");
      }
      if (slot.date < startOfTodayIST()) {
        throw new Error("Only today or future dates can be cancelled.");
      }

      emails = await cancelActiveBookingsForSlot(
        tx,
        slot,
        { id: userId, role },
        cleanReason,
      );
      cancelled = emails.length > 0;
      guideName = slot.trip.guide?.name ?? "The guide";
      tripTitle = slot.trip.title;
    });
  } catch (error) {
    const message = safePaymentError(error, "Failed to cancel trip.", [
      "Booking not found.",
      "Only today or future dates can be cancelled.",
      "This date has already been cancelled.",
    ]);
    return { success: false, error: message };
  }

  revalidatePath("/guide-board/bookings");
  revalidatePath("/admin/bookings");
  revalidatePath("/support");
  revalidatePath("/profile");

  if (!cancelled) {
    return { success: true };
  }

  for (const email of emails) {
    sendEmailAfter(bookingCancelledEmail(email));
  }

  // Notify staff (in-app + email) so the cancellation gets reviewed.
  try {
    const staff = await notifyBookingStaff({
      type: "BOOKING_CANCELLED_BY_GUIDE",
      title: "Booking cancelled by guide",
      body: `${guideName} cancelled ${emails.length} ${emails.length === 1 ? "booking" : "bookings"} for “${tripTitle}”.`,
      href: "/admin/bookings",
    });

    for (const user of staff) {
      sendEmailAfter(
        guideCancelledBookingAdminEmail({
          to: user.email,
          name: user.name ?? "",
          guideName,
          tripTitle,
          participantCount: emails.length,
        }),
      );
    }
  } catch (error) {
    // Notifications must never break the cancellation.
    console.error("[payment] failed to notify staff of guide cancellation", error);
  }

  await logActivity({
    userId,
    action: "BOOKING_CANCELLED",
    label: "Cancelled trip bookings as guide",
    metadata: { slotId, bookingCount: emails.length, reason: cleanReason },
  });

  return { success: true };
}

/**
 * Traveller action that cancels one of their own bookings. If the booking was
 * CONFIRMED, the reserved spots are released back to the slot.
 */
export async function cancelBookingAsUser(
  bookingId: string,
  reason: string
): Promise<ProcessPaymentResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to cancel." };
  }

  if (!bookingId) {
    return { success: false, error: "Missing booking id." };
  }

  const cleanReason = sanitizeText(reason, { maxLength: 500 });
  if (!cleanReason) {
    return { success: false, error: "Please provide a reason for cancellation." };
  }

  let cancellationEmail: CancellationEmail | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // Serialize cancellation attempts for this booking before calculating
      // the capacity release below.
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          user: { select: { email: true, name: true } },
          trip: { select: { title: true } },
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
          cancellationReason: cleanReason,
        },
      });

      cancellationEmail = {
        to: booking.user.email,
        name: booking.user.name,
        tripTitle: booking.trip.title,
        date: booking.slot.date,
        cancelledByUser: true,
      };
    });
  } catch (error) {
    const message = safePaymentError(error, "Failed to cancel booking.", [
      "Booking not found.",
    ]);
    return { success: false, error: message };
  }

  await logActivity({
    userId,
    action: "BOOKING_CANCELLED",
    label: "Booking cancelled",
    metadata: { bookingId, reason: cleanReason },
  });

  if (cancellationEmail) {
    sendEmailAfter(bookingCancelledEmail(cancellationEmail));
  }

  revalidatePath("/profile");
  revalidatePath("/support");
  return { success: true };
}
