"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { restoreGuideAction } from "@/lib/actions/guides";
import { Button } from "@/components/ui/button";

export function RestoreGuideButton({
  guideId,
  guideName,
}: {
  guideId: string;
  guideName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRestore() {
    if (
      !window.confirm(
        `Restore "${guideName}"? Their guide role and records retired with the guide will be restored. Removed profile media must be uploaded again.`,
      )
    )
      return;

    startTransition(async () => {
      try {
        await restoreGuideAction(guideId);
        toast.success(
          `"${guideName}" has been restored. Profile media must be uploaded again.`,
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to restore guide.",
        );
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
      {isPending ? "Restoring…" : "Restore guide"}
    </Button>
  );
}
