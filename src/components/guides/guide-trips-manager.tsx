import { Compass } from "lucide-react";

import { prisma, safeDb } from "@/lib/prisma";
import { fetchTripsWithDetails } from "@/lib/trips";
import { GuideTripForm, type GuideTripData, type GuideDraftData } from "@/components/guides/guide-trip-form";
import { GuideDraftsManager } from "@/components/guides/guide-drafts-manager";
import { GuideTripSlotsToggle } from "@/components/guides/guide-trip-slots-toggle";
import { GuideActivityLog } from "@/components/guides/guide-activity-log";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";

function toGuideTripData(trip: {
  id: string;
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  videos: string[];
  mediaOrder: string[];
  tripLocation: { pickup: string; drop: string } | null;
  inclusions: Array<{ included: boolean; item: string }>;
  highlights: Array<{ text: string }>;
}): GuideTripData {
  return {
    id: trip.id,
    title: trip.title,
    type: trip.type,
    location: trip.location,
    description: trip.description,
    priceInRupees: trip.priceInRupees,
    durationDays: trip.durationDays,
    maxGroupSize: trip.maxGroupSize,
    categories: trip.categories,
    images: trip.images,
    videos: trip.videos,
    mediaOrder: trip.mediaOrder,
    pickup: trip.tripLocation?.pickup ?? "",
    drop: trip.tripLocation?.drop ?? "",
    inclusions: trip.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: trip.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: trip.highlights.map((h) => h.text),
  };
}

export async function GuideTripsManager({ guideId }: { guideId: string }) {
  const trips = await safeDb("guide.trips-manager.trips", () => fetchTripsWithDetails({ guideId }), []);
  const draftRows = await safeDb(
    "guide.trips-manager.drafts",
    () =>
      prisma.tripDraft.findMany({
        where: { guideId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      }),
    [],
  );

  const drafts: GuideDraftData[] = draftRows.map((draft) => ({
    draftId: draft.id,
    title: draft.title ?? "",
    type: draft.type,
    location: draft.location ?? "",
    description: draft.description ?? "",
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

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
              Your trips
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a new trip or edit an existing one. Changes publish immediately and are logged for staff visibility.
            </p>
          </div>
          <GuideDraftsManager guideId={guideId} drafts={drafts} />
          <GuideTripForm guideId={guideId} />
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
        ) : (
          <ul className="flex flex-col gap-4">
            {trips.map((trip) => {
              const data = toGuideTripData(trip);
              return (
                <li key={trip.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 p-4 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{trip.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {trip.location} · {formatDurationDays(trip.durationDays)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col items-end gap-3">
                    <GuideTripForm guideId={guideId} trip={data} />
                    <GuideTripSlotsToggle
                      tripId={trip.id}
                      slots={trip.slots.map(toSlotItem)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <GuideActivityLog />
    </div>
  );
}
