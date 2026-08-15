"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteGuideAction } from "@/lib/actions/guides";
import { Button } from "@/components/ui/button";

export function DeleteGuideButton({
  guideId,
  guideName,
}: {
  guideId: string;
  guideName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${guideName}"? Their trips will be unlinked (not deleted). This action cannot be undone.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteGuideAction(guideId);
        toast.success(`"${guideName}" has been deleted.`);
      } catch {
        toast.error("Failed to delete guide. Please try again.");
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
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isPending ? "Deleting…" : "Delete guide"}
    </Button>
  );
}
