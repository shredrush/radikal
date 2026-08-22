export type ActivityCardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  categories: string[];
  type: string;
  guide: { name: string } | null;
};

export const SPORT_FILTERS = [
  { id: "all", label: "All" },
  { id: "bike", label: "Cycling" },
  { id: "rockclimb", label: "Rock Climbing" },
  { id: "winter", label: "Snowboard and Ski" },
  { id: "trek", label: "Hiking and Trekking" },
  { id: "yoga", label: "Yoga and Meditation" },
  { id: "expedition", label: "Summit Expedition" },
] as const;

export const TRAVEL_STYLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "beginner-friendly", label: "Beginner Friendly" },
  { id: "women-only", label: "Women Only" },
  { id: "family", label: "For Family" },
  { id: "adventure-enthusiast", label: "Adventure Enthusiast" },
  { id: "course", label: "Courses" },
  { id: "self-guided", label: "Self Guided" },
] as const;

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
  const normalizedValues = values.filter(
    (item): item is string =>
      item === "beginner-friendly" ||
      item === "women-only" ||
      item === "family" ||
      item === "adventure-enthusiast" ||
      item === "course" ||
      item === "self-guided",
  );

  return normalizedValues;
}

export function matchesSportFilter(activity: ActivityCardItem, sports: string[]) {
  if (sports.length === 0) {
    return true;
  }

  return sports.some((sport) => {
    switch (sport) {
      case "winter":
        return activity.type === "SKI" || activity.type === "SNOWBOARD";
      case "bike":
        return activity.type === "BIKE";
      case "trek":
        return activity.type === "TREK";
      case "expedition":
        return activity.type === "EXPEDITION";
      case "rockclimb":
        return activity.type === "ROCKCLIMB";
      case "yoga":
        return activity.type === "YOGA";
      default:
        return false;
    }
  });
}

export function matchesTravelStyleFilter(activity: ActivityCardItem, travelStyles: string[]) {
  if (travelStyles.length === 0) {
    return true;
  }

  return travelStyles.some((travelStyle) => {
    switch (travelStyle) {
      case "beginner-friendly":
        return activity.categories.includes("BEGINNER_FRIENDLY");
      case "women-only":
        return activity.categories.includes("WOMEN_ONLY");
      case "family":
        return activity.categories.includes("FAMILY");
      case "adventure-enthusiast":
        return activity.categories.includes("ADVENTURE_ENTHUSIAST");
      case "course":
        return activity.categories.includes("COURSE");
      case "self-guided":
        return activity.categories.includes("SELF_GUIDED");
      default:
        return false;
    }
  });
}

// Maps each activity `type` to human-readable keywords so a single free-text
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

const CATEGORY_KEYWORDS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "adventure enthusiast adventure",
  WOMEN_ONLY: "women only women",
  CORPORATE: "corporate",
  LUXURY: "luxury",
  FAMILY: "family for family",
  COURSE: "course courses",
  SELF_GUIDED: "self guided self-guided",
  BEGINNER_FRIENDLY: "beginner friendly beginner",
};

export type SearchableActivity = {
  title: string;
  description?: string | null;
  location: string;
  categories?: readonly string[];
  type?: string | null;
  guide?: { name: string } | null;
};

export function buildActivitySearchText(activity: SearchableActivity) {
  const categoryKeywords = (activity.categories ?? []).map(
    (category) => CATEGORY_KEYWORDS[category] ?? category.toLowerCase().replace(/_/g, " "),
  );

  const parts = [
    activity.title,
    activity.description ?? "",
    activity.location,
    activity.type ? (SPORT_TYPE_KEYWORDS[activity.type] ?? activity.type.toLowerCase()) : "",
    ...categoryKeywords,
    activity.guide?.name ?? "",
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchesSearchQuery(activity: SearchableActivity, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const searchText = buildActivitySearchText(activity);

  return terms.every((term) => searchText.includes(term));
}
