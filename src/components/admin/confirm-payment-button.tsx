"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { confirmBookingPayment } from "@/lib/actions/payment";
import { Button } from "@/components/ui/button";

export function ConfirmPaymentButton({
  bookingId,
  open: controlledOpen,
  onOpenChange,
}: {
  bookingId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await confirmBookingPayment(bookingId);

        if (result.success) {
          toast.success("Booking confirmed.");
          setOpen(false);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not confirm the booking. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        <Check className="h-3.5 w-3.5" />
        Confirm payment
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Confirm this payment and reserve the traveller&apos;s spots?
      </p>
      <div className="flex flex-wrap justify-start gap-2">
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={isPending}
          onClick={() => setOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>
    </div>
  );
}
