"use client";

import { cancelBooking } from "@/lib/actions/payment";
import { CancelBookingFlow } from "@/components/booking/cancel-booking-flow";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <CancelBookingFlow
      bookingId={bookingId}
      action={cancelBooking}
      triggerLabel="Cancel booking"
      confirmLabel="Confirm cancel"
      successMessage="Booking cancelled."
      alignActions="start"
    />
  );
}
