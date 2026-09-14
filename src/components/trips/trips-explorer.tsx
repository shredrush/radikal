"use client";

import dynamic from "next/dynamic";
import { type ElementType, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Map, Search, X } from "lucide-react";

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
import {
  INITIAL_TRAVEL_STYLE_FILTERS,
  MAX_TRAVEL_STYLE_FILTERS,
} from "@/lib/trip-filter-constants";
import { cn } from "@/lib/utils";

export type TripsExplorerTrip = {
  id: string;
  slug: string;
  title: string;
  type: string;
  categories?: string[];
  travelStyleLinks?: Array<{ travelStyle: { name: string; slug: string } }>;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  priceInRupees: number;
  durationDays: number;
  images?: string[];
  slots?: Array<{ date: Date | string }>;
};

export type TripsExplorerMapTrip = {
  id: string;
  slug: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priceInRupees: number;
  images: string[];
};

const TripsMap = dynamic(
  () => import("@/components/trips/trips-map").then((module) => module.TripsMap),
  { ssr: false, loading: () => <div className="h-[32rem] animate-pulse rounded-[1.5rem] border border-border/80 bg-muted/40" /> },
);

export type TripsExplorerTravelStyle = {
  id: string;
  name: string;
  slug: string;
};

function normalizeLocationFilter(value: string[]) {
  return value.filter(Boolean);
}

function getFilterOrder(selectedFilters: string[], filter: string) {
  const index = selectedFilters.indexOf(filter);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

// The combined "Winter" group gets both sport icons flanking the heading:
// snowboard on the left, ski on the right.
function SportGroupHeading({ sport, label }: { sport: string; label: string }) {
  return (
    <>
      {sport === "winter" ? (
        <SportIcon sport="snowboard" className="size-5 shrink-0 sm:size-6" />
      ) : (
        <SportIcon sport={sport} className="size-5 shrink-0 sm:size-6" />
      )}
      <span className="min-w-0 text-wrap">{label}</span>
      {sport === "winter" ? <SportIcon sport="ski" className="size-5 shrink-0 sm:size-6" /> : null}
    </>
  );
}

function SportTripGrid({
  groups,
  headingLevel,
}: {
  groups: Array<{ id: string; label: string; trips: TripsExplorerTrip[] }>;
  headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel as ElementType;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 pt-8 sm:gap-x-5 sm:gap-y-11 md:grid-cols-4">
      {groups.flatMap((group) =>
        group.trips.map((trip, index) => (
          <div key={trip.id} className="relative min-w-0">
            {index === 0 ? (
              <Heading className="absolute inset-x-0 -top-8 flex min-w-0 items-center gap-1.5 font-heading text-xs font-semibold uppercase leading-4 tracking-[0.06em] text-foreground sm:text-sm sm:leading-5">
                <SportGroupHeading sport={group.id} label={group.label} />
              </Heading>
            ) : null}
            <TripCard imageOnly showImageSummary showTravelStyles trip={trip} />
          </div>
        )),
      )}
    </div>
  );
}

export function TripsExplorer({
  trips,
  otherTrips,
  mapStyleUrl,
  travelStyles = [],
  page,
  totalPages,
}: {
  trips: TripsExplorerTrip[];
  otherTrips: TripsExplorerTrip[];
  mapStyleUrl: string | null;
  travelStyles?: TripsExplorerTravelStyle[];
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [showAllTravelStyles, setShowAllTravelStyles] = useState(false);
  const view = mapStyleUrl && searchParams.get("view") === "map" ? "map" : "list";
  const [, startFilterTransition] = useTransition();

  const selectedSportFromUrl = normalizeSportFilter(searchParams.getAll("sport"));
  const activeTravelStyleSlugs = new Set(travelStyles.map((style) => style.slug));
  const selectedTravelStyleFromUrl = normalizeTravelStyleFilter(searchParams.getAll("travelStyle"))
    .filter((slug) => activeTravelStyleSlugs.has(slug))
    .slice(0, MAX_TRAVEL_STYLE_FILTERS);
  const [selectedFilters, setOptimisticFilters] = useOptimistic(
    { sports: selectedSportFromUrl, travelStyles: selectedTravelStyleFromUrl },
    (_current, nextFilters: { sports: string[]; travelStyles: string[] }) => nextFilters,
  );
  const selectedSport = selectedFilters.sports;
  const selectedTravelStyle = selectedFilters.travelStyles;
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
        ? [sport, ...selectedSport]
        : selectedSport;

    if (nextSports === selectedSport) {
      return;
    }

    startFilterTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("sport");
      params.delete("travelStyle");
      const nextFilters = { sports: nextSports, travelStyles: selectedTravelStyle };
      setOptimisticFilters(nextFilters);
      nextFilters.sports.forEach((selected) => params.append("sport", selected));
      nextFilters.travelStyles.forEach((selected) => params.append("travelStyle", selected));
      params.delete("page");
      router.replace(`/trips?${params.toString()}`, { scroll: false });
    });
  };

  const toggleTravelStyle = (slug: string) => {
    if (!selectedTravelStyle.includes(slug) && selectedTravelStyle.length >= MAX_TRAVEL_STYLE_FILTERS) {
      return;
    }

    const nextStyles = selectedTravelStyle.includes(slug)
      ? selectedTravelStyle.filter((selected) => selected !== slug)
      : [slug, ...selectedTravelStyle];

    startFilterTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("travelStyle");
      params.delete("sport");
      const nextFilters = { sports: selectedSport, travelStyles: nextStyles };
      setOptimisticFilters(nextFilters);
      nextFilters.sports.forEach((selected) => params.append("sport", selected));
      nextFilters.travelStyles.forEach((selected) => params.append("travelStyle", selected));
      params.delete("page");
      router.replace(`/trips?${params.toString()}`, { scroll: false });
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["sport", "travelStyle", "location", "q", "startDate", "endDate", "page"].forEach((key) => params.delete(key));
    const nextQuery = params.toString();
    router.replace(nextQuery ? `/trips?${nextQuery}` : "/trips", { scroll: false });
  };

  const hasActiveFilters =
    selectedSport.length > 0 ||
    selectedTravelStyle.length > 0 ||
    selectedLocation.length > 0 ||
    Boolean(urlQuery) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const getTripTravelStyleOrder = (trip: TripsExplorerTrip) =>
    Math.min(
      ...(trip.travelStyleLinks?.map((link) => getFilterOrder(selectedTravelStyle, link.travelStyle.slug)) ?? [
        Number.MAX_SAFE_INTEGER,
      ]),
    );
  const getUpcomingSlotTime = (trip: TripsExplorerTrip) =>
    trip.slots
      ?.map((slot) => new Date(slot.date).getTime())
      .find((date) => date >= Date.now()) ?? Number.POSITIVE_INFINITY;
  const sortTripsByUpcomingSlot = (left: TripsExplorerTrip, right: TripsExplorerTrip) =>
    getUpcomingSlotTime(left) - getUpcomingSlotTime(right) ||
    getTripTravelStyleOrder(left) - getTripTravelStyleOrder(right);

  const groupedActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all")
    .map((sport) => ({
      ...sport,
      trips: trips.filter((trip) => {
        const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
        return matchesSportFilter(trip, [normalizedSportId]);
      }).sort(sortTripsByUpcomingSlot),
    }))
    .sort(
      (left, right) =>
        getFilterOrder(selectedSport, left.id) - getFilterOrder(selectedSport, right.id),
    );
  const groupedOtherActivities = SPORT_FILTERS.filter((sport) => sport.id !== "all")
    .map((sport) => ({
      ...sport,
      trips: otherTrips.filter((trip) => {
        const normalizedSportId = sport.id === "rockclimb" ? "rockclimb" : sport.id;
        return matchesSportFilter(trip, [normalizedSportId]);
      }).sort(sortTripsByUpcomingSlot),
    }))
    .sort(
      (left, right) =>
        getFilterOrder(selectedSport, left.id) - getFilterOrder(selectedSport, right.id),
    );

  const visibleTravelStyles = showAllTravelStyles
    ? travelStyles
    : travelStyles.filter(
        (style, index) => index < INITIAL_TRAVEL_STYLE_FILTERS || selectedTravelStyle.includes(style.slug),
      );
  const sportFilters = [
    { label: "Hiking and Trekking", filter: "trek", sport: "trek" },
    { label: "Cycling", filter: "bike", sport: "bike" },
    { label: "Rock Climbing", filter: "rockclimb", sport: "rockclimb" },
    { label: "Summit Expedition", filter: "expedition", sport: "expedition" },
    { label: "Skiing", filter: "winter", sport: "ski" },
    { label: "Snowboarding", filter: "winter", sport: "snowboard" },
  ];

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

  const setView = (nextView: "list" | "map") => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === "map") {
      params.set("view", "map");
    } else {
      params.delete("view");
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
        <div className="mx-auto flex w-full max-w-[44.88rem] items-center px-3 pt-3 sm:px-4 sm:pt-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateSearch();
            }}
            className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-full border ${FORM_FIELD_BORDER} bg-background/95 p-1 pl-3.5 shadow-[0_12px_35px_-30px_rgba(0,0,0,0.25)] transition focus-within:border-ring focus-within:shadow-[0_18px_40px_-25px_rgba(0,0,0,0.3)] sm:pl-4`}
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
          {sportFilters.map((item) => {
            const isSelected = selectedSport.includes(item.filter);

            return (
              <button
                key={item.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSport(item.filter)}
                className="group flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 text-center transition hover:-translate-y-1 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-1 sm:px-2 sm:py-2"
              >
                <span className={cn(
                  "flex size-8 items-center justify-center rounded-full border border-border/70 bg-transparent text-foreground shadow-[0_8px_26px_-18px_rgba(0,0,0,0.55)] transition duration-300 sm:size-11",
                  isSelected
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "group-hover:border-black group-hover:text-black group-hover:shadow-[0_18px_30px_-20px_rgba(0,0,0,0.7)] dark:group-hover:border-white dark:group-hover:text-white",
                )}>
                  <SportIcon
                    sport={item.sport}
                    iconClassName={isSelected ? "text-white dark:text-black" : undefined}
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

        {travelStyles.length > 0 ? (
          <div className="mx-auto flex w-full max-w-[44.88rem] flex-wrap items-center justify-center gap-1.5 px-3 pt-2 sm:gap-2 sm:px-4 sm:pt-3">
            {visibleTravelStyles.map((style) => {
              const isSelected = selectedTravelStyle.includes(style.slug);

              return (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTravelStyle(style.slug)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-border/70 bg-transparent text-foreground hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white"
                  }`}
                >
                  {style.name}
                </button>
              );
            })}
            {travelStyles.length > INITIAL_TRAVEL_STYLE_FILTERS ? (
              <button
                type="button"
                onClick={() => setShowAllTravelStyles((shown) => !shown)}
                className="rounded-full border border-border/70 bg-transparent px-3 py-1 text-xs font-medium text-foreground transition hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:border-white dark:hover:text-white"
              >
                {showAllTravelStyles ? "Show fewer" : `Show ${travelStyles.length - INITIAL_TRAVEL_STYLE_FILTERS} more`}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="hidden w-full justify-end px-3 pt-2 sm:flex sm:px-4 sm:pt-3">
          <div className="inline-flex shrink-0 rounded-full border border-border/70 bg-background/80 p-1 shadow-sm">
              <button
                type="button"
                aria-label="Show trip list"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex min-w-9 flex-col items-center justify-center rounded-full px-2 py-1 text-[0.55rem] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === "list" ? "bg-black text-white dark:bg-white dark:text-black" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
                <span className="mt-0.5">List</span>
              </button>
              {mapStyleUrl ? (
                <button
                  type="button"
                  aria-label={view === "map" ? "Hide trip map" : "Show trip map"}
                  aria-pressed={view === "map"}
                  onClick={() => setView(view === "map" ? "list" : "map")}
                  className={cn(
                    "inline-flex min-w-9 flex-col items-center justify-center rounded-full px-2 py-1 text-[0.55rem] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    view === "map" ? "bg-black text-white dark:bg-white dark:text-black" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Map className="size-3.5" />
                  <span className="mt-0.5">Map</span>
                </button>
              ) : null}
          </div>
        </div>

      </div>

      {view === "map" && mapStyleUrl ? <TripsMap search={searchParams.toString()} styleUrl={mapStyleUrl} /> : null}

      {trips.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
          No trips match your search yet. Try another sport, destination, or keyword.
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 font-semibold text-foreground underline underline-offset-4 transition hover:text-muted-foreground"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {trips.length > 0 ? (
        <SportTripGrid groups={groupedActivities} headingLevel="h2" />
      ) : null}

      {hasActiveFilters && otherTrips.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/70" />
            <p className="font-heading text-sm font-semibold tracking-[0.06em] text-muted-foreground">
            other adventures
            </p>
            <div className="h-px flex-1 bg-border/70" />
          </div>
          <SportTripGrid groups={groupedOtherActivities} headingLevel="h3" />
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
    </div>
  );
}
