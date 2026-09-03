"use client";

import { useState, useTransition } from "react";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";

import { cancelSlotBookingsAsGuide } from "@/lib/actions/payment";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";

/**
 * Red trigger button shown on the right end of a trip slot row. Clicking it
 * opens the reason bar (see GuideSlotCancelBar) so the guide can explain why
 * they are cancelling the bookings for that slot.
 */
export function GuideSlotCancelButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="button"
      size="xs"
      variant="destructive"
      className="rounded-full"
      onClick={onOpen}
    >
      <Ban className="h-3 w-3" />
      Cancel trip
    </Button>
  );
}

/**
 * Inline bar that collects the cancellation reason and submits it. Rendered
 * below the slot header while a slot is being cancelled.
 */
export function GuideSlotCancelBar({
  slotId,
  onClose,
  onCancelled,
}: {
  slotId: string;
  onClose: () => void;
  onCancelled: (slotId: string, reason: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function handleConfirm() {
    const cleanReason = reason.trim();
    if (!cleanReason) return;

    startTransition(async () => {
      try {
        const result = await cancelSlotBookingsAsGuide(slotId, cleanReason);

        if (result.success) {
          toast.success("Trip booking cancelled");
          onCancelled(slotId, cleanReason);
          onClose();
          setReason("");
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Could not cancel this trip. Please try again.");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Tell your travellers why you're cancelling this trip date…"
        rows={2}
        autoFocus
        className={`w-full resize-none rounded-xl border ${FORM_FIELD_BORDER} bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-destructive/40 focus:ring-2 focus:ring-destructive/20`}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="rounded-full"
          disabled={isPending || !reason.trim()}
          onClick={handleConfirm}
        >
          <Ban className="h-3.5 w-3.5" />
          {isPending ? "Cancelling…" : "Cancel trip"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-2 border-black text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>
    </div>
  );
}
