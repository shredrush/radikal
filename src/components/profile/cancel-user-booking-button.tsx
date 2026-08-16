"use client";

import { cancelBookingAsUser } from "@/lib/actions/payment";
import { CancelBookingFlow } from "@/components/booking/cancel-booking-flow";

export function CancelUserBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <CancelBookingFlow
      bookingId={bookingId}
      action={cancelBookingAsUser}
      triggerLabel="Cancel booking"
      confirmLabel="Confirm cancel"
      successMessage="Booking cancelled."
    />
  );
}
