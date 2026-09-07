"use client";

import { useState, useTransition } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, History, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AdminTripChangesList } from "@/components/admin/admin-trip-changes-list";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { getAdminTripHistoryAction } from "@/lib/actions/trip-changes";
import { type AdminTripChangeSummary } from "@/lib/trip-changes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export function AdminTripHistoryPanel({
  guides,
}: {
  guides: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [guideId, setGuideId] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ changes: AdminTripChangeSummary[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const changes = result?.changes ?? [];

  function load(targetGuideId: string, targetPage: number) {
    startTransition(async () => {
      try {
        const data = await getAdminTripHistoryAction({
          guideId: targetGuideId || null,
          page: targetPage,
        });
        setResult(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load trip history.");
      }
    });
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) load(guideId, page);
  }

  function changeGuide(nextGuideId: string) {
    setGuideId(nextGuideId);
    setPage(1);
    load(nextGuideId, 1);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={toggleOpen}
          aria-expanded={open}
        >
          <History className="h-3.5 w-3.5" />
          History
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          />
        </Button>
      </div>

      {open ? (
        <section className="w-full space-y-8 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4 sm:p-6">
          <div className="space-y-1.5">
            <Label htmlFor="trip-history-guide-filter" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Filter by guide
            </Label>
            <select
              id="trip-history-guide-filter"
              value={guideId}
              onChange={(event) => changeGuide(event.target.value)}
              className={`h-10 min-w-56 rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
            >
              <option value="">All guides</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <Card className="border-destructive/40 bg-background/95">
              <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : isPending && !result ? (
            <Card className="border-border/70 bg-background/95">
              <CardContent className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history…
              </CardContent>
            </Card>
          ) : changes.length === 0 ? (
            <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
              <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
                <CalendarDays className="size-10 text-muted-foreground" />
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-semibold tracking-wide">No trip changes yet</h2>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    When guides publish new trips or edits, they will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AdminTripChangesList changes={changes} />
          )}

          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-4">
              {safePage > 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={isPending}
                  onClick={() => {
                    setPage(safePage - 1);
                    load(guideId, safePage - 1);
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Previous</span>
              )}
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              {safePage < totalPages ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={isPending}
                  onClick={() => {
                    setPage(safePage + 1);
                    load(guideId, safePage + 1);
                  }}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Next</span>
              )}
            </nav>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
