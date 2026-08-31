"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GuideTripForm, type GuideDraftData } from "@/components/guides/guide-trip-form";
import type { GuideMediaItem } from "@/components/guides/guide-media-picker";
import { deleteTripDraftAction } from "@/lib/actions/trip-drafts";
import { cn } from "@/lib/utils";

export function GuideDraftsManager({
  guideId,
  guideMedia,
  drafts,
}: {
  guideId: string;
  guideMedia: GuideMediaItem[];
  drafts: GuideDraftData[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(draftId: string) {
    startTransition(async () => {
      try {
        await deleteTripDraftAction(draftId);
        toast.success("Draft deleted.");
        if (expandedId === draftId) {
          setExpandedId(null);
        }
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not delete draft.";
        toast.error(message);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10"
        onClick={() => setOpen((value) => !value)}
      >
        <FileText className="h-3.5 w-3.5" />
        Drafts ({drafts.length})
      </Button>

      {open ? (
        <div className="w-full basis-full order-last">
          {drafts.length === 0 ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              No drafts yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {drafts.map((draft) => {
                const expanded = expandedId === draft.draftId;
                return (
                  <li
                    key={draft.draftId}
                    className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95"
                  >
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : draft.draftId)}
                        aria-expanded={expanded}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                        <span className="truncate text-sm font-semibold text-foreground">
                          {draft.title || "Untitled draft"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(draft.draftId)}
                        disabled={isPending}
                        className="shrink-0 rounded-full p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                        aria-label="Delete draft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {expanded ? (
                      <div className="border-t border-border/70 p-4">
                        <GuideTripForm key={draft.draftId} guideId={guideId} guideMedia={guideMedia} draft={draft} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
