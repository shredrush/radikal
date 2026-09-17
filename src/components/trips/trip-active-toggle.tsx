"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTripActiveAction } from "@/lib/actions/trip-visibility";

export function TripActiveToggle({ tripId, active }: { tripId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      try {
        await setTripActiveAction(tripId, !active);
        toast.success(active ? "Trip hidden from travellers." : "Trip is live for travellers.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update trip visibility.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`shrink-0 rounded-full ${active ? "border-2 border-black bg-white text-black hover:bg-muted hover:text-black dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10 dark:hover:text-white" : "border-border bg-background"}`}
      disabled={isPending}
      onClick={toggleActive}
    >
      <Power className="h-3.5 w-3.5" />
      {active ? "Active" : "Inactive"}
    </Button>
  );
}
