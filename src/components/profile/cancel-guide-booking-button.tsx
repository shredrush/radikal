"use client";

import { cancelBookingAsGuide } from "@/lib/actions/payment";
import { CancelBookingFlow } from "@/components/booking/cancel-booking-flow";

export function CancelGuideBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <CancelBookingFlow
      bookingId={bookingId}
      action={cancelBookingAsGuide}
      triggerLabel="Cancel trip"
      confirmLabel="Confirm cancel"
      successMessage="Trip cancelled."
    />
  );
}
