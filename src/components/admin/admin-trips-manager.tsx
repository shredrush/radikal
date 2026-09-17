import Link from "next/link";
import { Compass } from "lucide-react";
import type { TripType } from "@/generated/prisma/client";

import { loadDb, prisma } from "@/lib/prisma";
import { fetchTripsWithDetails } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { AddTripForm } from "@/components/admin/add-trip-form";
import { AdminDraftsManager, type AdminDraftData } from "@/components/admin/admin-drafts-manager";
import { AdminTripCard } from "@/components/admin/admin-trip-card";
import type { TripSportOption } from "@/components/trips/trip-sport-selector";
import { LazyDeletedTripsSection } from "@/components/admin/lazy-deleted-trips-section";

const PAGE_SIZE = 20;

export async function AdminTripsManager({
  guides,
  drafts,
  selectedGuideId,
  type,
  activePage,
  inactivePage,
  sports,
}: {
  guides: Array<{ id: string; name: string; photo: string | null; photos: string[]; videos: string[] }>;
  drafts: AdminDraftData[];
  selectedGuideId: string | null;
  type?: string;
  activePage: number;
  inactivePage: number;
  sports: TripSportOption[];
}) {
  const where = {
    ...(selectedGuideId ? { guideId: selectedGuideId } : {}),
    ...(type ? { type: type as TripType } : {}),
  };

  const [activeTrips, inactiveTrips, activeTripCount, inactiveTripCount] = await Promise.all([
    loadDb("admin.trips-manager.active-trips", () =>
      fetchTripsWithDetails({ ...where, active: true }, { skip: (activePage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ),
    loadDb("admin.trips-manager.inactive-trips", () =>
      fetchTripsWithDetails({ ...where, active: false }, { skip: (inactivePage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ),
    loadDb("admin.trips-manager.active-trips-count", () =>
      prisma.trip.count({ where: { deletedAt: null, active: true, ...where } }),
    ),
    loadDb("admin.trips-manager.inactive-trips-count", () =>
      prisma.trip.count({ where: { deletedAt: null, active: false, ...where } }),
    ),
  ]);

  const activePages = Math.max(1, Math.ceil(activeTripCount / PAGE_SIZE));
  const inactivePages = Math.max(1, Math.ceil(inactiveTripCount / PAGE_SIZE));

  const paginationHref = (section: "active" | "inactive", targetPage: number) =>
    `/admin/trips?${new URLSearchParams({
      ...(selectedGuideId ? { guide: selectedGuideId } : {}),
      ...(type ? { type } : {}),
      ...(section === "active"
        ? { activePage: String(targetPage), inactivePage: String(inactivePage) }
        : { activePage: String(activePage), inactivePage: String(targetPage) }),
    }).toString()}`;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              Trips
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a new trip or edit an existing one. Changes go live immediately.
            </p>
          </div>
          <AdminDraftsManager drafts={drafts} />
          <AddTripForm guides={guides} sports={sports} />
        </div>

        <TripSection
          title="Active trips"
          description="Live for travellers"
          trips={activeTrips}
          count={activeTripCount}
          page={activePage}
          totalPages={activePages}
          paginationHref={(targetPage) => paginationHref("active", targetPage)}
          guides={guides}
          sports={sports}
          emptyMessage={selectedGuideId ? "This guide has no active trips." : type ? "No active trips match this sport type." : "Add your first trip above — it goes live immediately."}
        />
        <TripSection
          title="Inactive trips"
          description="Hidden from travellers. You can still edit trips and manage their dates."
          trips={inactiveTrips}
          count={inactiveTripCount}
          page={inactivePage}
          totalPages={inactivePages}
          paginationHref={(targetPage) => paginationHref("inactive", targetPage)}
          guides={guides}
          sports={sports}
          emptyMessage={selectedGuideId ? "This guide has no inactive trips." : type ? "No inactive trips match this sport type." : "No inactive trips."}
        />
      </section>

      <LazyDeletedTripsSection guideId={selectedGuideId} type={type} />
    </div>
  );
}

function TripSection({
  title,
  description,
  trips,
  count,
  page,
  totalPages,
  paginationHref,
  guides,
  sports,
  emptyMessage,
}: {
  title: string;
  description: string;
  trips: Awaited<ReturnType<typeof fetchTripsWithDetails>>;
  count: number;
  page: number;
  totalPages: number;
  paginationHref: (page: number) => string;
  guides: Array<{ id: string; name: string; photo: string | null; photos: string[]; videos: string[] }>;
  sports: TripSportOption[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4 border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
      <div>
        <h4 className="font-heading text-base font-semibold text-foreground">
          {title} <span className="text-muted-foreground">({count})</span>
        </h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {trips.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
          <Compass className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {trips.map((trip) => (
            <AdminTripCard key={trip.id} trip={trip} guides={guides} sports={sports} />
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-4" aria-label={`${title} pages`}>
          {page > 1 ? (
            <Button size="sm" variant="outline" className="rounded-full" nativeButton={false} render={<Link href={paginationHref(page - 1)} />}>
              Previous
            </Button>
          ) : <span className="text-sm text-muted-foreground">Previous</span>}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Button size="sm" variant="outline" className="rounded-full" nativeButton={false} render={<Link href={paginationHref(page + 1)} />}>
              Next
            </Button>
          ) : <span className="text-sm text-muted-foreground">Next</span>}
        </nav>
      ) : null}
    </section>
  );
}
