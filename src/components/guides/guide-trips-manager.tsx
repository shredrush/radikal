import { Clock3, Compass } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { GuideTripForm, type GuideTripData, type GuideDraftData } from "@/components/guides/guide-trip-form";
import { GuideDraftsManager } from "@/components/guides/guide-drafts-manager";
import { GuideTripSlotsToggle } from "@/components/guides/guide-trip-slots-toggle";
import { GuideReviewHistory } from "@/components/guides/guide-review-history";
import { toSlotItem } from "@/lib/slot-item";
import { formatDurationDays } from "@/lib/trip-dates";
import { type TripChangeSummary } from "@/lib/trip-changes";

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
    pickup: trip.tripLocation?.pickup ?? "",
    drop: trip.tripLocation?.drop ?? "",
    inclusions: trip.inclusions.filter((i) => i.included).map((i) => i.item),
    exclusions: trip.inclusions.filter((i) => !i.included).map((i) => i.item),
    highlights: trip.highlights.map((h) => h.text),
  };
}

export async function GuideTripsManager({ guideId }: { guideId: string }) {
  const [trips, changeSummaries, draftRows] = await Promise.all([
    prisma.trip.findMany({
      where: { guideId },
      orderBy: { createdAt: "asc" },
      include: {
        tripLocation: true,
        inclusions: { orderBy: { order: "asc" } },
        highlights: { orderBy: { order: "asc" } },
        slots: { orderBy: { date: "asc" } },
      },
    }),
    prisma.$queryRaw<TripChangeSummary[]>`
      SELECT id, "type", status, "createdAt", "reviewedAt", "proposed"->>'title' AS title
      FROM "trip_change_requests"
      WHERE "guideId" = ${guideId}
      ORDER BY "createdAt" DESC
    `,
    prisma.tripDraft.findMany({
      where: { guideId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const pending = changeSummaries.filter((change) => change.status === "PENDING");
  const reviewed = changeSummaries.filter((change) => change.status !== "PENDING");

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
              Add a new trip or edit an existing one. Changes go live after staff review.
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
                Add your first trip above — it will be reviewed by our team before going live.
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

      <section className="space-y-4">
        <h3 className="font-heading text-lg font-semibold tracking-wide text-foreground">
          Pending review
        </h3>

        {pending.length === 0 ? (
          <p className="rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
            No changes waiting for review.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((change) => (
              <li
                key={change.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-amber-500/30 bg-amber-500/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {change.title ?? "Untitled trip"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {change.type === "CREATE" ? "New trip" : "Trip edit"} awaiting approval
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600">
                  Pending
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GuideReviewHistory items={reviewed} />
    </div>
  );
}
