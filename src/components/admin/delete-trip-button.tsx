"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTripAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function DeleteTripButton({
  tripId,
  tripTitle,
}: {
  tripId: string;
  tripTitle: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${tripTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteTripAction(tripId);
        toast.success(`"${tripTitle}" has been deleted.`);
      } catch {
        toast.error("Failed to delete trip. Please try again.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isPending ? "Deleting…" : "Delete trip"}
    </Button>
  );
}
