"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteTripAction } from "@/lib/actions/admin";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";

export function DeleteTripButton({
  tripId,
  tripTitle,
}: {
  tripId: string;
  tripTitle: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleConfirmDelete() {
    startTransition(async () => {
      try {
        await deleteTripAction(tripId, reason.trim() || undefined);
        toast.success(`"${tripTitle}" has been deleted.`);
      } catch {
        toast.error("Failed to delete trip. Please try again.");
      }
    });
  }

  return (
    <>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
          disabled={isPending}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isPending ? "Deleting…" : "Delete trip"}
        </Button>
      ) : null}

      {open ? (
        <div className="flex w-full flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3">
          <p className="text-sm font-semibold text-destructive">
            Delete “{tripTitle}”?
          </p>
          <p className="text-xs text-muted-foreground">
            This removes it from public views and marks related slots, bookings, and wishlists as deleted. Reviews stay attached to the guide. You can restore it later.
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional: tell us why you're deleting this trip…"
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
              disabled={isPending}
              onClick={handleConfirmDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isPending ? "Deleting…" : "Delete trip"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-black text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
