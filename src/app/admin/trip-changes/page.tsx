import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TripChangeDiff } from "@/components/admin/trip-change-diff";
import {
  ApproveTripChangeButton,
  RejectTripChangeButton,
} from "@/components/admin/review-trip-change-buttons";
import { type TripProposal } from "@/lib/trip-changes";
import { formatLongDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
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

export default async function AdminTripChangesPage() {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");

  const allChanges = await prisma.tripChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      guide: { select: { name: true, slug: true } },
      submittedBy: { select: { name: true, username: true, email: true } },
      reviewedBy: { select: { name: true } },
      trip: { select: { title: true, slug: true } },
    },
  });

  const changes = [
    ...allChanges.filter((change) => change.status === "PENDING"),
    ...allChanges.filter((change) => change.status !== "PENDING"),
  ];

  const pendingCount = allChanges.filter((change) => change.status === "PENDING").length;
  const approvedCount = allChanges.filter((change) => change.status === "APPROVED").length;
  const rejectedCount = allChanges.filter((change) => change.status === "REJECTED").length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Trip Changes"
          description="Review trip additions and edits submitted by guides before they go live"
          active="trip-changes"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{pendingCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{approvedCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{rejectedCount}</p>
            </div>
          </div>
        </section>

        {changes.length === 0 ? (
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">No trip changes yet</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  When guides submit new trips or edits, they will appear here for review.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {changes.map((change) => {
              const proposed = change.proposed as unknown as TripProposal;
              const original = change.original as unknown as TripProposal | null;
              const isPending = change.status === "PENDING";

              return (
                <Card key={change.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
                  <CardHeader className="border-b border-border/70 bg-muted/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(change.status)}
                          <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                            {change.type === "CREATE" ? "New trip" : "Trip edit"}
                          </Badge>
                        </div>
                        <div>
                          <CardTitle className="text-xl">{proposed.title}</CardTitle>
                          <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                            {change.guide ? `Guide: ${change.guide.name}` : "Guide removed"}
                            {change.submittedBy?.username ? ` · @${change.submittedBy.username}` : ""}
                            {change.type === "UPDATE" && change.trip
                              ? ` · Editing “${change.trip.title}”`
                              : ""}
                          </CardDescription>
                          <CardDescription className="mt-1 text-xs text-muted-foreground">
                            Submitted {formatLongDate(change.createdAt)}
                            {!isPending && change.reviewedAt
                              ? ` · Reviewed ${formatLongDate(change.reviewedAt)}${change.reviewedBy?.name ? ` by ${change.reviewedBy.name}` : ""}`
                              : ""}
                          </CardDescription>
                        </div>
                      </div>
                      {isPending ? (
                        <div className="flex flex-wrap gap-2">
                          <ApproveTripChangeButton changeId={change.id} />
                          <RejectTripChangeButton changeId={change.id} />
                        </div>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <TripChangeDiff type={change.type} proposed={proposed} original={original} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
