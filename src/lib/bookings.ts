import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { completePastBookings } from "@/lib/booking-completion";
import { formatTripDateRange } from "@/lib/trip-dates";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatMessageTime } from "@/lib/format";
import { formatCancelledBy } from "@/lib/support";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingBoardClient = {
  bookingId: string | null;
  status: BookingStatus;
  name: string;
  username: string | null;
  email: string | null;
  image: string | null;
  participantCount: number;
  totalPriceRupees: number;
  paymentTransactionId: string | null;
  bookedAt: string;
  cancelledAt: string | null;
  deletedByText: string | null;
  deletedAt: string | null;
};

export type BookingBoardItem = {
  bookingId: string | null;
  tripId: string;
  slug: string;
  title: string;
  location: string;
  image: string;
  durationDays: number;
  slotId: string;
  slotLabel: string;
  slotSort: number;
  status: BookingStatus;
  customer: {
    name: string;
    username: string | null;
    email: string | null;
    image: string | null;
  };
  participantCount: number;
  totalPriceRupees: number;
  paymentTransactionId: string | null;
  bookedAt: string;
  cancellationReason: string | null;
  cancelledByText: string | null;
  cancelledAt: string | null;
  deletedByText: string | null;
  deletedAt: string | null;
  /** Set on pseudo-items representing a cancelled slot with no bookings. */
  isCancelledSlot?: boolean;
  /** Reserved spots on the slot (used for cancelled reserved-only slots). */
  reserved?: number;
};

export const bookingDetailInclude = {
  user: { select: { id: true, name: true, username: true, email: true, image: true } },
  trip: {
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      durationDays: true,
      images: true,
      deletedAt: true,
    },
  },
  slot: { select: { id: true, date: true, deletedAt: true } },
  cancelledBy: { select: { name: true } },
  deletedBy: { select: { name: true } },
} satisfies Prisma.BookingInclude;

/**
 * Shared data source for the guide board and the admin booking view. Both
 * pages read from this single function so they always show the same bookings
 * in the same shape. Past CONFIRMED bookings are persisted as COMPLETED only
 * when `completePast` is set (admin/support read paths), so read-only views
 * never trigger a global write. Booking ids and payment details are only
 * included when the caller opts in — the guide board has no use for internal
 * booking ids, bank transfer references or prices.
 */
export async function fetchBookingsWithDetails(
  where: Prisma.BookingWhereInput = {},
  options: {
    completePast?: boolean;
    includeBookingIds?: boolean;
    includePaymentDetails?: boolean;
  } = {},
): Promise<BookingBoardItem[]> {
  const {
    completePast = false,
    includeBookingIds = false,
    includePaymentDetails = false,
  } = options;

  if (completePast) {
    await completePastBookings();
  }

  // Individual slot cancels scope to the caller's trip filter (e.g. the guide's
  // own trips). Reserved-only slots (no bookings) have no booking rows, so they
  // are surfaced here as cancelled entries so staff can see them on the board.
  const tripScope = (where.trip ?? {}) as Prisma.TripWhereInput;

  const [bookings, cancelledSlots] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: bookingDetailInclude,
    }),
    prisma.slot.findMany({
      where: {
        trip: tripScope,
        deletedAt: { not: null },
        deletedWithTrip: false,
        reserved: { gt: 0 },
        bookings: { none: {} },
      },
      orderBy: { date: "asc" },
      take: 200,
      include: {
        trip: {
          select: {
            id: true,
            slug: true,
            title: true,
            location: true,
            durationDays: true,
            images: true,
          },
        },
      },
    }),
  ]);

  const cancelledSlotItems: BookingBoardItem[] = cancelledSlots.map((slot) => ({
    bookingId: null,
    tripId: slot.trip.id,
    slug: slot.trip.slug,
    title: slot.trip.title,
    location: slot.trip.location,
    image: getTripCardImage(slot.trip),
    durationDays: slot.trip.durationDays,
    slotId: slot.id,
    slotLabel: formatTripDateRange(slot.date, slot.trip.durationDays),
    slotSort: new Date(slot.date).getTime(),
    status: "CANCELLED",
    customer: { name: "", username: null, email: null, image: null },
    participantCount: 0,
    totalPriceRupees: 0,
    paymentTransactionId: null,
    bookedAt: "",
    cancellationReason: null,
    cancelledByText: null,
    cancelledAt: slot.deletedAt ? formatMessageTime(slot.deletedAt) : null,
    deletedByText: null,
    deletedAt: null,
    reserved: slot.reserved,
    isCancelledSlot: true,
  }));

  return [
    ...bookings.map((booking) =>
      toBookingBoardItem(booking, { includeBookingIds, includePaymentDetails }),
    ),
    ...cancelledSlotItems,
  ];
}

function toBookingBoardItem(
  booking: {
    id: string;
    status: BookingStatus;
    totalPriceRupees: number;
    participantCount: number;
    paymentTransactionId: string | null;
    cancelledByRole: string | null;
    cancellationReason: string | null;
    deletedByRole: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    trip: {
      id: string;
      slug: string;
      title: string;
      location: string;
      durationDays: number;
      images: string[];
      deletedAt: Date | null;
    };
    slot: { id: string; date: Date; deletedAt: Date | null };
    user: { name: string | null; username: string | null; email: string; image: string | null };
    cancelledBy: { name: string | null } | null;
    deletedBy: { name: string | null } | null;
  },
  options: { includeBookingIds: boolean; includePaymentDetails: boolean },
): BookingBoardItem {
  return {
    bookingId: options.includeBookingIds ? booking.id : null,
    tripId: booking.trip.id,
    slug: booking.trip.slug,
    title: booking.trip.title,
    location: booking.trip.location,
    image: getTripCardImage(booking.trip),
    durationDays: booking.trip.durationDays,
    slotId: booking.slot.id,
    slotLabel: formatTripDateRange(booking.slot.date, booking.trip.durationDays),
    slotSort: new Date(booking.slot.date).getTime(),
    status: booking.status,
    customer: {
      name: booking.user.name || booking.user.email,
      username: booking.user.username,
      email: booking.user.email,
      image: booking.user.image,
    },
    participantCount: booking.participantCount,
    totalPriceRupees: options.includePaymentDetails ? booking.totalPriceRupees : 0,
    paymentTransactionId: options.includePaymentDetails
      ? booking.paymentTransactionId
      : null,
    bookedAt: formatMessageTime(booking.createdAt),
    cancelledAt:
      booking.status === "CANCELLED" && (booking.cancellationReason || booking.cancelledBy)
        ? formatMessageTime(booking.updatedAt)
        : null,
    deletedByText: booking.deletedBy
      ? formatCancelledBy(booking.deletedBy.name, booking.deletedByRole)
      : null,
    deletedAt: booking.deletedAt ? formatMessageTime(booking.deletedAt) : null,
    cancellationReason: booking.cancellationReason,
    cancelledByText: booking.cancelledBy
      ? formatCancelledBy(booking.cancelledBy.name, booking.cancelledByRole)
      : null,
  };
}
