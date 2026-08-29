"use client";

import { ConfirmPaymentButton } from "@/components/admin/confirm-payment-button";
import { CancelBookingButton } from "@/components/admin/cancel-booking-button";

export function AdminBookingActions({
  bookingId,
  status,
  canConfirm,
  canCancel,
}: {
  bookingId: string;
  status: string;
  canConfirm: boolean;
  canCancel: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canConfirm && status === "PENDING" ? (
        <ConfirmPaymentButton bookingId={bookingId} />
      ) : null}
      {canCancel && (status === "PENDING" || status === "CONFIRMED") ? (
        <CancelBookingButton bookingId={bookingId} />
      ) : null}
    </div>
  );
}
