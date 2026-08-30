"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { confirmBookingPayment } from "@/lib/actions/payment";
import { Button } from "@/components/ui/button";

export function ConfirmPaymentButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    const confirmed = window.confirm(
      "Confirm this payment and mark the booking as confirmed? This will reserve the traveller's spots."
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await confirmBookingPayment(bookingId);

        if (result.success) {
          toast.success("Booking confirmed.");
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not confirm the booking. Please try again.");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
      disabled={isPending}
      onClick={handleConfirm}
    >
      <Check className="h-3.5 w-3.5" />
      {isPending ? "Confirming…" : "Confirm payment"}
    </Button>
  );
}
