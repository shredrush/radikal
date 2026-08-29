import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { AdminTripForm } from "@/components/admin/admin-trip-form";
import { AddTripForm } from "@/components/admin/add-trip-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminAccordion } from "@/components/admin/admin-accordion";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";

export const dynamic = "force-dynamic";

function getTripTypeLabel(value: string) {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

const PAGE_SIZE = 10;

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[] | undefined;
    page?: string | string[] | undefined;
  }>;
}) {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");
  const { type, page: pageParam } = await searchParams;
  const selectedType =
    ACTIVITY_TYPE_OPTIONS.find(
      (option) => typeof type === "string" && option.value === type,
    )?.value ?? "";
  const page = Math.max(
    1,
    Number.parseInt(typeof pageParam === "string" ? pageParam : "1", 10) || 1,
  );

  const where = selectedType ? { type: selectedType } : {};

  const [trips, guides, totalTrips, totalTripsAll, totalSlots] = await Promise.all([
    prisma.trip.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        guide: { select: { name: true } },
        slots: { orderBy: { date: "asc" } },
        tripLocation: true,
        inclusions: { orderBy: { order: "asc" } },
        highlights: { orderBy: { order: "asc" } },
      },
    }),
    prisma.guide.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.trip.count({ where }),
    prisma.trip.count(),
    prisma.slot.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalTrips / PAGE_SIZE));

  const paginationHref = (targetPage: number) =>
    `/admin/trips?${new URLSearchParams({
      ...(selectedType ? { type: selectedType } : {}),
      page: String(targetPage),
    }).toString()}`;

  const visibleActivities = trips;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Trips"
          description="Update the listed  trip details"
          active="trips"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Trips live</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalTripsAll}</p>
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

        <AddTripForm guides={guides} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <Button
              variant={selectedType === "" ? "default" : "outline"}
              size="xs"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/admin/trips" />}
            >
              All
            </Button>
            {ACTIVITY_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedType === option.value ? "default" : "outline"}
                size="xs"
                className="rounded-full"
                nativeButton={false}
                render={<Link href={`/admin/trips?type=${option.value}`} />}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {visibleActivities.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No trips match this sport type. Try another filter.
          </div>
        ) : (
        <AdminAccordion
          items={visibleActivities.map((trip) => ({
            key: trip.id,
            header: (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground">
                      {getTripTypeLabel(trip.type)}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {trip.location}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {formatDurationDays(trip.durationDays)}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{trip.title}</CardTitle>
                    <CardDescription className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {trip.guide ? `Guide: ${trip.guide.name}` : "No guide linked yet"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            ),
            children: (
              <AdminTripForm
                trip={trip}
                guides={guides}
                slots={trip.slots.map(toSlotItem)}
                supplemental={{
                  pickup: trip.tripLocation?.pickup ?? "",
                  drop: trip.tripLocation?.drop ?? "",
                  inclusions: trip.inclusions.filter(i => i.included).map(i => i.item),
                  exclusions: trip.inclusions.filter(i => !i.included).map(i => i.item),
                  highlights: trip.highlights.map(h => h.text),
                }}
              />
            ),
          }))}
        />
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-4">
            {page > 1 ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                nativeButton={false}
                render={<Link href={paginationHref(page - 1)} />}
              >
                Previous
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Previous</span>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                nativeButton={false}
                render={<Link href={paginationHref(page + 1)} />}
              >
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
