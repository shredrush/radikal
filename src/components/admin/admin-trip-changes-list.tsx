"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripChangeDiff } from "@/components/admin/trip-change-diff";
import { getAdminTripChangeDetailsAction } from "@/lib/actions/trip-changes";
import { type AdminTripChangeSummary, type TripProposal } from "@/lib/trip-changes";
import { formatDateTime } from "@/lib/format";

type ChangeDetails = {
  type: "CREATE" | "UPDATE";
  proposed: TripProposal;
  original: TripProposal | null;
};

function statusBadge(status: AdminTripChangeSummary["status"]) {
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600">
        Pending
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return null;
  }
  return (
    <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      <XCircle className="h-3 w-3" /> Rejected
    </Badge>
  );
}

function changeTypeLabel(type: AdminTripChangeSummary["type"]) {
  if (type === "CREATE") return "New trip";
  if (type === "UPDATE") return "Trip edit";
  return "Deleted trip";
}

function changeTypeBadgeClass(type: AdminTripChangeSummary["type"]) {
  if (type === "CREATE") return "border-orange-500/40 bg-orange-500/10 text-orange-600";
  if (type === "UPDATE") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  return "border-destructive/40 bg-destructive/10 text-destructive";
}

/**
 * Admin change list. Cards are collapsed by default; the full before/after
 * diff is fetched from the server only when a card is expanded.
 */
export function AdminTripChangesList({ changes }: { changes: AdminTripChangeSummary[] }) {
  const [details, setDetails] = useState<Record<string, ChangeDetails>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function handleToggle(changeId: string) {
    const willExpand = !expandedIds[changeId];
    setExpandedIds((prev) => ({ ...prev, [changeId]: willExpand }));

    if (!willExpand || details[changeId]) return;

    startTransition(async () => {
      try {
        const change = await getAdminTripChangeDetailsAction(changeId);
        setDetails((prev) => ({ ...prev, [changeId]: change }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load change details.";
        toast.error(message);
        setExpandedIds((prev) => ({ ...prev, [changeId]: false }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {changes.map((change) => {
        const isDeleteEntry = change.type === "DELETE";
        const submittedBy = change.submittedByUsername
          ? `@${change.submittedByUsername}`
          : change.submittedByName;
        const expanded = Boolean(expandedIds[change.id]);

        return (
          <section
            key={change.id}
            id={`change-${change.id}`}
            className="scroll-mt-6 overflow-hidden rounded-[1.2rem] border border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]"
          >
            <div className="flex w-full items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{change.title ?? "Untitled trip"}</span>
                  <Badge variant="outline" className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${changeTypeBadgeClass(change.type)}`}>
                    {isDeleteEntry ? <Trash2 className="h-3 w-3" /> : null}
                    {changeTypeLabel(change.type)}
                  </Badge>
                  {statusBadge(change.status)}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {change.guideName ?? "Guide removed"}
                  {change.submittedByUsername ? ` · @${change.submittedByUsername}` : ""}
                  {isDeleteEntry
                    ? ` · Deleted${submittedBy ? ` by ${submittedBy}` : ""}`
                    : " · Submitted"}{" "}
                  {formatDateTime(change.createdAt)}
                </p>
              </div>
              {!isDeleteEntry ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-full"
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
              ) : null}
            </div>

            {expanded ? (
              <div className="border-t border-border/70 px-6 pb-6 pt-5">
                {details[change.id] ? (
                  <TripChangeDiff
                    type={details[change.id].type}
                    proposed={details[change.id].proposed}
                    original={details[change.id].original}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Loading changes…</p>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
