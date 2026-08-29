"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripChangeDiff } from "@/components/admin/trip-change-diff";
import { getTripChangeDetailsAction } from "@/lib/actions/trip-changes";
import { type TripChangeSummary, type TripProposal } from "@/lib/trip-changes";
import { formatShortDate } from "@/lib/format";

type ChangeDetails = {
  type: "CREATE" | "UPDATE";
  proposed: TripProposal;
  original: TripProposal | null;
};

/**
 * Guide-facing review history. Rows are collapsed by default; the full
 * before/after diff is fetched from the server only when a row is expanded.
 */
export function GuideReviewHistory({ items }: { items: TripChangeSummary[] }) {
  const [details, setDetails] = useState<Record<string, ChangeDetails>>({});
  const [isPending, startTransition] = useTransition();

  function handleToggle(changeId: string) {
    if (details[changeId]) {
      setDetails((prev) => {
        const next = { ...prev };
        delete next[changeId];
        return next;
      });
      return;
    }

    startTransition(async () => {
      try {
        const change = await getTripChangeDetailsAction(changeId);
        setDetails((prev) => ({ ...prev, [changeId]: change }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load change details.";
        toast.error(message);
      }
    });
  }

  return (
    <section id="review-history" className="scroll-mt-28 space-y-4">
      <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
        Review history
      </h3>

      {items.length === 0 ? (
        <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
          No reviewed changes yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((change) => {
            const approved = change.status === "APPROVED";
            const expanded = Boolean(details[change.id]);

            return (
              <li
                key={change.id}
                className="rounded-[1.25rem] border border-border/70 bg-background/95"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {approved ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {change.title ?? "Untitled trip"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {change.type === "CREATE" ? "New trip" : "Trip edit"} · Reviewed{" "}
                        {formatShortDate(change.reviewedAt ?? change.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        approved
                          ? "rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600"
                          : "rounded-full border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-destructive"
                      }
                    >
                      {approved ? "Approved" : "Rejected"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      aria-expanded={expanded}
                      disabled={isPending}
                      onClick={() => handleToggle(change.id)}
                    >
                      {expanded ? "Hide changes" : "View changes"}
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {expanded && details[change.id] ? (
                  <div className="border-t border-border/70 p-4">
                    <TripChangeDiff
                      type={details[change.id].type}
                      proposed={details[change.id].proposed}
                      original={details[change.id].original}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
