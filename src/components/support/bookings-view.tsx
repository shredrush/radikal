"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

import { BookingCard } from "@/components/profile/booking-card";
import { Button } from "@/components/ui/button";
import { formatCancelledBy, type SupportBookingListItem } from "@/lib/support";

type BookingStatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";

const bookingFilterOptions: { value: BookingStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusCount(bookings: SupportBookingListItem[], value: BookingStatusFilter) {
  if (value === "ALL") return bookings.length;
  return bookings.filter((booking) => booking.status === value).length;
}

/**
 * Shared bookings view used by both the support dashboard and the admin
 * booking-management page. Keeping this as a single component means any
 * future design change is automatically reflected in both places.
 */
export function SupportBookingsView({ bookings }: { bookings: SupportBookingListItem[] }) {
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("ALL");

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;

  const filteredBookings =
    statusFilter === "ALL" ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <section className="min-w-0">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Total bookings</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
            {bookings.length}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Pending payment</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Confirmed</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
            {cancelledCount}
          </p>
        </div>
      </div>

      <div className="mb-4 mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            All bookings
          </h2>
          <p className="text-sm text-muted-foreground">
            Confirm payments and cancel reservations — including confirmed ones — from one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bookingFilterOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={statusFilter === option.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
              <span className="ml-1 text-[0.65rem] opacity-70">
                ({statusCount(bookings, option.value)})
              </span>
            </Button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <Ticket className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No bookings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reservations will appear here as soon as travellers book a trip.
            </p>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <Ticket className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No bookings match this filter</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try selecting a different status to see more reservations.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={{
                id: booking.id,
                tripSlug: booking.tripSlug,
                title: booking.title,
                location: booking.location,
                image: booking.image,
                dateRange: booking.dateRange,
                participantCount: booking.participantCount,
                totalPriceRupees: booking.totalPriceRupees,
                status: booking.status,
                paymentTransactionId: booking.paymentTransactionId,
                bookedAt: booking.bookedAt,
                customer: {
                  name: booking.customer.name,
                  username: booking.customer.username,
                  email: booking.customer.email,
                },
                cancelledByText:
                  booking.status === "CANCELLED"
                    ? formatCancelledBy(booking.cancelledByName, booking.cancelledByRole)
                    : undefined,
                cancellationReason:
                  booking.status === "CANCELLED"
                    ? booking.cancellationReason
                    : undefined,
                showAdminCancel: true,
                showAdminConfirm: true,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
