import type { BookingCardData } from "@/components/profile/booking-card";
import { formatTripDateRange } from "@/lib/trip-dates";
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
 * A booking is displayed as completed only once its status has been persisted
 * as COMPLETED (lib/booking-completion.ts flips it before any booking list is
 * read). The DB is the single source of truth.
 */
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
    status: booking.status as BookingStatusValue,
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
