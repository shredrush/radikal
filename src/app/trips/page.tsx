import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TripsFilterBar } from "@/components/trips/trips-filter-bar";
import {
  SPORT_FILTERS,
  matchesSportFilter,
  matchesTravelStyleFilter,
  normalizeSportFilter,
  normalizeTravelStyleFilter,
} from "@/components/trips/sport-filters";
import { getTripCardImage, getTripCardImagePosition } from "@/lib/trip-card-image";

// The filter UI (sport/travel style/location/date) is applied in memory below,
// so every filter combination reuses this single cached query instead of
// hitting Postgres on each click. `select` also trims the payload to only the
// fields this page actually renders/filters on (the previous `include` pulled
// every scalar column plus every slot row for every activity).
const getTripsPageActivities = unstable_cache(
  async () => {
    return prisma.activity.findMany({
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
  ["trips-page-activities"],
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

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

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

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string | string[] | undefined;
    travelStyle?: string | string[] | undefined;
    location?: string | string[] | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
}) {
  const { sport, travelStyle, location, startDate, endDate } = await searchParams;
  const selectedSport = normalizeSportFilter(sport);
  const selectedTravelStyle = normalizeTravelStyleFilter(travelStyle);
  const selectedLocation = normalizeLocationFilter(location);

  const activities = await getTripsPageActivities();

  const filteredActivities = activities.filter((activity) => {
    const locationMatch =
      selectedLocation.length === 0 || selectedLocation.some((locationValue) => activity.location.toLowerCase().includes(locationValue.toLowerCase()));

    const dateMatch =
      !startDate && !endDate
        ? true
        : activity.slots.some((slot) => isDateWithinRange(slot.date, startDate ?? null, endDate ?? null));

    return locationMatch && dateMatch && matchesSportFilter(activity, selectedSport) && matchesTravelStyleFilter(activity, selectedTravelStyle);
  });

  const hasActiveFilters = selectedSport.length > 0 || selectedTravelStyle.length > 0 || selectedLocation.length > 0 || Boolean(startDate) || Boolean(endDate);

  const groupedActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    activities: filteredActivities.filter((activity) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(activity, [normalizedSportId]);
    }),
  }));

  const otherActivities = hasActiveFilters
    ? activities.filter((activity) => !filteredActivities.some((item) => item.id === activity.id))
    : [];

  const groupedOtherActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    activities: otherActivities.filter((activity) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(activity, [normalizedSportId]);
    }),
  }));

  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <TripsFilterBar
          selectedSport={selectedSport}
          selectedTravelStyle={selectedTravelStyle}
          filteredCount={filteredActivities.length}
          totalCount={activities.length}
        />

        {filteredActivities.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No trips match this sport yet. Try another filter.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              {groupedActivities.map((group) => {
                if (group.activities.length === 0) {
                  return null;
                }

                return (
                  <section key={group.id} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">{group.label}</h2>
                        <p className="text-sm text-muted-foreground">{group.activities.length} trip{group.activities.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {group.activities.map((activity) => (
                        <Link key={activity.id} href={`/trips/${activity.slug}`} className="block">
                          <Card className="flex h-full min-h-[320px] flex-col gap-0 overflow-hidden rounded-[1.1rem] border-0 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 sm:min-h-[420px]">
                            <div className="relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[220px]">
                              <Image
                                src={getTripCardImage(activity)}
                                alt={activity.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                            </div>
                            <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                              <div className="space-y-1.5">
                                <h3 className="text-base font-semibold tracking-tight text-foreground">{activity.title}</h3>
                                <p className="truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5">{activity.location}</p>
                              </div>
                              <div className="mt-1 flex min-h-[1.35rem] flex-wrap content-start gap-1">
                                {activity.categories.map((category) => (
                                  <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]">
                                    {CATEGORY_LABELS[category] ?? category}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-auto flex items-center justify-between gap-1 border-t border-border/70 pt-2">
                                <span className="shrink-0 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-foreground/80 sm:text-sm">
                                  {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                                </span>
                                <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
                                  <span className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base">
                                    {formatRupees(activity.priceInRupees)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-col gap-6 border-t border-border/70 pt-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-muted-foreground/85 sm:text-2xl">explore other adventures ...</h2>
                </div>
                <div className="flex flex-col gap-8">
                  {groupedOtherActivities.map((group) => {
                    if (group.activities.length === 0) {
                      return null;
                    }

                    return (
                      <section key={`${group.id}-other`} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold tracking-tight text-foreground">{group.label}</h3>
                            <p className="text-sm text-muted-foreground">{group.activities.length} trip{group.activities.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          {group.activities.map((activity) => (
                            <Link key={activity.id} href={`/trips/${activity.slug}`} className="block">
                              <Card className="flex h-full min-h-[320px] flex-col gap-0 overflow-hidden rounded-[1.1rem] border-0 bg-background/95 py-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-1 sm:min-h-[420px]">
                                <div className="relative -m-[1px] flex-[0_0_48%] min-h-[180px] overflow-hidden bg-muted/60 sm:flex-[0_0_52%] sm:min-h-[220px]">
                                  <Image
                                    src={getTripCardImage(activity)}
                                    alt={activity.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 12px), 25vw"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                                </div>
                                <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                                  <div className="space-y-1.5">
                                    <h3 className="text-base font-semibold tracking-tight text-foreground">{activity.title}</h3>
                                    <p className="truncate text-[0.7rem] leading-4 text-muted-foreground sm:text-sm sm:leading-5">{activity.location}</p>
                                  </div>
                                  <div className="mt-1 flex min-h-[1.35rem] flex-wrap content-start gap-1">
                                    {activity.categories.map((category) => (
                                      <Badge key={category} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[0.62rem] font-medium leading-3 text-foreground/80 sm:text-[0.72rem]">
                                        {CATEGORY_LABELS[category] ?? category}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="mt-auto flex items-center justify-between gap-1 border-t border-border/70 pt-2">
                                    <span className="shrink-0 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-foreground/80 sm:text-sm">
                                      {activity.durationDays} {activity.durationDays === 1 ? "day" : "days"}
                                    </span>
                                    <div className="ml-auto flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-0.5">
                                      <span className="shrink-0 font-heading text-sm font-semibold leading-none text-foreground sm:text-base">
                                        {formatRupees(activity.priceInRupees)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </Link>
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
      </section>
    </div>
  );
}
