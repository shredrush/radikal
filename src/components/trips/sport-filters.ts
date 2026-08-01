import { DIFFICULTY_VALUES, getDifficultyLabel } from "@/lib/difficulty";

export type ActivityCardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  priceInRupees: number;
  durationDays: number;
  difficulty: string;
  categories: string[];
  type: string;
  guide: { name: string } | null;
};

export const SPORT_FILTERS = [
  { id: "all", label: "All" },
  { id: "ski", label: "Ski" },
  { id: "snowboard", label: "Snowboard" },
  { id: "bike", label: "Bike" },
  { id: "trek", label: "Hiking and Trekking" },
  { id: "climb", label: "Expedition" },
  { id: "rock-climbing", label: "Rock Climbing" },
  { id: "ice-climbing", label: "Ice Climbing" },
  { id: "yoga", label: "Yoga" },
  { id: "meditation", label: "Meditation" },
] as const;

export const DIFFICULTY_FILTERS = [
  { id: "all", label: "All" },
  ...DIFFICULTY_VALUES.map((value) => ({
    id: value.toLowerCase(),
    label: getDifficultyLabel(value),
  })),
] as const;

export const TRAVEL_STYLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "beginner-friendly", label: "Beginner Friendly" },
  { id: "women-only", label: "Women Only" },
  { id: "for-family", label: "For Family" },
  { id: "adventure-enthusiast", label: "Adventure Enthusiast" },
  { id: "courses", label: "Courses" },
  { id: "self-guided", label: "Self Guided" },
] as const;

export function normalizeSportFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedValues = values.filter(
    (item): item is string =>
      item === "ski" ||
      item === "snowboard" ||
      item === "bike" ||
      item === "trek" ||
      item === "climb" ||
      item === "rock-climbing" ||
      item === "ice-climbing" ||
      item === "yoga" ||
      item === "meditation",
  );

  return normalizedValues;
}

export function normalizeDifficultyFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedValues = values.filter(
    (item): item is string => item === "beginner" || item === "moderate" || item === "extreme",
  );

  return normalizedValues;
}

export function normalizeTravelStyleFilter(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalizedValues = values.filter(
    (item): item is string =>
      item === "beginner-friendly" ||
      item === "women-only" ||
      item === "for-family" ||
      item === "adventure-enthusiast" ||
      item === "courses" ||
      item === "self-guided",
  );

  return normalizedValues;
}

function getActivityText(activity: ActivityCardItem) {
  return [activity.title, activity.description, activity.slug, activity.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isRockClimbingActivity(activity: ActivityCardItem) {
  const haystack = getActivityText(activity);

  return haystack.includes("rock") && haystack.includes("climb");
}

export function isIceClimbingActivity(activity: ActivityCardItem) {
  const haystack = getActivityText(activity);

  return haystack.includes("ice") && haystack.includes("climb");
}

export function isYogaActivity(activity: ActivityCardItem) {
  const haystack = getActivityText(activity);

  return haystack.includes("yoga");
}

export function isMeditationActivity(activity: ActivityCardItem) {
  const haystack = getActivityText(activity);

  return haystack.includes("meditation") || haystack.includes("meditate");
}

export function isClimbActivity(activity: ActivityCardItem) {
  const haystack = getActivityText(activity);

  return (
    (haystack.includes("climb") || haystack.includes("summit")) &&
    !isRockClimbingActivity(activity) &&
    !isIceClimbingActivity(activity)
  );
}

export function matchesSportFilter(activity: ActivityCardItem, sports: string[]) {
  if (sports.length === 0) {
    return true;
  }

  return sports.some((sport) => {
    switch (sport) {
      case "ski":
        return activity.type === "SKI";
      case "snowboard":
        return activity.type === "SNOWBOARD";
      case "bike":
        return activity.type === "BIKE";
      case "trek":
        return (
          activity.type === "TREK" &&
          !isClimbActivity(activity) &&
          !isRockClimbingActivity(activity) &&
          !isIceClimbingActivity(activity) &&
          !isYogaActivity(activity) &&
          !isMeditationActivity(activity)
        );
      case "climb":
        return isClimbActivity(activity);
      case "rock-climbing":
        return isRockClimbingActivity(activity);
      case "ice-climbing":
        return isIceClimbingActivity(activity);
      case "yoga":
        return isYogaActivity(activity);
      case "meditation":
        return isMeditationActivity(activity);
      default:
        return false;
    }
  });
}

export function matchesDifficultyFilter(activity: ActivityCardItem, difficulties: string[]) {
  if (difficulties.length === 0) {
    return true;
  }

  return difficulties.some((difficulty) => {
    switch (difficulty) {
      case "beginner":
        return activity.difficulty.toUpperCase() === "BEGINNER";
      case "moderate":
        return activity.difficulty.toUpperCase() === "MODERATE";
      case "extreme":
        return activity.difficulty.toUpperCase() === "EXTREME";
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
      case "for-family":
        return activity.categories.includes("FOR_FAMILY");
      case "adventure-enthusiast":
        return activity.categories.includes("ADVENTURE_ENTHUSIAST");
      case "courses":
        return activity.categories.includes("COURSES");
      case "self-guided":
        return activity.categories.includes("SELF_GUIDED");
      default:
        return false;
    }
  });
}
