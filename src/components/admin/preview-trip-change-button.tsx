"use client";

import { useTransition } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";

import { createTripChangePreviewAction } from "@/lib/actions/trip-previews";
import { Button } from "@/components/ui/button";

export function PreviewTripChangeButton({ changeId }: { changeId: string }) {
  const [isPending, startTransition] = useTransition();

  function handlePreview() {
    startTransition(async () => {
      try {
        const { url } = await createTripChangePreviewAction(changeId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not generate preview.",
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
      disabled={isPending}
      onClick={handlePreview}
    >
      <Eye className="h-3.5 w-3.5" />
      {isPending ? "Preparing…" : "Preview"}
    </Button>
  );
}
