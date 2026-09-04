"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, History, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { getGuideActivityLogAction, type GuideActivityEntry } from "@/lib/actions/trip-changes";

function actionBadgeClass(action: string) {
  if (action.startsWith("SLOT")) {
    return "border-orange-500/40 bg-orange-500/10 text-orange-600";
  }
  if (action.startsWith("TRIP_CHANGE")) {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  }
  if (action.startsWith("GUIDE_PROFILE")) {
    return "border-violet-500/40 bg-violet-500/10 text-violet-600";
  }
  if (action === "TRIP_DELETED") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (action.startsWith("BOOKING")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  }
  return "border-border/70 bg-background/80 text-muted-foreground";
}

function formatAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

function formatEntryTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Collapsed activity log for the guide board. The entries are fetched from the
 * server only the first time the panel is expanded, so nothing loads until the
 * guide actually clicks it.
 */
export function GuideActivityLog() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<GuideActivityEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (entries === null) {
      startTransition(async () => {
        try {
          setEntries(await getGuideActivityLogAction());
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to load activity log.";
          toast.error(message);
        }
      });
    }
  }

  return (
    <section
      id="activity-log"
      className="scroll-mt-28 overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-wide text-foreground">
            Activity Log
          </span>
        </span>
        <span className="flex items-center gap-2">
          {isPending && entries === null ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/70 p-4">
          {isPending && entries === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading activity…
            </p>
          ) : !entries || entries.length === 0 ? (
            <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-border/70 pl-4">
              {entries.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        actionBadgeClass(entry.action),
                      )}
                    >
                      {formatAction(entry.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatEntryTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{entry.label}</p>
                  {entry.tripTitle || entry.slotDate ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {entry.tripTitle ? (
                        entry.tripSlug ? (
                          <Link
                            href={`/trips/${entry.tripSlug}`}
                            className="inline-flex min-w-0 items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{entry.tripTitle}</span>
                          </Link>
                        ) : (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{entry.tripTitle}</span>
                          </span>
                        )
                      ) : null}
                      {entry.slotDate ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {formatShortDate(entry.slotDate)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {entry.booked !== null || entry.reserved !== null || entry.capacity !== null ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {entry.booked !== null ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600"
                        >
                          {entry.booked} booked
                        </Badge>
                      ) : null}
                      {entry.reserved !== null ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600"
                        >
                          {entry.reserved} reserved
                        </Badge>
                      ) : null}
                      {entry.capacity !== null ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {entry.capacity} capacity
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}
