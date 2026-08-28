"use client";

import { useState, useTransition } from "react";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CancelResult = { success: boolean; error?: string };

type CancelAction = (bookingId: string, reason: string) => Promise<CancelResult>;

export function CancelBookingFlow({
  bookingId,
  action,
  triggerLabel,
  confirmLabel,
  successMessage,
  placeholder = "Add a note or reason for the cancellation…",
  alignActions = "end",
}: {
  bookingId: string;
  action: CancelAction;
  triggerLabel: string;
  confirmLabel: string;
  successMessage: string;
  placeholder?: string;
  alignActions?: "start" | "end";
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleConfirm() {
    const cleanReason = reason.trim();
    if (!cleanReason) return;

    startTransition(async () => {
      const result = await action(bookingId, cleanReason);

      if (result.success) {
        toast.success(successMessage);
        setOpen(false);
        setReason("");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-3.5 w-3.5" />
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus
        className="w-full resize-none rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/30"
      />
      <div
        className={`flex flex-wrap gap-2 ${alignActions === "start" ? "justify-start" : "justify-end"}`}
      >
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="rounded-full"
          disabled={isPending || !reason.trim()}
          onClick={handleConfirm}
        >
          <Ban className="h-3.5 w-3.5" />
          {isPending ? "Cancelling…" : confirmLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
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
  );
}
