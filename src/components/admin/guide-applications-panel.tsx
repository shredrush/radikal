"use client";

import { useState, useTransition } from "react";
import { CalendarDays, ChevronDown, ClipboardCheck, Clock3, History, Inbox, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GuideApplicationDetails } from "@/components/admin/guide-application-details";
import {
  GuideApplicationHistory,
  type GuideApplicationHistoryItem,
} from "@/components/admin/guide-application-history";
import { ApproveGuideButton, RejectGuideButton } from "@/components/admin/review-guide-application-buttons";
import { getGuideApplicationsAction } from "@/lib/actions/guide-applications";
import { cn } from "@/lib/utils";

export function GuideApplicationsPanel({ pendingCount = 0 }: { pendingCount?: number }) {
  const [open, setOpen] = useState(false);
  const [applications, setApplications] = useState<GuideApplicationHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openApplicationId, setOpenApplicationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const pendingApplications = applications.filter((application) => application.status === "PENDING");
  const historyApplications = applications.filter(
    (application) => application.status === "APPROVED" || application.status === "REJECTED",
  );
  const approvedCount = historyApplications.filter((application) => application.status === "APPROVED").length;
  const rejectedCount = historyApplications.filter((application) => application.status === "REJECTED").length;

  function load() {
    startTransition(async () => {
      try {
        const data = await getGuideApplicationsAction();
        setApplications(data);
        setError(null);
        setLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load guide applications.");
      }
    });
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  }

  return (
    <>
      <Button
        className="rounded-full bg-green-100 text-green-800 hover:bg-green-200"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        Guide applications
        {pendingCount > 0 ? (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-700 px-1.5 text-[10px] font-bold text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section className="w-full space-y-8 rounded-[1.25rem] border border-border/70 bg-muted/20 p-4 sm:p-6">
          {error ? (
            <Card className="border-destructive/40 bg-background/95">
              <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : isPending && !loaded ? (
            <Card className="border-border/70 bg-background/95">
              <CardContent className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading applications…
              </CardContent>
            </Card>
          ) : loaded ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.2rem] border border-border/70 bg-background/95 p-4">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{pendingApplications.length}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/95 p-4">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{approvedCount}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/95 p-4">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{rejectedCount}</p>
                </div>
              </div>

              {applications.length === 0 ? (
                <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
                  <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
                    <CalendarDays className="size-10 text-muted-foreground" />
                    <div className="space-y-2">
                      <h2 className="font-heading text-2xl font-semibold tracking-wide">No applications yet</h2>
                      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                        When travellers apply to become guides, their submissions will appear here for review.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-10">
                  <section className="min-w-0">
                    <div className="mb-4 flex items-center gap-2">
                      <Inbox className="h-5 w-5 text-muted-foreground" />
                      <h2 className="font-heading text-xl font-semibold tracking-wide">Review queue</h2>
                      <span className="ml-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                        {pendingApplications.length} pending
                      </span>
                    </div>

                    {pendingApplications.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-border/70 bg-background/95 p-10 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
                        <Clock3 className="mx-auto size-8 text-muted-foreground" />
                        <p className="mt-3 text-sm text-muted-foreground">You&apos;re all caught up — no applications waiting for review.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {pendingApplications.map((application) => {
                          const openApplication = openApplicationId === application.id;
                          return (
                            <article
                              key={application.id}
                              className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95 shadow-sm"
                            >
                              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="truncate font-semibold text-foreground">{application.name}</p>
                                      <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                                        <Clock3 className="h-3 w-3" /> Pending
                                      </Badge>
                                    </div>
                                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                      {application.location} · {application.experienceYears} yrs experience
                                      {application.user.username ? ` · @${application.user.username}` : ""}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {application.user.email}{application.phone ? ` · ${application.phone}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <ApproveGuideButton applicationId={application.id} applicantName={application.name} onReviewed={load} />
                                  <RejectGuideButton applicationId={application.id} applicantName={application.name} onReviewed={load} />
                                  <button
                                    type="button"
                                    onClick={() => setOpenApplicationId(openApplication ? null : application.id)}
                                    aria-expanded={openApplication}
                                    aria-label={`${openApplication ? "Collapse" : "Expand"} ${application.name}'s application`}
                                    className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", openApplication && "rotate-180")} />
                                  </button>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "grid transition-all duration-200 ease-out",
                                  openApplication ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                                )}
                              >
                                <div className="overflow-hidden">
                                  <div className="border-t border-border/70 px-4 pb-5 pt-5">
                                    <GuideApplicationDetails application={application} />
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setHistoryOpen((current) => !current)}
                      aria-expanded={historyOpen}
                      aria-controls="guide-application-history"
                      className="mb-4 flex w-full items-center gap-2 text-left"
                    >
                      <History className="h-5 w-5 text-muted-foreground" />
                      <h2 className="font-heading text-xl font-semibold tracking-wide">History</h2>
                      <span className="ml-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        {historyApplications.length} reviewed
                      </span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-5 w-5 text-muted-foreground transition-transform duration-200",
                          historyOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {historyOpen ? (
                      <div id="guide-application-history">
                        <GuideApplicationHistory applications={historyApplications} />
                      </div>
                    ) : null}
                  </section>
                </div>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
