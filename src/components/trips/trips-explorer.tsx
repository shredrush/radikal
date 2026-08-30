"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { TripCard } from "@/components/trips/trip-card";
import { useEllipsisPlaceholder } from "@/hooks/use-ellipsis-placeholder";
import {
  SPORT_FILTERS,
  matchesSearchQuery,
  matchesSportFilter,
  matchesTravelStyleFilter,
  normalizeSportFilter,
  normalizeTravelStyleFilter,
} from "@/components/trips/sport-filters";
import { SportIcon } from "@/components/trips/sport-icon";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";

export type TripsExplorerTrip = {
  id: string;
  slug: string;
  title: string;
  type: string;
  categories: string[];
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  images?: string[];
  guide: { name: string } | null;
  slots: { date: string }[];
};

function normalizeLocationFilter(value: string[]) {
  return value.filter(Boolean);
}

function isDateWithinRange(slotDate: string, startDate: string | null, endDate: string | null) {
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

// The combined "Winter" group gets both sport icons flanking the heading:
// snowboard on the left, ski on the right.
function SportGroupHeading({ sport, label }: { sport: string; label: string }) {
  return (
    <>
      {sport === "winter" ? (
        <SportIcon sport="snowboard" className="size-8" />
      ) : (
        <SportIcon sport={sport} className="size-8" />
      )}
      {label}
      {sport === "winter" ? <SportIcon sport="ski" className="size-8" /> : null}
    </>
  );
}

export function TripsExplorer({
  trips,
  initialQuery,
}: {
  trips: TripsExplorerTrip[];
  initialQuery?: string | string[] | undefined;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => {
    const initialValue = Array.isArray(initialQuery) ? initialQuery[0] : initialQuery;
    return typeof initialValue === "string" ? initialValue.trim().slice(0, 200) : "";
  });

  const selectedSport = normalizeSportFilter(searchParams.getAll("sport"));
  const selectedTravelStyle = normalizeTravelStyleFilter(searchParams.getAll("travelStyle"));
  const selectedLocation = normalizeLocationFilter(searchParams.getAll("location"));
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const searchQuery = query.trim().slice(0, 200);

  const placeholder = useEllipsisPlaceholder(
    "Search trips, sports, or destinations",
    query.length === 0
  );

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const queryMatch = searchQuery ? matchesSearchQuery(trip, searchQuery) : true;

      const locationMatch =
        selectedLocation.length === 0 ||
        selectedLocation.some((locationValue) => trip.location.toLowerCase().includes(locationValue.toLowerCase()));

      const dateMatch =
        !startDate && !endDate
          ? true
          : trip.slots.some((slot) => isDateWithinRange(slot.date, startDate ?? null, endDate ?? null));

      return (
        queryMatch &&
        locationMatch &&
        dateMatch &&
        matchesSportFilter(trip, selectedSport) &&
        matchesTravelStyleFilter(trip, selectedTravelStyle)
      );
    });
  }, [trips, searchQuery, selectedSport, selectedTravelStyle, selectedLocation, startDate, endDate]);

  const hasActiveFilters =
    selectedSport.length > 0 ||
    selectedTravelStyle.length > 0 ||
    selectedLocation.length > 0 ||
    Boolean(searchQuery) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const groupedActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: filteredTrips.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  const otherActivities = hasActiveFilters
    ? trips.filter((trip) => !filteredTrips.some((item) => item.id === trip.id))
    : [];

  const groupedOtherActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: otherActivities.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center p-3 sm:p-4">
        <form
          onSubmit={(event) => event.preventDefault()}
          className={`relative flex w-full max-w-[44.88rem] items-center gap-2 rounded-full border ${FORM_FIELD_BORDER} bg-background/95 p-1 pl-3.5 shadow-[0_12px_35px_-30px_rgba(0,0,0,0.25)] transition focus-within:border-ring focus-within:shadow-[0_18px_40px_-25px_rgba(0,0,0,0.3)] sm:pl-4`}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label="Search trips, sports, or destinations"
            autoComplete="off"
            className="h-8 w-full min-w-0 border-0 bg-transparent px-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <button
            type="submit"
            className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-black px-3 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-white/90 sm:px-4"
          >
            <Search className="size-3" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      {filteredTrips.length === 0 ? (
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
                      <h2 className="flex items-center gap-2 font-heading text-xl font-semibold uppercase tracking-[0.1em] text-foreground">
                        <SportGroupHeading sport={group.id} label={group.label} />
                      </h2>
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
                          <h3 className="flex items-center gap-2 font-heading text-xl font-semibold uppercase tracking-[0.1em] text-foreground">
                            <SportGroupHeading sport={group.id} label={group.label} />
                          </h3>
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
    </div>
  );
}
