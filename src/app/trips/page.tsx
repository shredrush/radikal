import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Price } from "@/components/currency/price";
import { TripsFilterBar } from "@/components/trips/trips-filter-bar";
import {
  SPORT_FILTERS,
  matchesSearchQuery,
  matchesSportFilter,
  matchesTravelStyleFilter,
  normalizeSportFilter,
  normalizeTravelStyleFilter,
} from "@/components/trips/sport-filters";
import { getTripCardImage } from "@/lib/trip-card-image";
import { FaqSection } from "@/components/trips/faq-section";
import { SportIcon } from "@/components/trips/sport-icon";

// The filter UI (sport/travel style/location/date) is applied in memory below,
// so every filter combination reuses this single cached query instead of
// hitting Postgres on each click. `select` also trims the payload to only the
// fields this page actually renders/filters on (the previous `include` pulled
// every scalar column plus every slot row for every trip).
const getTripsPageTrips = unstable_cache(
  async () => {
    return prisma.trip.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        categories: true,
        location: true,
        description: true,
        priceInRupees: true,
        durationDays: true,
        images: true,
        guide: { select: { name: true } },
        slots: { select: { date: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },
  ["trips-page-trips"],
  // Admin create/update actions already call revalidatePath("/trips"), which
  // invalidates this cache on-demand; `revalidate` is just a safety net.
  { tags: ["trips"], revalidate: 300 },
);

const CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

function normalizeLocationFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.filter((item): item is string => Boolean(item));
}

function isDateWithinRange(slotDate: Date, startDate: string | null, endDate: string | null) {
  const normalizedSlotDate = new Date(slotDate);
  normalizedSlotDate.setHours(0, 0, 0, 0);

  if (startDate) {
    const normalizedStartDate = new Date(`${startDate}T00:00:00`);
    if (normalizedSlotDate < normalizedStartDate) {
      return false;
    }
  }

  if (endDate) {
    const normalizedEndDate = new Date(`${endDate}T00:00:00`);
    if (normalizedSlotDate > normalizedEndDate) {
      return false;
    }
  }

  return true;
}

const GROUP_SPAN_CLASSES: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
};

const GROUP_GRID_CLASSES: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

type TripCardTrip = Awaited<ReturnType<typeof getTripsPageTrips>>[number];

function TripCard({ trip }: { trip: TripCardTrip }) {
  return (
    <Link href={`/trips/${trip.slug}`} className="block">
      <Card className="flex h-full min-h-[320px] flex-col gap-0 overflow-hidden rounded-[1.1rem] border border-orange-100 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.25)] transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_30px_55px_-25px_rgba(16,185,129,0.3)] dark:border-orange-500/15 dark:hover:border-emerald-500/30 sm:min-h-[420px]">
        <div className="relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[220px]">
          <Image
            src={getTripCardImage(trip)}
            alt={trip.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{trip.title}</h3>
            <p className="truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5">{trip.location}</p>
          </div>
          <div className="mt-1 flex min-h-[1.35rem] flex-wrap content-start gap-1">
            {trip.categories.map((category) => (
              <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]">
                {CATEGORY_LABELS[category] ?? category}
              </Badge>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-1 border-t border-emerald-100 pt-2 dark:border-emerald-500/15">
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-sm">
              {trip.durationDays} {trip.durationDays === 1 ? "day" : "days"}
            </span>
            <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
              <Price
                className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base"
                amount={trip.priceInRupees}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | undefined;
    sport?: string | string[] | undefined;
    travelStyle?: string | string[] | undefined;
    location?: string | string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
}) {
  const { sport, travelStyle, location, startDate, endDate, q } = await searchParams;
  const searchQuery = typeof q === "string" ? q.trim().slice(0, 200) : "";
  const selectedSport = normalizeSportFilter(sport);
  const selectedTravelStyle = normalizeTravelStyleFilter(travelStyle);
  const selectedLocation = normalizeLocationFilter(location);

  const trips = await getTripsPageTrips();

  const filteredActivities = trips.filter((trip) => {
    const queryMatch = searchQuery ? matchesSearchQuery(trip, searchQuery) : true;

    const locationMatch =
      selectedLocation.length === 0 || selectedLocation.some((locationValue) => trip.location.toLowerCase().includes(locationValue.toLowerCase()));

    const dateMatch =
      !startDate && !endDate
        ? true
        : trip.slots.some((slot) => isDateWithinRange(slot.date, startDate ?? null, endDate ?? null));

    return queryMatch && locationMatch && dateMatch && matchesSportFilter(trip, selectedSport) && matchesTravelStyleFilter(trip, selectedTravelStyle);
  });

  const hasActiveFilters = selectedSport.length > 0 || selectedTravelStyle.length > 0 || selectedLocation.length > 0 || Boolean(searchQuery) || Boolean(startDate) || Boolean(endDate);

  const groupedActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: filteredActivities.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  const otherActivities = hasActiveFilters
    ? trips.filter((trip) => !filteredActivities.some((item) => item.id === trip.id))
    : [];

  const groupedOtherActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: otherActivities.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
            Small groups. Big adventures. Sustainable travel.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            We curate small group trips and education courses for adventure enthusiasts, led by certified experts
          </p>
        </div>

        <TripsFilterBar
          selectedSport={selectedSport}
          selectedTravelStyle={selectedTravelStyle}
        />

        {filteredActivities.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No trips match your search yet. Try another sport, destination, or keyword.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {groupedActivities.map((group) => {
                if (group.trips.length === 0) {
                  return null;
                }

                const columnCount = Math.min(group.trips.length, 4);

                return (
                  <section key={group.id} className={`col-span-2 ${GROUP_SPAN_CLASSES[columnCount]} space-y-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold uppercase tracking-[0.1em] text-foreground">
                          <SportIcon sport={group.id} className="size-5" />
                          {group.label}
                        </h2>
                        <p className="text-sm text-muted-foreground">{group.trips.length} trip{group.trips.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 ${GROUP_GRID_CLASSES[columnCount]}`}>
                      {group.trips.map((trip) => (
                        <TripCard key={trip.id} trip={trip} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-col gap-6 border-t border-border/70 pt-2">
                <div className="space-y-1">
                  <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-emerald-700 sm:text-2xl">
                    explore other adventures ...
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                  {groupedOtherActivities.map((group) => {
                    if (group.trips.length === 0) {
                      return null;
                    }

                    const columnCount = Math.min(group.trips.length, 4);

                    return (
                      <section key={`${group.id}-other`} className={`col-span-2 ${GROUP_SPAN_CLASSES[columnCount]} space-y-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="flex items-center gap-2 font-heading text-lg font-semibold uppercase tracking-[0.1em] text-foreground">
                              <SportIcon sport={group.id} className="size-5" />
                              {group.label}
                            </h3>
                            <p className="text-sm text-muted-foreground">{group.trips.length} trip{group.trips.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <div className={`grid grid-cols-2 gap-4 ${GROUP_GRID_CLASSES[columnCount]}`}>
                          {group.trips.map((trip) => (
                            <TripCard key={trip.id} trip={trip} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <FaqSection />
      </section>
    </div>
  );
}
