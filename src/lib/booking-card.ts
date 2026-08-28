import type { BookingCardData } from "@/components/profile/booking-card";
import { formatTripDateRange, isTripCompleted } from "@/lib/trip-dates";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatCancelledBy } from "@/lib/support";

export type BookingStatusValue = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingTripForCard = {
  slug: string;
  title: string;
  location: string;
  description: string;
  categories: string[];
  images?: string[];
  type?: string;
  durationDays: number;
};

export type BookingForCard = {
  id: string;
  status: string;
  slot: { date: Date };
  trip: BookingTripForCard;
  participantCount: number;
  totalPriceRupees: number;
  paymentTransactionId: string | null;
  createdAt: Date;
  cancellationReason?: string | null;
  cancelledByRole?: string | null;
  user?: { name: string | null; username: string | null; email: string };
  cancelledBy?: { name: string | null } | null;
};

/**
 * A booking is displayed as "completed" once its final day has passed (or it
 * was explicitly marked COMPLETED). Shared by the eager profile view and the
 * lazy-loaded booking sections so both render the same status.
 */
export function toBookingDisplayStatus(
  booking: { status: string; slot: { date: Date }; trip: { durationDays: number } },
  now = new Date(),
): BookingStatusValue {
  if (booking.status === "COMPLETED") return "COMPLETED";
  if (
    booking.status === "CONFIRMED" &&
    isTripCompleted(booking.slot.date, booking.trip.durationDays, now)
  ) {
    return "COMPLETED";
  }
  return booking.status as BookingStatusValue;
}

export function toBookingCardData(
  booking: BookingForCard,
  options: {
    showUserCancel?: boolean;
    showReview?: boolean;
    review?: { id: string; rating: number; comment: string } | null;
    showAdminCancel?: boolean;
    showAdminConfirm?: boolean;
  } = {},
): BookingCardData {
  return {
    id: booking.id,
    tripSlug: booking.trip.slug,
    title: booking.trip.title,
    location: booking.trip.location,
    image: getTripCardImage(booking.trip),
    dateRange: formatTripDateRange(booking.slot.date, booking.trip.durationDays),
    participantCount: booking.participantCount,
    totalPriceRupees: booking.totalPriceRupees,
    status: toBookingDisplayStatus(booking),
    paymentTransactionId: booking.paymentTransactionId,
    bookedAt: booking.createdAt.toISOString(),
    customer: booking.user
      ? {
          name: booking.user.name || booking.user.email,
          username: booking.user.username,
          email: booking.user.email,
        }
      : undefined,
    cancelledByText: booking.cancelledBy?.name
      ? formatCancelledBy(booking.cancelledBy.name, booking.cancelledByRole ?? null)
      : undefined,
    cancellationReason: booking.cancellationReason ?? undefined,
    showUserCancel: options.showUserCancel,
    showAdminCancel: options.showAdminCancel,
    showAdminConfirm: options.showAdminConfirm,
    showReview: options.showReview,
    review: options.review,
  };
}
