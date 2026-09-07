import { SPORT_META, type SportId } from "./sport-icon";

export type TripCardItem = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  categories?: string[];
  type: string;
  guide?: { name: string } | null;
};

// Granular winter variants ("ski" / "snowboard") only exist for display
// (dropdown, headings) — trip filtering stays on the combined "winter" id.
const DISPLAY_ONLY_SPORTS: readonly SportId[] = ["ski", "snowboard"];

export const SPORT_FILTERS: Array<{ id: "all" | SportId; label: string }> = [
  { id: "all", label: "All" },
  ...(Object.keys(SPORT_META) as SportId[])
    .filter((id) => !DISPLAY_ONLY_SPORTS.includes(id))
    .map((id) => ({
      id,
      label: SPORT_META[id].label,
    })),
];

export function normalizeSportFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedValues = values.filter(
    (item): item is string =>
      item === "winter" ||
      item === "bike" ||
      item === "trek" ||
      item === "expedition" ||
      item === "rockclimb" ||
      item === "yoga",
  );

  return normalizedValues;
}

export function normalizeTravelStyleFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      values
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)),
    ),
  );
}

export function matchesSportFilter(trip: TripCardItem, sports: string[]) {
  if (sports.length === 0) {
    return true;
  }

  return sports.some((sport) => {
    switch (sport) {
      case "winter":
        return trip.type === "SKI" || trip.type === "SNOWBOARD";
      case "bike":
        return trip.type === "BIKE";
      case "trek":
        return trip.type === "TREK";
      case "expedition":
        return trip.type === "EXPEDITION";
      case "rockclimb":
        return trip.type === "ROCKCLIMB";
      case "yoga":
        return trip.type === "YOGA";
      default:
        return false;
    }
  });
}

// Maps each trip `type` to human-readable keywords so a single free-text
// search can match sport names (e.g. "trekking", "cycling", "snowboard").
const SPORT_TYPE_KEYWORDS: Record<string, string> = {
  TREK: "trek trekking hiking hike hiking and trekking",
  BIKE: "cycling bike biking cycle mountain bike mtb",
  SKI: "ski skiing snow winter snowboard snowboarding",
  SNOWBOARD: "snowboard snowboarding snow winter ski skiing",
  ROCKCLIMB: "rock climbing climbing rockclimb bouldering",
  YOGA: "yoga meditation wellness",
  EXPEDITION: "expedition summit peak mountaineering summit expedition",
};

export type SearchableTrip = {
  title: string;
  description?: string | null;
  location: string;
  categories?: readonly string[];
  type?: string | null;
  guide?: { name: string } | null;
};

export function buildTripSearchText(trip: SearchableTrip) {
  const categoryKeywords = (trip.categories ?? []).map((category) => category.toLowerCase().replace(/_/g, " "));

  const parts = [
    trip.title,
    trip.description ?? "",
    trip.location,
    trip.type ? (SPORT_TYPE_KEYWORDS[trip.type] ?? trip.type.toLowerCase()) : "",
    ...categoryKeywords,
    trip.guide?.name ?? "",
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchesSearchQuery(trip: SearchableTrip, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const searchText = buildTripSearchText(trip);

  return terms.every((term) => searchText.includes(term));
}
