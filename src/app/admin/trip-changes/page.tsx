import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { loadDb, prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTripChangesList } from "@/components/admin/admin-trip-changes-list";
import { AdminGuideFilter } from "@/components/admin/admin-guide-filter";
import { type AdminTripChangeSummary } from "@/lib/trip-changes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminTripChangesPage({
  searchParams,
}: {
  searchParams: Promise<{
    guide?: string | string[] | undefined;
    page?: string | string[] | undefined;
  }>;
}) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trip-changes");
  const { guide, page: pageParam } = await searchParams;
  const selectedGuideId = typeof guide === "string" ? guide : "";
  const page = Math.max(
    1,
    Number.parseInt(typeof pageParam === "string" ? pageParam : "1", 10) || 1,
  );

  const guides = await loadDb(
    "admin.trip-changes.guide-filter",
    () =>
      prisma.guide.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
  );
  const activeGuideId = guides.some((item) => item.id === selectedGuideId) ? selectedGuideId : "";
  const guideFilter = activeGuideId ? Prisma.sql`WHERE "guideId" = ${activeGuideId}` : Prisma.empty;
  const historyRows = Prisma.sql`
    WITH changes AS (
      SELECT
        tc.id,
        tc."type"::text AS "type",
        tc.status::text AS status,
        tc."createdAt",
        tc."reviewedAt",
        tc.proposed->>'title' AS title,
        tc."guideId",
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
        t."guideId",
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
    )
  `;

  const [changes, [counts]] = await Promise.all([
    loadDb("admin.trip-changes.list", () =>
      prisma.$queryRaw<AdminTripChangeSummary[]>(Prisma.sql`
        ${historyRows}
        SELECT id, "type", status, "createdAt", "reviewedAt", title, "guideName", "submittedByName", "submittedByUsername", "tripTitle", "reviewedByName"
        FROM changes
        ${guideFilter}
        ORDER BY "createdAt" DESC
        LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
      `),
    ),
    loadDb("admin.trip-changes.counts", () =>
      prisma.$queryRaw<Array<{ total: number; published: number; deleted: number; edits: number }>>(Prisma.sql`
        ${historyRows}
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS published,
          COUNT(*) FILTER (WHERE "type" = 'DELETE')::int AS deleted,
          COUNT(*) FILTER (WHERE "type" = 'UPDATE')::int AS edits
        FROM changes
        ${guideFilter}
      `),
    ),
  ]);
  const totalPages = Math.max(1, Math.ceil((counts?.total ?? 0) / PAGE_SIZE));
  const paginationHref = (targetPage: number) =>
    `/admin/trip-changes?${new URLSearchParams({
      ...(activeGuideId ? { guide: activeGuideId } : {}),
      page: String(targetPage),
    }).toString()}`;

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
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{counts?.published ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Edits</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{counts?.edits ?? 0}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Deleted</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{counts?.deleted ?? 0}</p>
            </div>
          </div>
        </section>

        <AdminGuideFilter
          guides={guides}
          selectedGuideId={activeGuideId}
          pathname="/admin/trip-changes"
        />

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

        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-4">
            {page > 1 ? (
              <Button size="sm" variant="outline" className="rounded-full" nativeButton={false} render={<Link href={paginationHref(page - 1)} />}>
                Previous
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Previous</span>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button size="sm" variant="outline" className="rounded-full" nativeButton={false} render={<Link href={paginationHref(page + 1)} />}>
                Next
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Next</span>
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
