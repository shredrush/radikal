"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TripChangeDiff } from "@/components/admin/trip-change-diff";
import {
  ApproveTripChangeButton,
  RejectTripChangeButton,
} from "@/components/admin/review-trip-change-buttons";
import { PreviewTripChangeButton } from "@/components/admin/preview-trip-change-button";
import { getAdminTripChangeDetailsAction } from "@/lib/actions/trip-changes";
import { type AdminTripChangeSummary, type TripProposal } from "@/lib/trip-changes";
import { formatLongDate } from "@/lib/format";

type ChangeDetails = {
  type: "CREATE" | "UPDATE";
  proposed: TripProposal;
  original: TripProposal | null;
};

function statusBadge(status: AdminTripChangeSummary["status"]) {
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600">
        <Clock3 className="h-3 w-3" /> Pending
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-destructive">
      <XCircle className="h-3 w-3" /> Rejected
    </Badge>
  );
}

/**
 * Admin review list. Cards are collapsed by default; the full before/after
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
    <div className="flex flex-col gap-4">
      {changes.map((change) => {
        const isPendingStatus = change.status === "PENDING";
        const expanded = Boolean(expandedIds[change.id]);

        return (
          <Card
            key={change.id}
            id={`change-${change.id}`}
            size="sm"
            className="scroll-mt-6 overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]"
          >
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(change.status)}
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {change.type === "CREATE" ? "New trip" : "Trip edit"}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{change.title ?? "Untitled trip"}</CardTitle>
                    <CardDescription className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      {change.guideName ? `Guide: ${change.guideName}` : "Guide removed"}
                      {change.submittedByUsername ? ` · @${change.submittedByUsername}` : ""}
                      {change.type === "UPDATE" && change.tripTitle
                        ? ` · Editing “${change.tripTitle}”`
                        : ""}
                    </CardDescription>
                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                      Submitted {formatLongDate(change.createdAt)}
                      {!isPendingStatus && change.reviewedAt
                        ? ` · Reviewed ${formatLongDate(change.reviewedAt)}${change.reviewedByName ? ` by ${change.reviewedByName}` : ""}`
                        : ""}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isPendingStatus ? (
                    <>
                      <PreviewTripChangeButton changeId={change.id} />
                      <ApproveTripChangeButton changeId={change.id} />
                      <RejectTripChangeButton changeId={change.id} />
                    </>
                  ) : null}
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
            </CardHeader>

            {expanded ? (
              <CardContent className="pt-4">
                {details[change.id] ? (
                  <TripChangeDiff
                    type={details[change.id].type}
                    proposed={details[change.id].proposed}
                    original={details[change.id].original}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Loading changes…</p>
                )}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
