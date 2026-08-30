"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { restoreTripAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function RestoreTripButton({ tripId, tripTitle }: { tripId: string; tripTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreTripAction(tripId);
        toast.success(`"${tripTitle}" has been restored.`);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to restore trip.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full border-emerald-500/40 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-500/10 dark:text-emerald-300"
      disabled={isPending}
      onClick={handleRestore}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {isPending ? "Restoring…" : "Restore trip"}
    </Button>
  );
}
