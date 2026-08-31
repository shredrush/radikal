"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { approveGuideApplicationAction, rejectGuideApplicationAction } from "@/lib/actions/guide-applications";
import { Button } from "@/components/ui/button";

export function ApproveGuideButton({
  applicationId,
  applicantName,
}: {
  applicationId: string;
  applicantName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    const confirmed = window.confirm(
      `Approve "${applicantName}"? A new guide profile will be created and their account will be promoted to a guide.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await approveGuideApplicationAction(applicationId);
        toast.success(`"${applicantName}" has been approved.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to approve application.";
        toast.error(message);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
      disabled={isPending}
      onClick={handleApprove}
    >
      <Check className="h-3.5 w-3.5" />
      {isPending ? "Approving…" : "Approve"}
    </Button>
  );
}

export function RejectGuideButton({
  applicationId,
  applicantName,
}: {
  applicationId: string;
  applicantName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    const confirmed = window.confirm(
      `Reject "${applicantName}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await rejectGuideApplicationAction(applicationId);
        toast.success(`"${applicantName}" has been rejected.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reject application.";
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
