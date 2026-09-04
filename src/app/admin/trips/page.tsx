import Link from "next/link";

import { loadDb, prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { AdminTripsManager } from "@/components/admin/admin-trips-manager";
import { AdminGuideFilter } from "@/components/admin/admin-guide-filter";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { AdminDraftData } from "@/components/admin/admin-drafts-manager";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[] | undefined;
    guide?: string | string[] | undefined;
    page?: string | string[] | undefined;
  }>;
}) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");
  const { type, guide, page: pageParam } = await searchParams;
  const selectedType =
    ACTIVITY_TYPE_OPTIONS.find(
      (option) => typeof type === "string" && option.value === type,
    )?.value ?? "";
  const selectedGuideId = typeof guide === "string" ? guide : "";
  const page = Math.max(
    1,
    Number.parseInt(typeof pageParam === "string" ? pageParam : "1", 10) || 1,
  );

  const [guides, totalTrips, totalSlots, draftRows] = await Promise.all([
    loadDb(
      "admin.trips.guide-filter",
      () =>
        prisma.guide.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, photo: true, photos: true, videos: true },
        }),
    ),
    loadDb("admin.trips.trips-count", () => prisma.trip.count({ where: { deletedAt: null } })),
    loadDb("admin.trips.slots-count", () => prisma.slot.count({ where: { date: { gte: new Date() }, deletedAt: null, trip: { deletedAt: null } } })),
    loadDb(
      "admin.trips.drafts",
      () =>
        prisma.tripDraft.findMany({
          where: { deletedAt: null, guide: { deletedAt: null } },
          orderBy: { updatedAt: "desc" },
          include: { guide: { select: { name: true } } },
        }),
    ),
  ]);

  const hasSelectedGuide = guides.some((item) => item.id === selectedGuideId);
  const activeGuideId = hasSelectedGuide ? selectedGuideId : "";

  const drafts: AdminDraftData[] = draftRows.map((draft) => ({
    id: draft.id,
    guideName: draft.guide.name,
    title: draft.title,
    type: draft.type,
    location: draft.location,
    description: draft.description,
    priceInRupees: draft.priceInRupees,
    durationDays: draft.durationDays,
    maxGroupSize: draft.maxGroupSize,
    categories: draft.categories,
    images: draft.images,
    videos: draft.videos,
    mediaOrder: draft.mediaOrder,
    pickup: draft.pickup,
    drop: draft.drop,
    inclusions: draft.inclusions,
    exclusions: draft.exclusions,
    highlights: draft.highlights,
    updatedAt: formatDateTime(draft.updatedAt),
  }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Trips"
          description="Update the listed trip details"
          active="trips"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Trips live</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalTrips}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Guides linked</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{guides.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Upcoming slots</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalSlots}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <AdminGuideFilter
            guides={guides}
            selectedGuideId={activeGuideId}
            type={selectedType || undefined}
          />

          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="xs"
              className="rounded-full border-2 border-black dark:border-white"
              nativeButton={false}
              render={<Link href={activeGuideId ? `/admin/trips?guide=${activeGuideId}` : "/admin/trips"} />}
            >
              All
            </Button>
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedType === option.value ? "default" : "outline"}
                size="xs"
                className="rounded-full border-2 border-black dark:border-white"
                nativeButton={false}
                render={
                  <Link
                    href={`/admin/trips?${new URLSearchParams({
                      ...(activeGuideId ? { guide: activeGuideId } : {}),
                      type: option.value,
                    }).toString()}`}
                  />
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <AdminTripsManager
            guides={guides}
            drafts={drafts}
            selectedGuideId={activeGuideId || null}
            type={selectedType || undefined}
            page={page}
          />
        </section>
      </div>
    </div>
  );
}
