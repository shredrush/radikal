import { Compass, ExternalLink } from "lucide-react";
import Link from "next/link";

import { loadDb, prisma } from "@/lib/prisma";
import { fetchTripsWithDetails } from "@/lib/trips";
import { GuideTripFormTrigger } from "@/components/guides/guide-trip-form-trigger";
import type { GuideTripData, GuideDraftData } from "@/components/guides/guide-trip-form";
import { GuideDraftsManager } from "@/components/guides/guide-drafts-manager";
import { GuideTripSlotsToggle } from "@/components/guides/guide-trip-slots-toggle";
import { GuideActivityLog } from "@/components/guides/guide-activity-log";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";
import type { TripSportOption } from "@/components/trips/trip-sport-selector";
import { TripActiveToggle } from "@/components/trips/trip-active-toggle";

function toGuideTripData(trip: {
  id: string;
  active: boolean;
  title: string;
  type: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  itinerary: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  videos: string[];
  mediaOrder: string[];
  sportLinks: Array<{ sport: TripSportOption }>;
  tripLocation: { pickup: string; drop: string } | null;
  inclusions: Array<{ included: boolean; item: string }>;
  highlights: Array<{ text: string }>;
}): GuideTripData {
  return {
    id: trip.id,
    title: trip.title,
    type: trip.type,
    location: trip.location,
    latitude: trip.latitude,
    longitude: trip.longitude,
    description: trip.description,
    itinerary: trip.itinerary,
    priceInRupees: trip.priceInRupees,
    durationDays: trip.durationDays,
    maxGroupSize: trip.maxGroupSize,
    categories: trip.categories,
    images: trip.images,
    videos: trip.videos,
    mediaOrder: trip.mediaOrder,
    sportLinks: trip.sportLinks,
    pickup: trip.tripLocation?.pickup ?? "",
    drop: trip.tripLocation?.drop ?? "",
    inclusions: trip.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: trip.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: trip.highlights.map((h) => h.text),
  };
}

export async function GuideTripsManager({ guideId }: { guideId: string }) {
  const [trips, draftRows, sports] = await Promise.all([
    loadDb("guide.trips-manager.trips", () => fetchTripsWithDetails({ guideId })),
    loadDb(
      "guide.trips-manager.drafts",
      () =>
        prisma.tripDraft.findMany({
          where: { guideId, deletedAt: null },
          orderBy: { updatedAt: "desc" },
        }),
    ),
    loadDb("guide.trips-manager.sports", () => prisma.sport.findMany({ where: { active: true, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, icon: true } })),
  ]);
  const drafts: GuideDraftData[] = draftRows.map((draft) => ({
    draftId: draft.id,
    title: draft.title ?? "",
    type: draft.type,
    sportIds: draft.sportIds,
    location: draft.location ?? "",
    latitude: draft.latitude,
    longitude: draft.longitude,
    description: draft.description ?? "",
    itinerary: draft.itinerary ?? "",
    priceInRupees: draft.priceInRupees,
    durationDays: draft.durationDays,
    maxGroupSize: draft.maxGroupSize,
    categories: draft.categories,
    images: draft.images,
    videos: draft.videos,
    mediaOrder: draft.mediaOrder,
    pickup: draft.pickup ?? "",
    drop: draft.drop ?? "",
    inclusions: draft.inclusions,
    exclusions: draft.exclusions,
    highlights: draft.highlights,
  }));
  const activeTrips = trips.filter((trip) => trip.active);
  const inactiveTrips = trips.filter((trip) => !trip.active);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              Your trips
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a new trip or edit an existing one
            </p>
          </div>
          <GuideDraftsManager guideId={guideId} sports={sports} drafts={drafts} />
          <GuideTripFormTrigger guideId={guideId} sports={sports} />
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <Compass className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No trips yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first trip above — it will publish immediately.
              </p>
            </div>
          </div>
        ) : null}
        {trips.length > 0 ? (
          <>
            <TripSection
              title="Active trips"
              description="Live for travellers"
              trips={activeTrips}
              guideId={guideId}
              sports={sports}
            />
            <TripSection
              title="Inactive trips"
              description="Hidden from travellers. You can still edit trips and manage their dates."
              trips={inactiveTrips}
              guideId={guideId}
              sports={sports}
            />
          </>
        ) : null}
      </section>

      <GuideActivityLog />
    </div>
  );
}

function TripSection({
  title,
  description,
  trips,
  guideId,
  sports,
}: {
  title: string;
  description: string;
  trips: Awaited<ReturnType<typeof fetchTripsWithDetails>>;
  guideId: string;
  sports: TripSportOption[];
}) {
  return (
    <section className="space-y-3 border-t border-border/70 pt-5">
      <div>
        <h4 className="font-heading text-base font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()}.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {trips.map((trip) => {
          const data = toGuideTripData(trip);
          return (
            <li key={trip.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="break-words font-semibold text-foreground">{trip.title}</p>
                  {trip.active ? (
                    <Link
                      href={`/trips/${trip.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${trip.title}`}
                      title="Open trip"
                      className="inline-flex text-primary transition hover:text-primary/75"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
                <p className="break-words text-sm text-muted-foreground">{trip.location} · {formatDurationDays(trip.durationDays)}</p>
              </div>
              <div className="mt-3 flex flex-col items-end gap-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <TripActiveToggle tripId={trip.id} active={trip.active} />
                  <GuideTripFormTrigger guideId={guideId} sports={sports} trip={data} />
                </div>
                <GuideTripSlotsToggle tripId={trip.id} slots={trip.slots.map(toSlotItem)} />
              </div>
            </li>
          );
          })}
        </ul>
      )}
    </section>
  );
}
