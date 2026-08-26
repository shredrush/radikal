"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  approveTripChangeAction,
  rejectTripChangeAction,
} from "@/lib/actions/trip-changes";
import { Button } from "@/components/ui/button";

export function ApproveTripChangeButton({ changeId }: { changeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    const confirmed = window.confirm(
      "Approve this change? It will be applied to the live site immediately.",
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await approveTripChangeAction(changeId);
        toast.success("Change approved and published.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to approve change.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
      disabled={isPending}
      onClick={handleApprove}
    >
      <Check className="h-3.5 w-3.5" />
      {isPending ? "Approving…" : "Approve"}
    </Button>
  );
}

export function RejectTripChangeButton({ changeId }: { changeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    const confirmed = window.confirm("Reject this change? The guide will be notified.");

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await rejectTripChangeAction(changeId);
        toast.success("Change rejected.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reject change.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={handleReject}
    >
      <X className="h-3.5 w-3.5" />
      {isPending ? "Rejecting…" : "Reject"}
    </Button>
  );
}
