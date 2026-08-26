/**
 * Shared types and helpers for the guide trip-change workflow. Kept separate
 * from the server actions so the admin review page and the guide form can both
 * interpret the JSON snapshots without importing "use server" code.
 */

export type TripProposal = {
  slug: string;
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  TREK: "Hiking & Trekking",
  BIKE: "Cycling",
  SNOWBOARD: "Snowboarding",
  SKI: "Skiing",
  ROCKCLIMB: "Rock Climbing",
  EXPEDITION: "Summit Expedition",
  YOGA: "Yoga & Meditation",
};

export const TRIP_CATEGORY_LABELS: Record<string, string> = {
  ADVENTURE_ENTHUSIAST: "Adventure Enthusiast",
  WOMEN_ONLY: "Women Only",
  CORPORATE: "Corporate",
  LUXURY: "Luxury",
  FAMILY: "For Family",
  COURSE: "Courses",
  SELF_GUIDED: "Self Guided",
  BEGINNER_FRIENDLY: "Beginner Friendly",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  type: "Sport type",
  location: "Location",
  description: "Description",
  priceInRupees: "Price (₹)",
  durationDays: "Duration (days)",
  maxGroupSize: "Max group size",
  categories: "Categories",
  images: "Images",
  pickup: "Pickup point",
  drop: "Drop point",
  inclusions: "Included",
  exclusions: "Not included",
  highlights: "Highlights",
};

const FIELD_ORDER = [
  "title",
  "type",
  "location",
  "description",
  "priceInRupees",
  "durationDays",
  "maxGroupSize",
  "categories",
  "images",
  "pickup",
  "drop",
  "inclusions",
  "exclusions",
  "highlights",
] as const;

/** Turn a trip title into a URL-safe slug (mirrors the admin slug rules). */
export function slugifyTripTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "type") return ACTIVITY_TYPE_LABELS[String(value)] ?? String(value);
  if (key === "categories" && Array.isArray(value)) {
    return value.map((item) => TRIP_CATEGORY_LABELS[String(item)] ?? String(item)).join(", ");
  }
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

export type TripDiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
};

/**
 * Produce the ordered list of changed fields for display in the admin review
 * UI. For a CREATE there is no `original`, so every field is shown as new.
 */
export function buildTripDiff(
  proposed: TripProposal,
  original: TripProposal | null,
): TripDiffRow[] {
  return FIELD_ORDER.filter((key) => {
    if (!original) return true;
    return formatValue(key, proposed[key]) !== formatValue(key, original[key]);
  }).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    before: original ? formatValue(key, original[key]) : "—",
    after: formatValue(key, proposed[key]),
  }));
}
