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
