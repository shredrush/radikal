"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { cancelBookingAsGuide } from "@/lib/actions/payment";
import { Button } from "@/components/ui/button";

export function CancelGuideBookingButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this trip? If it was confirmed, the reserved spots will be released."
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await cancelBookingAsGuide(bookingId);

      if (result.success) {
        toast.success("Trip cancelled.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      className="rounded-full"
      disabled={isPending}
      onClick={handleCancel}
    >
      <Ban className="h-3.5 w-3.5" />
      {isPending ? "Cancelling…" : "Cancel trip"}
    </Button>
  );
}
