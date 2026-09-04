import { CalendarDays } from "lucide-react";

import { loadDb, prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTripChangesList } from "@/components/admin/admin-trip-changes-list";
import { type AdminTripChangeSummary } from "@/lib/trip-changes";

export const dynamic = "force-dynamic";

export default async function AdminTripChangesPage() {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");

  const changes = await loadDb(
    "admin.trip-changes.list",
    () =>
      prisma.$queryRaw<AdminTripChangeSummary[]>`
      SELECT
        tc.id,
        tc."type"::text AS "type",
        tc.status::text AS status,
        tc."createdAt",
        tc."reviewedAt",
        tc.proposed->>'title' AS title,
        g.name AS "guideName",
        u.name AS "submittedByName",
        u.username AS "submittedByUsername",
        t.title AS "tripTitle",
        r.name AS "reviewedByName"
      FROM "trip_change_requests" tc
      LEFT JOIN "guides" g ON g.id = tc."guideId"
      LEFT JOIN "users" u ON u.id = tc."submittedById"
      LEFT JOIN "users" r ON r.id = tc."reviewedById"
      LEFT JOIN "trips" t ON t.id = tc."tripId"
      UNION ALL
      SELECT
        al.id,
        'DELETE' AS "type",
        'APPROVED' AS status,
        al."createdAt",
        al."createdAt" AS "reviewedAt",
        COALESCE(t.title, al.metadata->>'title') AS title,
        g.name AS "guideName",
        u.name AS "submittedByName",
        u.username AS "submittedByUsername",
        t.title AS "tripTitle",
        NULL AS "reviewedByName"
      FROM "activity_logs" al
      LEFT JOIN "users" u ON u.id = al."userId"
      LEFT JOIN "trips" t ON t.id = al.metadata->>'tripId'
      LEFT JOIN "guides" g ON g.id = t."guideId"
      WHERE al.action = 'TRIP_DELETED'
      ORDER BY "createdAt" DESC
    `,
  );

  const publishedCount = changes.filter((change) => change.status === "APPROVED").length;
  const deletedCount = changes.filter((change) => change.type === "DELETE").length;
  const editCount = changes.filter((change) => change.type === "UPDATE").length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Trip Changes"
          description="Track trip additions and edits published by guides"
          active="trip-changes"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{publishedCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Edits</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{editCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Deleted</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{deletedCount}</p>
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
                  When guides publish new trips or edits, they will appear here.
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
