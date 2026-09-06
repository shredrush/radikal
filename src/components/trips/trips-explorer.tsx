"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { TripCard } from "@/components/trips/trip-card";
import { useEllipsisPlaceholder } from "@/hooks/use-ellipsis-placeholder";
import {
  SPORT_FILTERS,
  matchesSportFilter,
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
  priceInRupees: number;
  durationDays: number;
  images?: string[];
};

function normalizeLocationFilter(value: string[]) {
  return value.filter(Boolean);
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
  otherTrips,
  page,
  totalPages,
}: {
  trips: TripsExplorerTrip[];
  otherTrips: TripsExplorerTrip[];
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const [query, setQuery] = useState(urlQuery);

  const selectedSport = normalizeSportFilter(searchParams.getAll("sport"));
  const selectedTravelStyle = normalizeTravelStyleFilter(searchParams.getAll("travelStyle"));
  const selectedLocation = normalizeLocationFilter(searchParams.getAll("location"));
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const placeholder = useEllipsisPlaceholder(
    "Search trips, sports, or destinations",
    query.length === 0
  );

  const toggleSport = (sport: string) => {
    const nextSports = selectedSport.includes(sport)
      ? selectedSport.filter((selected) => selected !== sport)
      : selectedSport.length < 3
        ? [...selectedSport, sport]
        : selectedSport;

    if (nextSports === selectedSport) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("sport");
    nextSports.forEach((selected) => params.append("sport", selected));
    params.delete("page");
    router.replace(`/trips?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters =
    selectedSport.length > 0 ||
    selectedTravelStyle.length > 0 ||
    selectedLocation.length > 0 ||
    Boolean(urlQuery) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const groupedActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: trips.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  const groupedOtherActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all").map((sport) => ({
    ...sport,
    trips: otherTrips.filter((trip) => {
      const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
      return matchesSportFilter(trip, [normalizedSportId]);
    }),
  }));

  const updateSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = query.trim().slice(0, 200);
    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.replace(`/trips?${params.toString()}`, { scroll: false });
  };

  const navigateToPage = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    router.push(`/trips?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0">
        <div className="flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateSearch();
            }}
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

        <div className="mx-auto grid w-full max-w-[44.88rem] grid-cols-6 gap-1 px-3 pt-2 sm:gap-2 sm:px-4 sm:pt-3">
          {[
            { label: "Hiking and Trekking", filter: "trek", sport: "trek" },
            { label: "Cycling", filter: "bike", sport: "bike" },
            { label: "Rock Climbing", filter: "rockclimb", sport: "rockclimb" },
            { label: "Summit Expedition", filter: "expedition", sport: "expedition" },
            { label: "Skiing", filter: "winter", sport: "ski" },
            { label: "Snowboarding", filter: "winter", sport: "snowboard" },
          ].map((item) => {
            const isSelected = selectedSport.includes(item.filter);

            return (
              <button
                key={item.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSport(item.filter)}
                className="group flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 text-center transition hover:-translate-y-1 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-1 sm:px-2 sm:py-2"
              >
                <span className={`flex size-8 items-center justify-center rounded-full border border-border/70 bg-transparent text-foreground shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 sm:size-11 ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400"
                    : "group-hover:border-orange-500/60 group-hover:text-orange-700 group-hover:shadow-[0_18px_30px_-20px_rgba(194,65,12,0.7)] dark:group-hover:text-orange-300"
                }`}>
                  <SportIcon
                    sport={item.sport}
                    iconClassName={isSelected ? "text-black dark:text-emerald-950" : undefined}
                    className="size-4 sm:size-5"
                  />
                </span>
                <span className="font-heading text-[0.55rem] leading-tight font-semibold tracking-normal text-foreground sm:text-[0.7rem] sm:tracking-wide">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
          No trips match your search yet. Try another sport, destination, or keyword.
        </div>
      ) : null}

      {trips.length > 0 ? (
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
                      <TripCard imageOnly showImageSummary showTravelStyles key={trip.id} trip={trip} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-4" aria-label="Trip catalog pages">
          <button
            type="button"
            onClick={() => navigateToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => navigateToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-full border border-border/80 bg-background px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      ) : null}

      {hasActiveFilters && otherTrips.length > 0 ? (
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
                        <TripCard imageOnly key={trip.id} trip={trip} />
                      ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
