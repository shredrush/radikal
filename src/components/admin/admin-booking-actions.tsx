"use client";

import { useState } from "react";

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
  const [openAction, setOpenAction] = useState<"confirm" | "cancel" | null>(null);

  return (
    <div className="flex items-center justify-end gap-2">
      {canConfirm && status === "PENDING" && openAction !== "cancel" ? (
        <ConfirmPaymentButton
          bookingId={bookingId}
          open={openAction === "confirm"}
          onOpenChange={(open) => setOpenAction(open ? "confirm" : null)}
        />
      ) : null}
      {canCancel && (status === "PENDING" || status === "CONFIRMED") && openAction !== "confirm" ? (
        <CancelBookingButton
          bookingId={bookingId}
          open={openAction === "cancel"}
          onOpenChange={(open) => setOpenAction(open ? "cancel" : null)}
        />
      ) : null}
    </div>
  );
}
