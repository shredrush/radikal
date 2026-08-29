"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCustomTripRequestAction } from "@/lib/actions/custom-trips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteCustomTripRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this custom trip request and its chat? This action cannot be undone.",
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteCustomTripRequestAction(requestId);
        toast.success("Custom trip request deleted.");
        router.push("/profile?tab=bookings");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete request.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Delete custom trip request"
      title="Delete custom trip request"
      className={cn("h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive")}
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
