import { CalendarDays } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTripChangesList } from "@/components/admin/admin-trip-changes-list";
import { type AdminTripChangeSummary } from "@/lib/trip-changes";

export const dynamic = "force-dynamic";

export default async function AdminTripChangesPage() {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");

  const changes = await prisma.$queryRaw<AdminTripChangeSummary[]>`
    SELECT
      tc.id,
      tc."type",
      tc.status,
      tc."createdAt",
      tc."reviewedAt",
      tc.proposed->>'title' AS title,
      g.name AS "guideName",
      u.username AS "submittedByUsername",
      t.title AS "tripTitle",
      r.name AS "reviewedByName"
    FROM "trip_change_requests" tc
    LEFT JOIN "guides" g ON g.id = tc."guideId"
    LEFT JOIN "users" u ON u.id = tc."submittedById"
    LEFT JOIN "users" r ON r.id = tc."reviewedById"
    LEFT JOIN "trips" t ON t.id = tc."tripId"
    ORDER BY tc."createdAt" DESC
  `;

  const pendingCount = changes.filter((change) => change.status === "PENDING").length;
  const approvedCount = changes.filter((change) => change.status === "APPROVED").length;
  const rejectedCount = changes.filter((change) => change.status === "REJECTED").length;

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
          <AdminTripChangesList changes={changes} />
        )}
      </div>
    </div>
  );
}
